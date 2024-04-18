import type {
	Describe,
	Test,
	onFinish,
	Callback,
} from './types.js';
import { createTest } from './create-test.js';
// eslint-disable-next-line import-x/no-cycle
import { createDescribe } from './create-describe.js';
// eslint-disable-next-line import-x/no-cycle
import {
	test as topLevelTest,
	describe as topLevelDescribe,
	runTestSuite as topLevelRunTestSuite,
} from './top-level-context.js';
import { createRunTestSuite } from './create-run-test-suite.js';
import { consoleError } from './logger.js';
import { waitAllPromises } from './utils/wait-all-promises.js';
import type { RunTestSuite } from './create-run-test-suite.js';

export type ContextCallback = (api: ContextApi) => void;

export type ContextApi = {
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
	run: (
		callback: ContextCallback,
		parentContext?: Context,
	) => Promise<void>;
};

export const createContext = (
	description?: string,
): Context => {
	const context = {
		pendingTests: [],
		callbacks: {
			onFinish: [],
		},
		run: async (
			callback: ContextCallback,
			parentContext?: Context,
		) => {
			try {
				const inProgress = (async () => {
					await callback(context.api);
					await waitAllPromises(context.pendingTests);
				})();

				if (parentContext) {
					parentContext.pendingTests.push(inProgress);
				}

				await inProgress;
			} catch (error) {
				consoleError(error);
				process.exitCode = 1;
			} finally {
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
