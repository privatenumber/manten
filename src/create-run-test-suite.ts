import type {
	TestSuite,
	TestSuiteCallback,
	InferCallback,
} from './test-suite.js';
// eslint-disable-next-line import-x/no-cycle
import {
	createContext,
	type Context,
} from './create-context.js';

type ModuleDefaultExport <defaultExport> =
	{ default: defaultExport }
	| { default: { default: defaultExport } }; // ESM compiled to CJS

const unwrapModule = <T extends TestSuite<TestSuiteCallback>>(
	maybeModule: T | ModuleDefaultExport<T>,
): T => {
	if ('default' in maybeModule) {
		maybeModule = maybeModule.default;
	}

	/**
	 * When ESM is compiled to CJS, it's possible the entire module
	 * gets assigned as an object o default. In this case,
	 * it needs to be unwrapped again.
	 */
	if ('default' in maybeModule) {
		maybeModule = maybeModule.default;
	}

	return maybeModule;
};

export type RunTestSuite = <
	Callback extends TestSuiteCallback
>(
	testSuite:
		TestSuite<Callback>
		| Promise<ModuleDefaultExport<TestSuite<Callback>>
	>,
	...args: InferCallback<Callback>['args']
) => InferCallback<Callback>['returnType'];

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
