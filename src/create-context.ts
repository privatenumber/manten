import type {
	Context,
	PendingTests,
} from './types.js';
import { createTest } from './create-test.js';
import { createDescribe } from './create-describe.js';
import {
	describe as topLevelDescribe,
	test as topLevelTest,
} from './top-level-context.js';

export const createContext = (
	description?: string,
): Context => {
	const callbacks: Context['callbacks'] = {
		onFinish: [],
	};

	const pendingTests: PendingTests = [];

	const test = description ? createTest(`${description} ›`, pendingTests) : topLevelTest;
	const describe = description ? createDescribe(`${description} ›`, pendingTests) : topLevelDescribe;

	const context: Context = {
		test,
		describe,
		runTestSuite: (
			testSuite,
			...args
		) => {
			const runningTestSuite = (async () => {
				let maybeTestSuiteModule = await testSuite;

				if ('default' in maybeTestSuiteModule) {
					maybeTestSuiteModule = maybeTestSuiteModule.default;
				}

				/**
				 * When ESM is compiled to CJS, it's possible the entire module
				 * gets assigned as an object o default. In this case,
				 * it needs to be unwrapped again.
				 */
				if ('default' in maybeTestSuiteModule) {
					maybeTestSuiteModule = maybeTestSuiteModule.default;
				}

				return maybeTestSuiteModule.apply(context, args);
			})();

			pendingTests.push(runningTestSuite);

			return runningTestSuite;
		},
		onFinish(callback) {
			callbacks.onFinish.push(callback);
		},
		pendingTests,
		callbacks,
	};

	return context;
};
