// <!-- Everything below this line is generated. DO NOT EDIT. -->

import moment = require('moment');
import semver = require('semver');
import { gocodeClose, Tool } from './goTools';

export const allToolsInformation: { [key: string]: Tool } = {
	'gocode': {
		name: 'gocode',
		importPath: 'github.com/mdempsky/gocode',
		modulePath: 'github.com/mdempsky/gocode',
		isImportant: true,
		replacedByGopls: true,
		description: 'Auto-completion, does not work with modules',
		close: gocodeClose
	},
	'gocode-gomod': {
		name: 'gocode-gomod',
		importPath: 'github.com/stamblerre/gocode',
		modulePath: 'github.com/stamblerre/gocode',
		isImportant: true,
		replacedByGopls: true,
		description: 'Auto-completion, works with modules',
		minimumGoVersion: semver.coerce('1.11')
	},
	'gopkgs': {
		name: 'gopkgs',
		importPath: 'github.com/uudashr/gopkgs/v2/cmd/gopkgs',
		modulePath: 'github.com/uudashr/gopkgs/v2',
		replacedByGopls: false, // TODO(github.com/golang/vscode-go/issues/258): disable Add Import command.
		isImportant: true,
		description: 'Auto-completion of unimported packages & Add Import feature'
	},
	'go-outline': {
		name: 'go-outline',
		importPath: 'github.com/ramya-rao-a/go-outline',
		modulePath: 'github.com/ramya-rao-a/go-outline',
		replacedByGopls: false, // TODO(github.com/golang/vscode-go/issues/1020): replace with Gopls.
		isImportant: true,
		description: 'Go to symbol in file' // GoDocumentSymbolProvider, used by 'run test' codelens
	},
	'go-symbols': {
		name: 'go-symbols',
		importPath: 'github.com/acroca/go-symbols',
		modulePath: 'github.com/acroca/go-symbols',
		replacedByGopls: true,
		isImportant: false,
		description: 'Go to symbol in workspace'
	},
	'guru': {
		name: 'guru',
		importPath: 'golang.org/x/tools/cmd/guru',
		modulePath: 'golang.org/x/tools',
		replacedByGopls: true,
		isImportant: false,
		description: 'Find all references and Go to implementation of symbols'
	},
	'gorename': {
		name: 'gorename',
		importPath: 'golang.org/x/tools/cmd/gorename',
		modulePath: 'golang.org/x/tools',
		replacedByGopls: true,
		isImportant: false,
		description: 'Rename symbols'
	},
	'gomodifytags': {
		name: 'gomodifytags',
		importPath: 'github.com/fatih/gomodifytags',
		modulePath: 'github.com/fatih/gomodifytags',
		replacedByGopls: false,
		isImportant: false,
		description: 'Modify tags on structs'
	},
	'goplay': {
		name: 'goplay',
		importPath: 'github.com/haya14busa/goplay/cmd/goplay',
		modulePath: 'github.com/haya14busa/goplay',
		replacedByGopls: false,
		isImportant: false,
		description: 'The Go playground'
	},
	'impl': {
		name: 'impl',
		importPath: 'github.com/josharian/impl',
		modulePath: 'github.com/josharian/impl',
		replacedByGopls: false,
		isImportant: false,
		description: 'Stubs for interfaces'
	},
	'gotype-live': {
		name: 'gotype-live',
		importPath: 'github.com/tylerb/gotype-live',
		modulePath: 'github.com/tylerb/gotype-live',
		replacedByGopls: true, // TODO(github.com/golang/vscode-go/issues/1021): recommend users to turn off.
		isImportant: false,
		description: 'Show errors as you type'
	},
	'godef': {
		name: 'godef',
		importPath: 'github.com/rogpeppe/godef',
		modulePath: 'github.com/rogpeppe/godef',
		replacedByGopls: true,
		isImportant: true,
		description: 'Go to definition'
	},
	'gogetdoc': {
		name: 'gogetdoc',
		importPath: 'github.com/zmb3/gogetdoc',
		modulePath: 'github.com/zmb3/gogetdoc',
		replacedByGopls: true,
		isImportant: true,
		description: 'Go to definition & text shown on hover'
	},
	'gofumports': {
		name: 'gofumports',
		importPath: 'mvdan.cc/gofumpt/gofumports',
		modulePath: 'mvdan.cc/gofumpt',
		replacedByGopls: true,
		isImportant: false,
		description: 'Formatter'
	},
	'gofumpt': {
		name: 'gofumpt',
		importPath: 'mvdan.cc/gofumpt',
		modulePath: 'mvdan.cc/gofumpt',
		replacedByGopls: true,
		isImportant: false,
		description: 'Formatter'
	},
	'goimports': {
		name: 'goimports',
		importPath: 'golang.org/x/tools/cmd/goimports',
		modulePath: 'golang.org/x/tools',
		replacedByGopls: true,
		isImportant: true,
		description: 'Formatter'
	},
	'goreturns': {
		name: 'goreturns',
		importPath: 'github.com/sqs/goreturns',
		modulePath: 'github.com/sqs/goreturns',
		replacedByGopls: true,
		isImportant: true,
		description: 'Formatter'
	},
	'goformat': {
		name: 'goformat',
		importPath: 'winterdrache.de/goformat/goformat',
		modulePath: 'winterdrache.de/goformat/goformat',
		replacedByGopls: true,
		isImportant: false,
		description: 'Formatter'
	},
	'gotests': {
		name: 'gotests',
		importPath: 'github.com/cweill/gotests/gotests',
		modulePath: 'github.com/cweill/gotests',
		replacedByGopls: false,
		isImportant: false,
		description: 'Generate unit tests',
		minimumGoVersion: semver.coerce('1.9')
	},
	// TODO(github.com/golang/vscode-go/issues/189): consider disabling lint when gopls is turned on.
	'golint': {
		name: 'golint',
		importPath: 'golang.org/x/lint/golint',
		modulePath: 'golang.org/x/lint',
		replacedByGopls: false,
		isImportant: false,
		description: 'Linter',
		minimumGoVersion: semver.coerce('1.9')
	},
	'staticcheck': {
		name: 'staticcheck',
		importPath: 'honnef.co/go/tools/cmd/staticcheck',
		modulePath: 'honnef.co/go/tools',
		replacedByGopls: false,
		isImportant: true,
		description: 'Linter'
	},
	'golangci-lint': {
		name: 'golangci-lint',
		importPath: 'github.com/golangci/golangci-lint/cmd/golangci-lint',
		modulePath: 'github.com/golangci/golangci-lint',
		replacedByGopls: false,
		isImportant: true,
		description: 'Linter'
	},
	'revive': {
		name: 'revive',
		importPath: 'github.com/mgechev/revive',
		modulePath: 'github.com/mgechev/revive',
		isImportant: true,
		description: 'Linter'
	},
	'gopls': {
		name: 'gopls',
		importPath: 'golang.org/x/tools/gopls',
		modulePath: 'golang.org/x/tools/gopls',
		replacedByGopls: false, // lol
		isImportant: true,
		description: 'Language Server from Google',
		usePrereleaseInPreviewMode: true,
		minimumGoVersion: semver.coerce('1.12'),
		latestVersion: semver.parse('v0.7.0'),
		latestVersionTimestamp: moment('2021-06-08', 'YYYY-MM-DD'),
		latestPrereleaseVersion: semver.parse('v0.7.0'),
		latestPrereleaseVersionTimestamp: moment('2021-06-08', 'YYYY-MM-DD')
	},
	'dlv': {
		name: 'dlv',
		importPath: 'github.com/go-delve/delve/cmd/dlv',
		modulePath: 'github.com/go-delve/delve',
		replacedByGopls: false,
		isImportant: true,
		description: 'Go debugger (Delve)'
	},
	'dlv-dap': {
		name: 'dlv-dap',
		importPath: 'github.com/go-delve/delve/cmd/dlv',
		modulePath: 'github.com/go-delve/delve',
		replacedByGopls: false,
		isImportant: false,
		description: 'Go debugger (Delve built for DAP experiment)',
		defaultVersion: 'master', // Always build from the master.
		minimumGoVersion: semver.coerce('1.14'), // last 3 versions per delve policy
		latestVersion: semver.parse('v1.6.2-0.20210611174649-688f94a4f838'),
		latestVersionTimestamp: moment('2021-06-11', 'YYYY-MM-DD')
	},
	'fillstruct': {
		name: 'fillstruct',
		importPath: 'github.com/davidrjenni/reftools/cmd/fillstruct',
		modulePath: 'github.com/davidrjenni/reftools',
		replacedByGopls: true,
		isImportant: false,
		description: 'Fill structs with defaults'
	},
	'godoctor': {
		name: 'godoctor',
		importPath: 'github.com/godoctor/godoctor',
		modulePath: 'github.com/godoctor/godoctor',
		replacedByGopls: true,
		isImportant: false,
		description: 'Extract to functions and variables'
	}
};
