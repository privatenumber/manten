import type {
	Context,
	PendingTests,
	onFinish,
} from './types.js';
import type { RunTestSuite } from './test-suite.js';
import { createTest } from './create-test.js';
import { createDescribe } from './create-describe.js'; // eslint-disable-line import/no-cycle
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

	const test = (
		description
			? createTest(
				`${description} ›`,
				pendingTests,
			)
			: topLevelTest
	);

	const describe = (
		description
			? createDescribe(
				`${description} ›`,
				pendingTests,
			)
			: topLevelDescribe
	);

	const runTestSuite: RunTestSuite = (
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
	};

	const onFinish: onFinish = (callback) => {
		callbacks.onFinish.push(callback);
	};

	const context: Context = {
		api: {
			test,
			describe,
			runTestSuite,
			onFinish,
		},
		pendingTests,
		callbacks,
	};

	return context;
};
