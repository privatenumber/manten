import { setMaxListeners } from 'node:events';
import type {
	Describe,
	Test,
	onFinish,
	Callback,
} from './types.js';
import type {
	TestSuite,
	TestSuiteCallback,
	InferCallback,
} from './test-suite.js';
import { createTest } from './create-test.js';
import { consoleError } from './logger.js';
import { waitAllPromises } from './utils/wait-all-promises.js';
import { unwrapModule, type ModuleDefaultExport } from './utils/unwrap-module.js';
import { createSemaphore } from './utils/semaphore.js';
import { timeLimitFunction } from './utils/timer.js';

export type ContextCallback = (api: ContextApi) => void;

export type RunTestSuite = <
	SuiteCallback extends TestSuiteCallback,
>(
	testSuite:
		TestSuite<SuiteCallback>
		| Promise<ModuleDefaultExport<TestSuite<SuiteCallback>>>,
	...args: InferCallback<SuiteCallback>['args']
) => InferCallback<SuiteCallback>['returnType'];

export type ContextApi = {
	signal: AbortSignal;
	describe: Describe;
	test: Test;
	runTestSuite: RunTestSuite;
	onFinish: onFinish;
};

export type Context = {
	api: ContextApi;
	pendingTests: Promise<unknown>[];
	callbacks: {
		onFinish: Callback[];
	};
	concurrencyLimiter?: {
		acquire: () => Promise<() => void>;
		setLimit: (newLimit: number) => void;
		cleanup: () => void;
	};
	abortController: AbortController;
	timeout?: number;
	run: (
		callback: ContextCallback,
		parentContext?: Context,
	) => Promise<void>;
};

export type CreateContext = (
	description?: string,
	parallel?: boolean | number | 'auto',
	timeout?: number,
) => Context;

export const createDescribe = (
	prefix?: string,
	parentContext?: Context,
): Describe => (
	async (
		description,
		callback,
		options,
	) => {
		if (prefix) {
			description = `${prefix} ${description}`;
		}

		const context = createContext(description, options?.parallel, options?.timeout);

		const executeDescribe = async () => {
			// Check if parent has concurrency limiter
			if (parentContext?.concurrencyLimiter) {
				// Acquire slot
				const release = await parentContext.concurrencyLimiter.acquire();
				try {
					await context.run(callback, parentContext);
				} finally {
					release();
				}
			} else {
				await context.run(callback, parentContext);
			}
		};

		await executeDescribe();
	}
);

export const createRunTestSuite = (
	prefix?: string,
	parentContext?: Context,
): RunTestSuite => (
	(
		testSuite,
		...args
	) => {
		const executeTestSuite = () => {
			const context = createContext(prefix);
			return context.run(async () => {
				const maybeTestSuiteModule = unwrapModule(await testSuite);
				return maybeTestSuiteModule.apply(context, args);
			}, parentContext);
		};

		// Check if parent has concurrency limiter
		if (parentContext?.concurrencyLimiter) {
			// Acquire slot
			return parentContext.concurrencyLimiter.acquire().then(
				release => executeTestSuite().finally(release),
			);
		}
		return executeTestSuite();
	}
);

// Top-level instances (for use when no parent context)
const topLevelTest = createTest();
const topLevelDescribe = createDescribe();
const topLevelRunTestSuite = createRunTestSuite();

export const createContext: CreateContext = (
	description?: string,
	parallel?: boolean | number | 'auto',
	timeout?: number,
): Context => {
	let concurrencyLimiter: Context['concurrencyLimiter'];

	if (parallel !== undefined) {
		if (parallel === true) {
			// Unbounded concurrency - no limiter needed
			concurrencyLimiter = undefined;
		} else if (parallel === false) {
			// Sequential execution
			concurrencyLimiter = createSemaphore(1);
		} else if (typeof parallel === 'number') {
			// Fixed concurrency limit
			concurrencyLimiter = createSemaphore(parallel);
		} else if (parallel === 'auto') {
			// Dynamic concurrency based on system load
			concurrencyLimiter = createSemaphore('auto');
		}
	}

	const abortController = new AbortController();

	// Allow unlimited listeners to prevent MaxListenersExceededWarning
	// when many tests attach to the parent signal for cleanup
	setMaxListeners(0, abortController.signal);

	const context = {
		pendingTests: [],
		callbacks: {
			onFinish: [],
		},
		concurrencyLimiter,
		abortController,
		timeout,
		run: async (
			callback: ContextCallback,
			parentContext?: Context,
		) => {
			// Listen to parent abort signal
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
				const inProgress = (async () => {
					await callback(context.api);
					await waitAllPromises(context.pendingTests);
				})();

				if (parentContext) {
					parentContext.pendingTests.push(inProgress);
				}

				// Apply timeout if specified
				await timeLimitFunction(inProgress, timeout, abortController);
			} catch (error) {
				consoleError(error);
				process.exitCode = 1;
			} finally {
				// Clean up parent listener to prevent memory leak
				if (parentContext && handleParentAbort) {
					parentContext.abortController.signal.removeEventListener('abort', handleParentAbort);
				}

				// Abort controller if not already aborted
				if (!abortController.signal.aborted) {
					abortController.abort();
				}

				// Clean up auto interval if it exists
				if (concurrencyLimiter) {
					concurrencyLimiter.cleanup();
				}

				for (const onFinish of context.callbacks.onFinish) {
					try {
						await onFinish();
					} catch (error) {
						consoleError(error);
						process.exitCode = 1;
					}
				}
			}
		},
	} as unknown as Context;

	context.api = {
		signal: abortController.signal,
		test: (
			description
				? createTest(
					`${description} ›`,
					context,
				)
				: topLevelTest
		),
		describe: (
			description
				? createDescribe(
					`${description} ›`,
					context,
				)
				: topLevelDescribe
		),
		runTestSuite: (
			description
				? createRunTestSuite(
					description,
					context,
				)
				: topLevelRunTestSuite
		),
		onFinish: (callback) => {
			context.callbacks.onFinish.push(callback);
		},
	};

	return context;
};

// Re-export for backward compatibility with top-level-context.ts
export {
	topLevelTest as test,
	topLevelDescribe as describe,
	topLevelRunTestSuite as runTestSuite,
};
