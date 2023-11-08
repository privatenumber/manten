import type { Context } from './types.js';
import type {
	TestSuite,
	TestSuiteCallback,
	InferCallback,
} from './test-suite.js';

type ModuleDefaultExport <defaultExport> =
	{ default: defaultExport }
	| { default: { default: defaultExport } }; // ESM compiled to CJS

export type RunTestSuite = <
	Callback extends TestSuiteCallback
>(
	testSuite:
		TestSuite<Callback>
		| Promise<ModuleDefaultExport<TestSuite<Callback>>
	>,
	...args: InferCallback<Callback>['args']
) => InferCallback<Callback>['returnType'];

const unwrapM = <T extends TestSuite<TestSuiteCallback>>(
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

export const createRunTestSuite = (
	context: Context,
): RunTestSuite => (
	(
		testSuite,
		...args
	) => {
		const runningTestSuite = (async () => {
			const maybeTestSuiteModule = unwrapM(await testSuite);
			return maybeTestSuiteModule.apply(context, args);
		})();

		context.pendingTests.push(runningTestSuite);

		return runningTestSuite;
	}
);
