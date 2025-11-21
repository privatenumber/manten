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
import type { Context } from './context.js';
import { timeLimitFunction } from './utils/timer.js';
import { createHook } from './utils/hook.js';
import { retry } from './utils/retry.js';

// Custom error class for skipping tests
class SkipError extends Error {
	constructor(reason?: string) {
		super(reason || 'Test skipped');
		this.name = 'SkipError';
	}
}

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
	parentContext?: Context,
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

				const abortController = new AbortController();

				// Listen to parent context abort
				let handleParentAbort: (() => void) | undefined;
				if (parentContext) {
					handleParentAbort = () => {
						if (!abortController.signal.aborted) {
							abortController.abort(parentContext.abortController.signal.reason);
						}
					};
					parentContext.abortController.signal.addEventListener('abort', handleParentAbort);

					// Check if parent already aborted (missed the event)
					if (parentContext.abortController.signal.aborted) {
						handleParentAbort();
					}
				}

				try {
					await timeLimitFunction(
						testFunction({
							signal: abortController.signal,
							onTestFail: testFail.addHook,
							onTestFinish: testFinish.addHook,
							skip: (reason?: string) => {
								throw new SkipError(reason);
							},
						}),
						timeout,
						abortController,
					);
					logTestSuccess(testMeta);
				} catch (error) {
					if (error instanceof SkipError) {
						testMeta.skip = true;
						logTestSkip(testMeta);
					} else {
						// Probably can remove error property now
						logTestFail(testMeta, patchJestAssertionError(error));
						await handleError(error);
						throw error;
					}
				} finally {
					// Clean up parent listener to prevent memory leak
					if (parentContext && handleParentAbort) {
						parentContext.abortController.signal.removeEventListener('abort', handleParentAbort);
					}

					if (!abortController.signal.aborted) {
						abortController.abort();
					}
					await testFinish.runHooks();
					testMeta.endTime = Date.now();
				}
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
	(
		title,
		testFunction,
		timeoutOrOptions,
	) => {
		if (prefix) {
			title = `${prefix} ${title}`;
		}

		// Mark parent as having started tests (SYNCHRONOUSLY)
		// This ensures structural validity regardless of filtering
		if (parentContext) {
			parentContext.testsStarted = true;
		}

		if (onlyRunTests && !title.includes(onlyRunTests)) {
			return Promise.resolve();
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

		// Check if parent describe is skipped
		if (parentContext?.skipped) {
			testMeta.skip = true;
			testMeta.skipReason = parentContext.skipReason;
			const now = Date.now();
			testMeta.startTime = now;
			testMeta.endTime = now;
			logTestSkip(testMeta);
			return Promise.resolve();
		}

		// Return async execution
		return (async () => {
			const executeTest = async () => {
				// Check if parent has concurrency limiter
				if (parentContext?.concurrencyLimiter) {
					// Acquire slot
					const release = await parentContext.concurrencyLimiter.acquire();
					try {
						await runTest(testMeta, parentContext);
					} finally {
						release();
					}
				} else {
					await runTest(testMeta, parentContext);
				}
			};

			const testRunning = executeTest();

			if (parentContext) {
				parentContext.pendingTests.push(testRunning);
			}

			await testRunning;
		})();
	}
);
