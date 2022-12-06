import {
	green, red, yellow, dim,
} from 'kolorist';
import prettyMs from 'pretty-ms';
import type { TestMeta } from './types.js';

const newline = '\n';

export const { log: consoleLog, error: consoleError } = console;

const successIcon = green('✔');
const failureIcon = red('✖');
const inProgressIcon = yellow('•');

const prettyDuration = ({ startTime, endTime }: TestMeta) => {
	const duration = (endTime || Date.now()) - startTime!;
	return (
		duration < 50
			? ''
			: ` ${dim(`(${prettyMs(duration)})`)}`
	);
};

export const logTestResult = (testMeta: TestMeta) => {
	const { title, error } = testMeta;
	const logger = error ? consoleError : consoleLog;

	logger(
		error ? failureIcon : successIcon,
		title + prettyDuration(testMeta),
	);
};

export const logReport = (allTests: TestMeta[]) => {
	if (allTests.length === 0) {
		return;
	}

	const unfinishedTests: TestMeta[] = [];
	let passingTests = 0;
	let failingTests = 0;
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
				failingTests += 1;
			} else {
				passingTests += 1;
			}
		}
	}

	let output = '';

	if (unfinishedTests.length > 0) {
		for (const test of unfinishedTests) {
			output += `${newline}${inProgressIcon} ${test.title} ${prettyDuration(test)}`;
		}
		output += newline;
	}

	output += `${newline}Completed in ${prettyMs(lastEndTime! - firstStartTime!)}`;

	const passing = `${passingTests} passing`;
	output += newline + (passingTests > 0 ? green : dim)(passing);

	if (failingTests > 0) {
		output += newline + red(`${failingTests} failing`);
	}

	if (unfinishedTests.length > 0) {
		output += newline + yellow(`${unfinishedTests.length} pending`);
	}

	output += newline;

	consoleLog(output);
};
