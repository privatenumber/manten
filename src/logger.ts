import { inspect } from 'node:util';
import {
	green, red, yellow, dim,
} from 'kolorist';
import prettyMs from 'pretty-ms';
import type { TestMeta } from './types.ts';

const newline = '\n';
const indent = '    ';

export const {
	log: consoleLog,
	error: consoleError,
} = console;

const successIcon = green('✔');
const failureIcon = red('✖');
const inProgressIcon = yellow('•');
const skipIcon = dim('○');

const formatTimestamp = () => {
	const now = new Date();
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');
	return dim(`${hours}:${minutes}:${seconds}`);
};

const prettyDuration = ({ startTime, timeout, endTime }: TestMeta) => {
	const duration = (endTime || Date.now()) - startTime!;
	let formatted = prettyMs(duration);

	if (timeout) {
		formatted += ` / ${prettyMs(timeout)}`;
	}

	return (
		duration < 50
			? ''
			: ` ${dim(`(${formatted})`)}`
	);
};

const indentMultiline = (
	string: string,
) => string.replaceAll(/^/gm, indent);

const getTestTitle = (testMeta: TestMeta, includeRetryCounter = true) => {
	const { title, attempt, retry } = testMeta;
	let message = `${title + prettyDuration(testMeta)}`;

	if (includeRetryCounter && retry > 1) {
		message += dim(` (${attempt}/${retry})`);
	}

	return message;
};

export const logTestFail = (
	testMeta: TestMeta,
	error: unknown,
	stage? : 'onTestFail' | 'onTestFinish',
) => {
	let title = `${formatTimestamp()} ${failureIcon} ${getTestTitle(testMeta)}`;
	if (stage) {
		title += ` [${stage}]`;
	}

	consoleError(title);
	consoleError(`${indentMultiline(inspect(error))}\n`);
};

export const logTestSuccess = (testMeta: TestMeta) => {
	consoleLog(`${formatTimestamp()} ${successIcon} ${getTestTitle(testMeta)}`);
};

export const logTestSkip = (testMeta: TestMeta) => {
	consoleLog(`${formatTimestamp()} ${skipIcon} ${getTestTitle(testMeta, false)}`);
};

export const logReport = (allTests: TestMeta[]) => {
	if (allTests.length === 0) {
		return;
	}

	const unfinishedTests: TestMeta[] = [];
	let passingTests = 0;
	let failedTests = 0;
	let skippedTests = 0;
	let firstStartTime: number | undefined;
	let lastEndTime: number | undefined;

	for (const test of allTests) {
		if (
			test.startTime
			&& (!firstStartTime || firstStartTime > test.startTime)
		) {
			firstStartTime = test.startTime;
		}

		if (test.endTime === undefined) {
			unfinishedTests.push(test);
		} else {
			if (!lastEndTime || lastEndTime < test.endTime) {
				lastEndTime = test.endTime;
			}

			if (test.error) {
				failedTests += 1;
			} else if (test.skip) {
				skippedTests += 1;
			} else {
				passingTests += 1;
			}
		}
	}

	let output = '';

	if (unfinishedTests.length > 0) {
		for (const test of unfinishedTests) {
			output += `${newline}${inProgressIcon} ${test.title + prettyDuration(test)}`;
		}
		output += newline;
	}

	// Elapsed
	output += `${newline}${dim(prettyMs((lastEndTime ?? Date.now()) - firstStartTime!))}`;

	// Passed
	output += newline + (passingTests > 0 ? green : dim)(`${passingTests.toLocaleString()} passed`);

	// Failed
	if (failedTests > 0) {
		output += newline + red(`${failedTests.toLocaleString()} failed`);
	}

	// Skipped
	if (skippedTests > 0) {
		output += newline + dim(`${skippedTests.toLocaleString()} skipped`);
	}

	// Pending
	if (unfinishedTests.length > 0) {
		output += newline + yellow(`${unfinishedTests.length.toLocaleString()} pending`);
	}

	output += newline;

	consoleLog(output);
};
