import { AsyncLocalStorage } from 'node:async_hooks';
import type { Context } from './context.ts';
import type { Callback, onTestFailCallback } from './types.ts';

export type AsyncContextStore = {
	// Describe-level
	prefix?: string;
	context?: Context;

	// Test-level (layered on top during test execution)
	snapshotContext?: {
		expectSnapshot: (value: unknown, name?: string) => void;
		reset: () => void;
	};
	testFailHook?: (callback: onTestFailCallback) => void;
	testFinishHook?: (callback: Callback) => void;
	testSkip?: (reason?: string) => never;
};

export const asyncContext = new AsyncLocalStorage<AsyncContextStore>();
