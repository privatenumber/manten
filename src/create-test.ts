import type {
	Test,
	TestMeta,
	onTestFailCallback,
	Callback,
} from './types.js';
import {
	consoleError,
	logTestResult,
	logReport,
} from './logger.js';
import type { Context } from './create-context.js';
import { timeLimitFunction } from './utils/timer.js';
import { createHook } from './utils/hook.js';
import { retry } from './utils/retry.js';

const runTest = async (
	testMeta: TestMeta,
) => {
	const { testFunction, timeout } = testMeta;

	const testFail = createHook<onTestFailCallback>((hookError) => {
		consoleError('[onTestFail]', testMeta.title);
		consoleError(hookError);
	});

	const handleError = async (
		error: unknown,
	) => {
		// Remove "jest assertion error" matcherResult object
		if (
			error
			&& typeof error === 'object'
			&& 'matcherResult' in error
			&& error.constructor.name === 'JestAssertionError'
		) {
			delete error.matcherResult;
		}

		consoleError(error);
		process.exitCode = 1;

		await testFail.runHooks(error);

		return error;
	};

	const testFinish = createHook<Callback>(async (hookError) => {
		const error = await handleError(hookError);
		if (!testMeta.error) {
			testMeta.error = error;
		}
	});

	try {
		await retry(
			async (attempt) => {
				testMeta.attempt = attempt;
				testMeta.startTime = Date.now();
				try {
					await timeLimitFunction(
						testFunction({
							onTestFail: testFail.addHook,
							onTestFinish: testFinish.addHook,
						}),
						timeout,
					);
				} catch (error) {
					await handleError(error);
					throw error;
				} finally {
					await testFinish.runHooks();
					testMeta.endTime = Date.now();
				}
			},
			testMeta.retry,
		);
	} catch (error) {
		testMeta.error = error;
	} finally {
		logTestResult(testMeta);
	}
};

const allTests: TestMeta[] = [];

process.on('exit', () => {
	logReport(allTests);
});

export const createTest = (
	prefix?: string,
	parentContext?: Context,
): Test => (
	async (
		title,
		testFunction,
		timeoutOrOptions,
	) => {
		if (prefix) {
			title = `${prefix} ${title}`;
		}

		const testMeta: TestMeta = {
			title,
			testFunction,
			retry: 1,
		};

		if (timeoutOrOptions !== undefined) {
			if (typeof timeoutOrOptions === 'number') {
				testMeta.timeout = timeoutOrOptions;
			} else {
				testMeta.timeout = timeoutOrOptions?.timeout;
				if (timeoutOrOptions?.retry) {
					testMeta.retry = timeoutOrOptions?.retry;
				}
			}
		}

		allTests.push(testMeta);

		const testRunning = runTest(testMeta);

		if (parentContext) {
			parentContext.pendingTests.push(testRunning);
		}

		await testRunning;
	}
);
