import {
	describe,
	test,
} from './top-level-context';
import type {
	Context,
	TestSuiteCallback,
	TestSuite,
} from './types';

const defaultContext: Context = {
	describe,
	test,
	runTestSuite: async (
		testSuiteImport,
		...args
	) => {
		let testSuiteModule = await testSuiteImport;

		if ('default' in testSuiteModule) {
			testSuiteModule = testSuiteModule.default;
		}

		return testSuiteModule.apply(defaultContext, args);
	},
};

export function testSuite<
	Callback extends TestSuiteCallback<any[], any>,
>(
	callback: Callback,
): TestSuite<Callback> {
	return function (...callbackArgs) {
		return callback(
			this || defaultContext,
			...callbackArgs,
		);
	};
}
