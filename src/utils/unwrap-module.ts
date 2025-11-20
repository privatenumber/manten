import type {
	TestSuite,
	TestSuiteCallback,
} from '../test-suite.js';

export type ModuleDefaultExport <defaultExport> = { default: defaultExport }
	| { default: { default: defaultExport } }; // ESM compiled to CJS

export const unwrapModule = <T extends TestSuite<TestSuiteCallback>>(
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
