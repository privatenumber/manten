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

export type CreateContext = (description?: string) => Context;

export const createDescribe = (
	prefix?: string,
	parentContext?: Context,
): Describe => (
	async (
		description,
		callback,
	) => {
		if (prefix) {
			description = `${prefix} ${description}`;
		}

		const context = createContext(description);
		await context.run(callback, parentContext);
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
		const context = createContext(prefix);
		return context.run(async () => {
			const maybeTestSuiteModule = unwrapModule(await testSuite);
			return maybeTestSuiteModule.apply(context, args);
		}, parentContext);
	}
);

// Top-level instances (for use when no parent context)
const topLevelTest = createTest();
const topLevelDescribe = createDescribe();
const topLevelRunTestSuite = createRunTestSuite();

export const createContext: CreateContext = (
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

// Re-export for backward compatibility with top-level-context.ts
export {
	topLevelTest as test,
	topLevelDescribe as describe,
	topLevelRunTestSuite as runTestSuite,
};
