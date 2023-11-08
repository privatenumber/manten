import type {
	Context,
	PendingTests,
	onFinish,
} from './types.js';
import { createTest } from './create-test.js';
import { createDescribe } from './create-describe.js'; // eslint-disable-line import/no-cycle
import {
	describe as topLevelDescribe,
	test as topLevelTest,
} from './top-level-context.js';
import { createRunTestSuite } from './create-run-test-suite.js';

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

	const onFinish: onFinish = (callback) => {
		callbacks.onFinish.push(callback);
	};

	const context = {
		api: {},
		pendingTests,
		callbacks,
	};

	context.api = {
		test,
		describe,
		runTestSuite: createRunTestSuite(context as Context),
		onFinish,
	};

	return context as Context;
};
