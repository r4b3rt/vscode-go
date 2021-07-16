/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-prototype-builtins */
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

'use strict';

import path = require('path');
import vscode = require('vscode');
import { getGoConfig } from './config';
import { toolExecutionEnvironment } from './goEnv';
import {
	declinedToolInstall,
	installTools,
	promptForMissingTool,
	promptForUpdatingTool,
	shouldUpdateTool
} from './goInstallTools';
import { isInPreviewMode } from './goLanguageServer';
import { packagePathToGoModPathMap } from './goModules';
import { getTool, getToolAtVersion } from './goTools';
import { pickProcess, pickProcessByName } from './pickProcess';
import { getFromGlobalState, updateGlobalState } from './stateUtils';
import { getBinPath, getGoVersion, getWorkspaceFolderPath, resolvePath } from './util';
import { parseEnvFiles } from './utils/envUtils';
import { resolveHomeDir } from './utils/pathUtils';

let dlvDAPVersionCurrent = false;

export class GoDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
	constructor(private defaultDebugAdapterType: string = 'go') {}

	public async provideDebugConfigurations(
		folder: vscode.WorkspaceFolder | undefined,
		token?: vscode.CancellationToken
	): Promise<vscode.DebugConfiguration[] | undefined> {
		return await this.pickConfiguration();
	}

	public async pickConfiguration(): Promise<vscode.DebugConfiguration[]> {
		const debugConfigurations = [
			{
				label: 'Go: Launch Package',
				description: 'Debug/test the package of the open file',
				config: {
					name: 'Launch Package',
					type: this.defaultDebugAdapterType,
					request: 'launch',
					mode: 'auto',
					program: '${fileDirname}'
				}
			},
			{
				label: 'Go: Attach to local process',
				description: 'Attach to an existing process by process ID',
				config: {
					name: 'Attach to Process',
					type: 'go',
					request: 'attach',
					mode: 'local',
					processId: 0
				}
			},
			{
				label: 'Go: Connect to server',
				description: 'Connect to a remote headless debug server',
				config: {
					name: 'Connect to server',
					type: 'go',
					request: 'attach',
					mode: 'remote',
					remotePath: '${workspaceFolder}',
					port: 2345,
					host: '127.0.0.1'
				},
				fill: async (config: vscode.DebugConfiguration) => {
					const host = await vscode.window.showInputBox({
						prompt: 'Enter hostname',
						value: '127.0.0.1'
					});
					if (host) {
						config.host = host;
					}
					const port = Number(
						await vscode.window.showInputBox({
							prompt: 'Enter port',
							value: '2345',
							validateInput: (value: string) => {
								if (isNaN(Number(value))) {
									return 'Please enter a number.';
								}
								return '';
							}
						})
					);
					if (port) {
						config.port = port;
					}
				}
			}
		];

		const choice = await vscode.window.showQuickPick(debugConfigurations, {
			placeHolder: 'Choose debug configuration'
		});
		if (!choice) {
			return [];
		}

		if (choice.fill) {
			await choice.fill(choice.config);
		}
		return [choice.config];
	}

	public async resolveDebugConfiguration(
		folder: vscode.WorkspaceFolder | undefined,
		debugConfiguration: vscode.DebugConfiguration,
		token?: vscode.CancellationToken
	): Promise<vscode.DebugConfiguration> {
		const activeEditor = vscode.window.activeTextEditor;
		if (!debugConfiguration || !debugConfiguration.request) {
			// if 'request' is missing interpret this as a missing launch.json
			if (!activeEditor || activeEditor.document.languageId !== 'go') {
				return;
			}

			debugConfiguration = Object.assign(debugConfiguration || {}, {
				name: 'Launch',
				type: this.defaultDebugAdapterType,
				request: 'launch',
				mode: 'auto',
				program: path.dirname(activeEditor.document.fileName) // matches ${fileDirname}
			});
		}

		if (!debugConfiguration.type) {
			debugConfiguration['type'] = this.defaultDebugAdapterType;
		}

		debugConfiguration['packagePathToGoModPathMap'] = packagePathToGoModPathMap;

		const goConfig = getGoConfig(folder && folder.uri);
		const dlvConfig = goConfig['delveConfig'];

		// Figure out which debugAdapter is being used first, so we can use this to send warnings
		// for properties that don't apply.
		if (!debugConfiguration.hasOwnProperty('debugAdapter') && dlvConfig.hasOwnProperty('debugAdapter')) {
			const { globalValue, workspaceValue } = goConfig.inspect('delveConfig.debugAdapter');
			// user configured the default debug adapter through settings.json.
			if (globalValue !== undefined || workspaceValue !== undefined) {
				debugConfiguration['debugAdapter'] = dlvConfig['debugAdapter'];
			}
		}
		if (!debugConfiguration['debugAdapter']) {
			// for nightly/dev mode, default to dlv-dap.
			// TODO(hyangah): when we switch the stable version's default to 'dlv-dap', adjust this.
			debugConfiguration['debugAdapter'] =
				isInPreviewMode() && debugConfiguration['mode'] !== 'remote' ? 'dlv-dap' : 'legacy';
		}
		if (debugConfiguration['debugAdapter'] === 'dlv-dap' && debugConfiguration['mode'] === 'remote') {
			this.showWarning(
				'ignoreDlvDAPInRemoteModeWarning',
				"debugAdapter type of 'dlv-dap' with mode 'remote' is unsupported. Fall back to the 'legacy' debugAdapter for 'remote' mode."
			);
			debugConfiguration['debugAdapter'] = 'legacy';
		}

		const debugAdapter = debugConfiguration['debugAdapter'] === 'dlv-dap' ? 'dlv-dap' : 'dlv';

		let useApiV1 = false;
		if (debugConfiguration.hasOwnProperty('useApiV1')) {
			useApiV1 = debugConfiguration['useApiV1'] === true;
		} else if (dlvConfig.hasOwnProperty('useApiV1')) {
			useApiV1 = dlvConfig['useApiV1'] === true;
		}
		if (useApiV1) {
			debugConfiguration['apiVersion'] = 1;
		}
		if (!debugConfiguration.hasOwnProperty('apiVersion') && dlvConfig.hasOwnProperty('apiVersion')) {
			debugConfiguration['apiVersion'] = dlvConfig['apiVersion'];
		}
		if (
			debugAdapter === 'dlv-dap' &&
			(debugConfiguration.hasOwnProperty('dlvLoadConfig') ||
				goConfig.inspect('delveConfig.dlvLoadConfig').globalValue !== undefined ||
				goConfig.inspect('delveConfig.dlvLoadConfig').workspaceValue !== undefined)
		) {
			this.showWarning(
				'ignoreDebugDlvConfigWithDlvDapWarning',
				"User specified 'dlvLoadConfig' setting will be ignored by debug adapter 'dlv-dap'."
			);
		}
		if (!debugConfiguration.hasOwnProperty('dlvLoadConfig') && dlvConfig.hasOwnProperty('dlvLoadConfig')) {
			debugConfiguration['dlvLoadConfig'] = dlvConfig['dlvLoadConfig'];
		}
		if (
			!debugConfiguration.hasOwnProperty('showGlobalVariables') &&
			dlvConfig.hasOwnProperty('showGlobalVariables')
		) {
			debugConfiguration['showGlobalVariables'] = dlvConfig['showGlobalVariables'];
		}
		if (!debugConfiguration.hasOwnProperty('substitutePath') && dlvConfig.hasOwnProperty('substitutePath')) {
			debugConfiguration['substitutePath'] = dlvConfig['substitutePath'];
		}
		if (debugAdapter !== 'dlv-dap' && debugConfiguration.request === 'attach' && !debugConfiguration['cwd']) {
			debugConfiguration['cwd'] = '${workspaceFolder}';
			if (vscode.workspace.workspaceFolders?.length > 1) {
				debugConfiguration['cwd'] = '${fileWorkspaceFolder}';
			}
		}
		if (debugConfiguration['cwd']) {
			// expand 'cwd' folder path containing '~', which would cause dlv to fail
			debugConfiguration['cwd'] = resolveHomeDir(debugConfiguration['cwd']);
		}

		// Remove any '--gcflags' entries and show a warning
		if (debugConfiguration['buildFlags']) {
			const resp = this.removeGcflags(debugConfiguration['buildFlags']);
			if (resp.removed) {
				debugConfiguration['buildFlags'] = resp.args;
				this.showWarning(
					'ignoreDebugGCFlagsWarning',
					"User specified build flag '--gcflags' in 'buildFlags' is being ignored (see [debugging with build flags](https://github.com/golang/vscode-go/blob/master/docs/debugging.md#specifying-other-build-flags) documentation)"
				);
			}
		}
		if (debugConfiguration['env'] && debugConfiguration['env']['GOFLAGS']) {
			const resp = this.removeGcflags(debugConfiguration['env']['GOFLAGS']);
			if (resp.removed) {
				debugConfiguration['env']['GOFLAGS'] = resp.args;
				this.showWarning(
					'ignoreDebugGCFlagsWarning',
					"User specified build flag '--gcflags' in 'GOFLAGS' is being ignored (see [debugging with build flags](https://github.com/golang/vscode-go/blob/master/docs/debugging.md#specifying-other-build-flags) documentation)"
				);
			}
		}

		const dlvToolPath = getBinPath(debugAdapter);
		if (!path.isAbsolute(dlvToolPath)) {
			const tool = getTool(debugAdapter);

			// If user has not already declined to install this tool,
			// prompt for it. Otherwise continue and have the lack of
			// dlv binary be caught later.
			if (!declinedToolInstall(debugAdapter)) {
				await promptForMissingTool(debugAdapter);
				return;
			}
		}
		debugConfiguration['dlvToolPath'] = dlvToolPath;

		if (debugAdapter === 'dlv-dap' && !dlvDAPVersionCurrent) {
			const tool = getToolAtVersion('dlv-dap');
			if (await shouldUpdateTool(tool, dlvToolPath)) {
				// If the user has opted in to automatic tool updates, we can update
				// without prompting.
				const toolsManagementConfig = getGoConfig()['toolsManagement'];
				if (toolsManagementConfig && toolsManagementConfig['autoUpdate'] === true) {
					const goVersion = await getGoVersion();
					const toolVersion = { ...tool, version: tool.latestVersion }; // ToolWithVersion
					await installTools([toolVersion], goVersion, true);
				} else {
					// If we are prompting the user to update, we do not want to continue
					// with this debug session.
					promptForUpdatingTool(tool.name);
					return;
				}
			}
			dlvDAPVersionCurrent = true;
		}

		if (debugAdapter === 'dlv-dap' && debugConfiguration['cwd']) {
			// dlv dap expects 'wd' not 'cwd'
			debugConfiguration['wd'] = debugConfiguration['cwd'];
		}

		if (debugConfiguration['mode'] === 'auto') {
			let filename = activeEditor?.document?.fileName;
			if (debugConfiguration['program'] && debugConfiguration['program'].endsWith('.go')) {
				// If the 'program' attribute is a file, not a directory, then we will determine the mode from that
				// file path instead of the currently active file.
				filename = debugConfiguration['program'];
			}
			debugConfiguration['mode'] = filename?.endsWith('_test.go') ? 'test' : 'debug';
		}

		if (debugConfiguration['mode'] === 'test' && debugConfiguration['program'].endsWith('_test.go')) {
			// Running a test file in file mode does not make sense, so change the program
			// to the directory.
			debugConfiguration['program'] = path.dirname(debugConfiguration['program']);
		}

		if (debugConfiguration.request === 'launch' && debugConfiguration['mode'] === 'remote') {
			this.showWarning(
				'ignoreDebugLaunchRemoteWarning',
				"Request type of 'launch' with mode 'remote' is deprecated, please use request type 'attach' with mode 'remote' instead."
			);
		}

		if (
			debugAdapter !== 'dlv-dap' &&
			debugConfiguration.request === 'attach' &&
			debugConfiguration['mode'] === 'remote' &&
			debugConfiguration['program']
		) {
			this.showWarning(
				'ignoreUsingRemotePathAndProgramWarning',
				"Request type of 'attach' with mode 'remote' does not work with 'program' attribute, please use 'cwd' attribute instead."
			);
		}

		if (debugConfiguration.request === 'attach' && debugConfiguration['mode'] === 'local') {
			if (!debugConfiguration['processId'] || debugConfiguration['processId'] === 0) {
				// The processId is not valid, offer a quickpick menu of all processes.
				debugConfiguration['processId'] = parseInt(await pickProcess(), 10);
			} else if (
				typeof debugConfiguration['processId'] === 'string' &&
				debugConfiguration['processId'] !== '${command:pickProcess}' &&
				debugConfiguration['processId'] !== '${command:pickGoProcess}'
			) {
				debugConfiguration['processId'] = parseInt(
					await pickProcessByName(debugConfiguration['processId']),
					10
				);
			}
		}
		return debugConfiguration;
	}

	public removeGcflags(args: string): { args: string; removed: boolean } {
		// From `go help build`
		// ...
		// -gcflags '[pattern=]arg list'
		// 	 arguments to pass on each go tool compile invocation.
		//
		// The -asmflags, -gccgoflags, -gcflags, and -ldflags flags accept a
		// space-separated list of arguments to pass to an underlying tool
		// during the build. To embed spaces in an element in the list, surround
		// it with either single or double quotes. The argument list may be
		// preceded by a package pattern and an equal sign, which restricts
		// the use of that argument list to the building of packages matching
		// that pattern (see 'go help packages' for a description of package
		// patterns). Without a pattern, the argument list applies only to the
		// packages named on the command line. The flags may be repeated
		// with different patterns in order to specify different arguments for
		// different sets of packages. If a package matches patterns given in
		// multiple flags, the latest match on the command line wins.
		// For example, 'go build -gcflags=-S fmt' prints the disassembly
		// only for package fmt, while 'go build -gcflags=all=-S fmt'
		// prints the disassembly for fmt and all its dependencies.

		// Regexp Explanation:
		// 	1. (^|\s): the flag is preceded by a white space or is at the start of the line.
		//  2. -gcflags: the name of the flag.
		//  3. (=| ): the name of the flag is followed by = or a space.
		//  4. ('[^']*'|"[^"]*"|[^'"\s]+)+: the value of the flag is a combination of nonwhitespace
		//       characters and quoted strings which may contain white space.
		const gcflagsRegexp = /(^|\s)(-gcflags)(=| )('[^']*'|"[^"]*"|[^'"\s]+)+/;
		let removed = false;
		while (args.search(gcflagsRegexp) >= 0) {
			args = args.replace(gcflagsRegexp, '');
			removed = true;
		}
		return { args, removed };
	}

	public resolveDebugConfigurationWithSubstitutedVariables(
		folder: vscode.WorkspaceFolder | undefined,
		debugConfiguration: vscode.DebugConfiguration,
		token?: vscode.CancellationToken
	): vscode.DebugConfiguration {
		// Reads debugConfiguration.envFile and
		// combines the environment variables from all the env files and
		// debugConfiguration.env, on top of the tools execution environment variables.
		// It also unsets 'envFile' from the user-suppled debugConfiguration
		// because it is already applied.
		const goToolsEnvVars = toolExecutionEnvironment(folder?.uri); // also includes GOPATH: getCurrentGoPath().
		const fileEnvs = parseEnvFiles(debugConfiguration['envFile']);
		const env = debugConfiguration['env'] || {};

		debugConfiguration['env'] = Object.assign(goToolsEnvVars, fileEnvs, env);
		debugConfiguration['envFile'] = undefined; // unset, since we already processed.

		const entriesWithRelativePaths = ['cwd', 'output', 'program'].filter(
			(attr) => debugConfiguration[attr] && !path.isAbsolute(debugConfiguration[attr])
		);
		if (debugConfiguration['debugAdapter'] === 'dlv-dap' && entriesWithRelativePaths.length > 0) {
			const workspaceRoot = folder?.uri.fsPath;
			if (!workspaceRoot) {
				this.showWarning(
					'relativePathsWithoutWorkspaceFolder',
					'Relative paths without a workspace folder for `cwd`, `program`, or `output` are not allowed.'
				);
				return null;
			}
			entriesWithRelativePaths.forEach((attr) => {
				debugConfiguration[attr] = path.join(workspaceRoot, debugConfiguration[attr]);
			});
		}
		return debugConfiguration;
	}

	private showWarning(ignoreWarningKey: string, warningMessage: string) {
		const ignoreWarning = getFromGlobalState(ignoreWarningKey);
		if (ignoreWarning) {
			return;
		}

		const neverAgain = { title: "Don't Show Again" };
		vscode.window.showWarningMessage(warningMessage, neverAgain).then((result) => {
			if (result === neverAgain) {
				updateGlobalState(ignoreWarningKey, true);
			}
		});
	}
}
