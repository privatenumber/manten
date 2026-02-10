import { dim } from 'kolorist';
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
import { linkAbortSignal } from './utils/link-abort-signal.js';
import {
	createSnapshotContext,
	saveSnapshots,
	getSnapshotSummary,
} from './snapshot/snapshots.js';
import { formatSnapshotSummary } from './snapshot/format.js';
import { asyncContext } from './async-context.js';

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

	// Why run an error hook on finish?
	const testFinish = createHook<Callback>(async (error) => {
		logTestFail(testMeta, patchJestAssertionError(error), 'onTestFinish');
	});

	// Create snapshot context outside retry (counter resets on retry)
	const snapshotContext = createSnapshotContext(testMeta.title, testMeta);

	try {
		await retry(
			async (attempt) => {
				testMeta.attempt = attempt;
				testMeta.startTime = Date.now();

				// Reset snapshot counter on retry so keys 1, 2 are reused (not 3, 4)
				if (attempt > 1) {
					snapshotContext.reset();
				}

				const abortController = new AbortController();

				const unlinkAbort = parentContext
					? linkAbortSignal(abortController, parentContext.abortController.signal)
					: undefined;

				try {
					// Get current ALS store to layer test-level entries on top
					const currentStore = asyncContext.getStore();

					await asyncContext.run(
						{
							...currentStore,
							snapshotContext,
							testFailHook: testFail.addHook,
							testFinishHook: testFinish.addHook,
							testSkip: (reason?: string) => {
								throw new SkipError(reason);
							},
						},
						() => timeLimitFunction(
							testFunction({ signal: abortController.signal }),
							timeout,
							abortController,
						),
					);
					logTestSuccess(testMeta);
				} catch (error) {
					if (error instanceof SkipError) {
						testMeta.skip = true;
						logTestSkip(testMeta);
					} else {
						logTestFail(testMeta, patchJestAssertionError(error));
						await testFail.runHooks(error);
						throw error;
					}
				} finally {
					unlinkAbort?.();

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
	// Save snapshots first (critical operation)
	try {
		saveSnapshots();
	} catch (error) {
		process.stderr.write(`Failed to save snapshots: ${error}\n`);
	}

	// Always log test report
	logReport(allTests);

	// Log snapshot summary if there are new/updated snapshots
	const snapshotSummary = getSnapshotSummary();
	if (snapshotSummary.new > 0 || snapshotSummary.updated > 0) {
		const summaryMessage = formatSnapshotSummary(snapshotSummary);
		process.stdout.write(`${summaryMessage}\n`);
	}
});

const onlyRunTests = process.env.TESTONLY;

// Log TESTONLY filter immediately when set
if (onlyRunTests) {
	console.log(dim(`Only running tests that match: ${JSON.stringify(onlyRunTests)}\n`));
}

export const test: Test = (title, testFunction, timeoutOrOptions) => {
	const store = asyncContext.getStore();

	if (store?.prefix) {
		title = `${store.prefix} ${title}`;
	}

	// Mark parent as having started tests (SYNCHRONOUSLY)
	// This ensures structural validity regardless of filtering
	const parentContext = store?.context;
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

	const testRunning = (async () => {
		if (parentContext?.concurrencyLimiter) {
			const release = await parentContext.concurrencyLimiter.acquire();
			try {
				await runTest(testMeta, parentContext);
			} finally {
				release();
			}
		} else {
			await runTest(testMeta, parentContext);
		}
	})();

	if (parentContext) {
		parentContext.pendingTests.push(testRunning);
	}

	return testRunning;
};

// Standalone APIs that read from ALS

export const onTestFail = (callback: onTestFailCallback): void => {
	const store = asyncContext.getStore();
	if (!store?.testFailHook) {
		throw new Error('onTestFail() must be called within a test()');
	}
	store.testFailHook(callback);
};

export const onTestFinish = (callback: Callback): void => {
	const store = asyncContext.getStore();
	if (!store?.testFinishHook) {
		throw new Error('onTestFinish() must be called within a test()');
	}
	store.testFinishHook(callback);
};
