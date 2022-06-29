type InferCallback<
	T extends (...args: any) => any,
> = (
	T extends (context: any, ...args: infer Args) => infer ReturnType
		? {
			args: Args;
			returnType: ReturnType;
		}
		: never
);

export type TestSuiteCallback<
	T extends any[],
	ReturnType,
> = (
	context: Context,
	...args: T
) => ReturnType;

export type TestSuite<
	Callback extends (...args: any) => any
> = (
	this: void | Context,
	...callbackArgs: InferCallback<Callback>['args']
) => InferCallback<Callback>['returnType'];

type ModuleDefaultExport <defaultExport> =
	{ default: defaultExport }
	| { default: { default: defaultExport } }; // ESM compiled to CJS

type RunTestSuite = <
	Callback extends TestSuiteCallback<any[], any>
>(
	testSuite: TestSuite<Callback> | Promise<
		ModuleDefaultExport<TestSuite<Callback>>
	>,
	...args: InferCallback<Callback>['args']
) => InferCallback<Callback>['returnType'];

export type Test = (
	title: string,
	testFunction: () => void,
	timeout?: number,
) => Promise<void>;

export type Describe = (
	description: string,
	callback: (context: Context) => void,
) => Promise<void>;

export type Context = {
	describe: Describe;
	test: Test;
	runTestSuite: RunTestSuite;
};

export type PendingTests = Promise<any>[];
