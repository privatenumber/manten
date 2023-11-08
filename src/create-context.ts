import type {
	Context,
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
	const context = {
		pendingTests: [],
		callbacks: {
			onFinish: [],
		},
	} as unknown as Context;

	context.api = {
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
		runTestSuite: createRunTestSuite(context),
		onFinish: (callback) => {
			context.callbacks.onFinish.push(callback);
		},
	};

	return context;
};
