/* eslint-disable @typescript-eslint/no-explicit-any */
/*---------------------------------------------------------
 * Copyright 2021 The Go Authors. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

'use strict';

import vscode = require('vscode');
import { getLocalGoplsVersion, lastUserAction, latestConfig } from './goLanguageServer';
import { outputChannel } from './goStatus';
import { extensionId } from './const';
import { getFromGlobalState, getFromWorkspaceState, updateGlobalState } from './stateUtils';

// SurveyConfig is the set of global properties used to determine if
// we should prompt a user to take the gopls survey.
export interface SurveyConfig {
	// prompt is true if the user can be prompted to take the survey.
	// It is false if the user has responded "Never" to the prompt.
	prompt?: boolean;

	// promptThisMonth is true if we have used a random number generator
	// to determine if the user should be prompted this month.
	// It is undefined if we have not yet made the determination.
	promptThisMonth?: boolean;

	// dateToPromptThisMonth is the date on which we should prompt the user
	// this month.
	dateToPromptThisMonth?: Date;

	// dateComputedPromptThisMonth is the date on which the values of
	// promptThisMonth and dateToPromptThisMonth were set.
	dateComputedPromptThisMonth?: Date;

	// lastDatePrompted is the most recent date that the user has been prompted.
	lastDatePrompted?: Date;

	// lastDateAccepted is the most recent date that the user responded "Yes"
	// to the survey prompt. The user need not have completed the survey.
	lastDateAccepted?: Date;
}

export function maybePromptForSurvey() {
	const now = new Date();
	let cfg = shouldPromptForSurvey(now, getSurveyConfig());
	if (!cfg) {
		return;
	}
	flushSurveyConfig(cfg);
	if (!cfg.dateToPromptThisMonth) {
		return;
	}
	const callback = async () => {
		const currentTime = new Date();

		// Make sure the user has been idle for at least a minute.
		if (minutesBetween(lastUserAction, currentTime) < 1) {
			setTimeout(callback, 5 * timeMinute);
			return;
		}
		cfg = await promptForSurvey(cfg, now);
		if (cfg) {
			flushSurveyConfig(cfg);
		}
	};
	const ms = msBetween(now, cfg.dateToPromptThisMonth);
	setTimeout(callback, ms);
}

export function shouldPromptForSurvey(now: Date, cfg: SurveyConfig): SurveyConfig {
	// If the prompt value is not set, assume we haven't prompted the user
	// and should do so.
	if (cfg.prompt === undefined) {
		cfg.prompt = true;
	}
	if (!cfg.prompt) {
		return;
	}

	// Check if the user has taken the survey in the last year.
	// Don't prompt them if they have been.
	if (cfg.lastDateAccepted) {
		if (daysBetween(now, cfg.lastDateAccepted) < 365) {
			return;
		}
	}

	// Check if the user has been prompted for the survey in the last 90 days.
	// Don't prompt them if they have been.
	if (cfg.lastDatePrompted) {
		if (daysBetween(now, cfg.lastDatePrompted) < 90) {
			return;
		}
	}

	// Check if the extension has been activated this month.
	if (cfg.dateComputedPromptThisMonth) {
		// The extension has been activated this month, so we should have already
		// decided if the user should be prompted.
		if (daysBetween(now, cfg.dateComputedPromptThisMonth) < 30) {
			return cfg;
		}
	}
	// This is the first activation this month (or ever), so decide if we
	// should prompt the user. This is done by generating a random number in
	// the range [0, 1) and checking if it is < probability.
	// We then randomly pick a day in the rest of the month on which to prompt
	// the user.
	// Probability is set based on the # of responses received, and will be
	// decreased if we begin receiving > 200 responses/month.
	// Doubled the probability for survey v2 experiment.
	// TODO(hyangah): switch back to 0.03.
	const probability = 0.03 * 2;
	cfg.promptThisMonth = Math.random() < probability;
	if (cfg.promptThisMonth) {
		// end is the last day of the month, day is the random day of the
		// month on which to prompt.
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		const day = randomIntInRange(now.getUTCDate(), end.getUTCDate());
		cfg.dateToPromptThisMonth = new Date(now.getFullYear(), now.getMonth(), day);
	} else {
		cfg.dateToPromptThisMonth = undefined;
	}
	cfg.dateComputedPromptThisMonth = now;
	return cfg;
}

// randomIntInRange returns a random integer between min and max, inclusive.
function randomIntInRange(min: number, max: number): number {
	const low = Math.ceil(min);
	const high = Math.floor(max);
	return Math.floor(Math.random() * (high - low + 1)) + low;
}

async function promptForSurvey(cfg: SurveyConfig, now: Date): Promise<SurveyConfig> {
	const selected = await vscode.window.showInformationMessage(
		`Looks like you are using the Go extension for VS Code.
Could you help us improve this extension by filling out a 1-2 minute survey about your experience with it?`,
		'Yes',
		'Not now',
		'Never'
	);

	// Update the time last asked.
	cfg.lastDatePrompted = now;

	switch (selected) {
		case 'Yes':
			{
				cfg.lastDateAccepted = now;
				cfg.prompt = true;
				const goplsEnabled = latestConfig.enabled;
				const usersGoplsVersion = await getLocalGoplsVersion(latestConfig);
				const surveyURL =
					Math.random() < 0.5
						? `https://google.qualtrics.com/jfe/form/SV_ekAdHVcVcvKUojX?usingGopls=${goplsEnabled}&gopls=${usersGoplsVersion}&extid=${extensionId}` // v1
						: `https://google.qualtrics.com/jfe/form/SV_8kbsnNINPIQ2QGq?usingGopls=${goplsEnabled}&gopls=${usersGoplsVersion}&extid=${extensionId}`; // v2
				await vscode.env.openExternal(vscode.Uri.parse(surveyURL));
			}
			break;
		case 'Not now':
			cfg.prompt = true;

			vscode.window.showInformationMessage("No problem! We'll ask you again another time.");
			break;
		case 'Never':
			cfg.prompt = false;

			vscode.window.showInformationMessage("No problem! We won't ask again.");
			break;
		default:
			// If the user closes the prompt without making a selection, treat it
			// like a "Not now" response.
			cfg.prompt = true;

			break;
	}
	return cfg;
}

export const goplsSurveyConfig = 'goplsSurveyConfig';

function getSurveyConfig(): SurveyConfig {
	return getStateConfig(goplsSurveyConfig) as SurveyConfig;
}

export function resetSurveyConfig() {
	flushSurveyConfig(null);
}

function flushSurveyConfig(cfg: SurveyConfig) {
	if (cfg) {
		updateGlobalState(goplsSurveyConfig, JSON.stringify(cfg));
	} else {
		updateGlobalState(goplsSurveyConfig, null); // reset
	}
}

export function getStateConfig(globalStateKey: string, workspace?: boolean): any {
	let saved: any;
	if (workspace === true) {
		saved = getFromWorkspaceState(globalStateKey);
	} else {
		saved = getFromGlobalState(globalStateKey);
	}
	if (saved === undefined) {
		return {};
	}
	try {
		const cfg = JSON.parse(saved, (key: string, value: any) => {
			// Make sure values that should be dates are correctly converted.
			if (key.toLowerCase().includes('date') || key.toLowerCase().includes('timestamp')) {
				return new Date(value);
			}
			return value;
		});
		return cfg || {};
	} catch (err) {
		console.log(`Error parsing JSON from ${saved}: ${err}`);
		return {};
	}
}

export async function showSurveyConfig() {
	outputChannel.appendLine('Gopls Survey Configuration');
	outputChannel.appendLine(JSON.stringify(getSurveyConfig(), null, 2));
	outputChannel.show();

	const selected = await vscode.window.showInformationMessage('Prompt for survey?', 'Yes', 'Maybe', 'No');
	switch (selected) {
		case 'Yes':
			promptForSurvey(getSurveyConfig(), new Date());
			break;
		case 'Maybe':
			maybePromptForSurvey();
			break;
		default:
			break;
	}
}

export const timeMinute = 1000 * 60;
const timeHour = timeMinute * 60;
export const timeDay = timeHour * 24;

// daysBetween returns the number of days between a and b.
export function daysBetween(a: Date, b: Date): number {
	return msBetween(a, b) / timeDay;
}

// minutesBetween returns the number of minutes between a and b.
function minutesBetween(a: Date, b: Date): number {
	return msBetween(a, b) / timeMinute;
}

export function msBetween(a: Date, b: Date): number {
	return Math.abs(a.getTime() - b.getTime());
}
