import { setMaxListeners } from 'node:events';
import type {
	Describe,
	DescribeCallback,
	Callback,
} from './types.ts';
import { consoleError } from './logger.ts';
import { waitAllPromises } from './utils/wait-all-promises.ts';
import { createSemaphore } from './utils/semaphore.ts';
import { timeLimitFunction } from './utils/timer.ts';
import { linkAbortSignal } from './utils/link-abort-signal.ts';
import { asyncContext } from './async-context.ts';

export type Context = {
	pendingTests: Promise<unknown>[];
	onFinishCallbacks: Callback[];
	concurrencyLimiter?: {
		acquire: () => Promise<() => void>;
		setLimit: (newLimit: number) => void;
		cleanup: () => void;
	};
	abortController: AbortController;
	timeout?: number;
	skipped: boolean;
	skipReason?: string;
	testsStarted: boolean;
};

const createContext = (
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

	return {
		pendingTests: [],
		onFinishCallbacks: [],
		concurrencyLimiter,
		abortController,
		timeout,
		skipped: false,
		skipReason: undefined,
		testsStarted: false,
	};
};

const runDescribe = async (
	context: Context,
	prefix: string,
	callback: DescribeCallback,
	parentContext?: Context,
) => {
	// Inherit skip state from parent
	if (parentContext?.skipped) {
		context.skipped = true;
		context.skipReason = parentContext.skipReason;
	}

	const unlinkAbort = parentContext
		? linkAbortSignal(context.abortController, parentContext.abortController.signal)
		: undefined;

	try {
		const inProgress = (async () => {
			// Wrap callback in AsyncLocalStorage so test/describe/etc.
			// can auto-detect the active context
			await asyncContext.run(
				{
					prefix,
					context,
				},
				() => callback({ signal: context.abortController.signal }),
			);
			await waitAllPromises(context.pendingTests);
		})();

		if (parentContext) {
			parentContext.pendingTests.push(inProgress);
		}

		// Apply timeout if specified
		await timeLimitFunction(inProgress, context.timeout, context.abortController);
	} catch (error) {
		consoleError(error);
		process.exitCode = 1;
	} finally {
		unlinkAbort?.();

		if (!context.abortController.signal.aborted) {
			context.abortController.abort();
		}

		// Clean up auto interval if it exists
		if (context.concurrencyLimiter) {
			context.concurrencyLimiter.cleanup();
		}

		for (const onFinishCallback of context.onFinishCallbacks) {
			try {
				await onFinishCallback();
			} catch (error) {
				consoleError(error);
				process.exitCode = 1;
			}
		}
	}
};

export const describe: Describe = (description, callback, options) => {
	const store = asyncContext.getStore();

	if (store?.prefix) {
		description = `${store.prefix} ${description}`;
	}

	// Mark parent as having started tests/describes (SYNCHRONOUSLY)
	const parentContext = store?.context;
	if (parentContext) {
		parentContext.testsStarted = true;
	}

	const prefix = description ? `${description} ›` : '';

	return (async () => {
		const context = createContext(options?.parallel, options?.timeout);

		if (parentContext?.concurrencyLimiter) {
			const release = await parentContext.concurrencyLimiter.acquire();
			try {
				await runDescribe(context, prefix, callback, parentContext);
			} finally {
				release();
			}
		} else {
			await runDescribe(context, prefix, callback, parentContext);
		}
	})();
};

// Standalone APIs that read from ALS

export const onFinish = (callback: Callback): void => {
	const store = asyncContext.getStore();
	if (!store?.context) {
		throw new Error('onFinish() must be called within a describe()');
	}
	store.context.onFinishCallbacks.push(callback);
};

export const skip = (reason?: string): void => {
	const store = asyncContext.getStore();
	if (!store) {
		throw new Error('skip() must be called within a describe() or test()');
	}

	// Test-level skip (throws SkipError)
	if (store.testSkip) {
		store.testSkip(reason);
	}

	// Describe-level skip
	if (!store.context) {
		throw new Error('skip() must be called within a describe() or test()');
	}
	if (store.context.testsStarted) {
		throw new Error(
			'skip() must be called before any tests or nested describes run. '
			+ 'Move skip() to the beginning of the describe callback.',
		);
	}
	store.context.skipped = true;
	store.context.skipReason = reason;
};
