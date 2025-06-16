import { inspect } from 'node:util';
import {
	green, red, yellow, dim,
} from 'kolorist';
import prettyMs from 'pretty-ms';
import type { TestMeta } from './types.js';

const newline = '\n';
const indent = '    ';

export const {
	log: consoleLog,
	error: consoleError,
} = console;

const successIcon = green('✔');
const failureIcon = red('✖');
const inProgressIcon = yellow('•');

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

const getTestTitle = (testMeta: TestMeta) => {
	const { title, attempt, retry } = testMeta;
	let message = `${title + prettyDuration(testMeta)}`;

	if (retry > 1) {
		message += dim(` (${attempt}/${retry})`);
	}

	return message;
};

export const logTestFail = (
	testMeta: TestMeta,
	error: unknown,
	stage? : 'onTestFail' | 'onTestFinish',
) => {
	let title = `${failureIcon} ${getTestTitle(testMeta)}`;
	if (stage) {
		title += ` [${stage}]`;
	}

	consoleError(title);
	consoleError(`${indentMultiline(inspect(error))}\n`);
};

export const logTestSuccess = (testMeta: TestMeta) => {
	consoleLog(`${successIcon} ${getTestTitle(testMeta)}`);
};

export const logReport = (allTests: TestMeta[]) => {
	if (allTests.length === 0) {
		return;
	}

	const unfinishedTests: TestMeta[] = [];
	let passingTests = 0;
	let failedTests = 0;
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
	output += `${newline}${dim(prettyMs(lastEndTime! - firstStartTime!))}`;

	// Passed
	output += newline + (passingTests > 0 ? green : dim)(`${passingTests.toLocaleString()} passed`);

	// Failed
	if (failedTests > 0) {
		output += newline + red(`${failedTests.toLocaleString()} failed`);
	}

	// Pending
	if (unfinishedTests.length > 0) {
		output += newline + yellow(`${unfinishedTests.length.toLocaleString()} pending`);
	}

	output += newline;

	consoleLog(output);
};
