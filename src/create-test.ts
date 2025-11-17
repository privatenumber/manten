import type {
	Test,
	TestMeta,
	onTestFailCallback,
	Callback,
} from './types.js';
import {
	logTestSuccess,
	logTestFail,
	logTestSkip,
	logReport,
} from './logger.js';
import type { Context } from './create-context.js';
import { timeLimitFunction } from './utils/timer.js';
import { createHook } from './utils/hook.js';
import { retry } from './utils/retry.js';

// Remove "jest assertion error" matcherResult object
const patchJestAssertionError = (error: unknown) => {
	if (
		error
		&& typeof error === 'object'
		&& 'matcherResult' in error
		&& error.constructor.name === 'JestAssertionError'
	) {
		delete error.matcherResult;
	}
	return error;
};

const runTest = async (
	testMeta: TestMeta,
) => {
	const { testFunction, timeout } = testMeta;

	const testFail = createHook<onTestFailCallback>((hookError) => {
		logTestFail(testMeta, hookError, 'onTestFail');
	});

	const handleError = async (
		error: unknown,
	) => {
		await testFail.runHooks(error);
	};

	// Why run an error hook on finish?
	const testFinish = createHook<Callback>(async (error) => {
		logTestFail(testMeta, patchJestAssertionError(error), 'onTestFinish');
	});

	try {
		await retry(
			async (attempt) => {
				testMeta.attempt = attempt;
				testMeta.startTime = Date.now();
				try {
					const result = await timeLimitFunction(
						testFunction({
							onTestFail: testFail.addHook,
							onTestFinish: testFinish.addHook,
						}),
						timeout,
					);
					if (result && typeof result === 'object' && 'skip' in result && (result as any).skip === true) {
						testMeta.skip = true;
						logTestSkip(testMeta);
					} else {
						logTestSuccess(testMeta);
					}
				} catch (error) {
					// Probably can remove error property now
					logTestFail(testMeta, patchJestAssertionError(error));
					await handleError(error);
					throw error;
				} finally {
					await testFinish.runHooks();
					testMeta.endTime = Date.now();
				}
				logTestSuccess(testMeta);
			},
			testMeta.retry,
		);
	} catch (error) {
		testMeta.error = error;
		process.exitCode = 1;
	}
};

const allTests: TestMeta[] = [];

process.on('exit', () => {
	logReport(allTests);
});

const onlyRunTests = process.env.TESTONLY;

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

		if (onlyRunTests && !title.includes(onlyRunTests)) {
			return;
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
