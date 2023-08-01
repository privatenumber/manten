export type TestSuiteCallback<
	T extends unknown[] = unknown[],
	ReturnType = unknown,
> = (
	context: Context,
	...args: T
) => ReturnType;

type InferCallback<
	T extends TestSuiteCallback,
> = (
	T extends (context: unknown, ...args: infer Args) => infer ReturnType
		? {
			args: Args;
			returnType: ReturnType;
		}
		: never
);

export type TestSuite<
	Callback extends TestSuiteCallback // TestSuiteCallback ?
> = (
	this: void | Context,
	...callbackArgs: InferCallback<Callback>['args']
) => InferCallback<Callback>['returnType'];

type ModuleDefaultExport <defaultExport> =
	{ default: defaultExport }
	| { default: { default: defaultExport } }; // ESM compiled to CJS

type RunTestSuite = <
	Callback extends TestSuiteCallback<unknown[], unknown>
>(
	testSuite: TestSuite<Callback> | Promise<
		ModuleDefaultExport<TestSuite<Callback>>
	>,
	...args: InferCallback<Callback>['args']
) => InferCallback<Callback>['returnType'];

export type onTestFailCallback = (error: Error) => void;

export type TestApi = {
	onTestFail: (callback: onTestFailCallback) => void;
};

type TestFunction = (api: TestApi) => void;

export type Test = (
	title: string,
	testFunction: TestFunction,
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

export type PendingTests = Promise<unknown>[];

export type TestMeta = {
	title: string;
	testFunction: TestFunction;
	timeout?: number;
	startTime?: number;
	endTime?: number;
	error?: Error;
};
