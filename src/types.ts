export type TestSuiteCallback<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	T extends any[] = any[],
	ReturnType = unknown,
> = (
	api: DescribeApi,
	...args: T
) => ReturnType;

type InferCallback<
	T extends TestSuiteCallback,
> = (
	T extends TestSuiteCallback<infer Args, infer ReturnType>
		? {
			args: Args;
			returnType: ReturnType;
		}
		: never
);

export type TestSuite<
	Callback extends TestSuiteCallback
> = (
	this: void | Context,
	...callbackArgs: InferCallback<Callback>['args']
) => InferCallback<Callback>['returnType'];

type ModuleDefaultExport <defaultExport> =
	{ default: defaultExport }
	| { default: { default: defaultExport } }; // ESM compiled to CJS

type RunTestSuite = <
	Callback extends TestSuiteCallback
>(
	testSuite: TestSuite<Callback> | Promise<
		ModuleDefaultExport<TestSuite<Callback>>
	>,
	...args: InferCallback<Callback>['args']
) => InferCallback<Callback>['returnType'];

export type Callback = () => void;

export type onTestFailCallback = (error: Error) => void;
export type TestApi = {
	onTestFail: (callback: onTestFailCallback) => void;
	onTestFinish: (callback: Callback) => void;
};

type TestFunction = (api: TestApi) => void;

export type Test = (
	title: string,
	testFunction: TestFunction,
	timeout?: number,
) => Promise<void>;

export type DescribeApi = {
	describe: Describe;
	test: Test;
	runTestSuite: RunTestSuite;
	onFinish: (callback: Callback) => void;
};

export type Describe = (
	description: string,
	callback: (api: DescribeApi) => void,
) => Promise<void>;

export type Context = {
	api: DescribeApi;
	pendingTests: PendingTests;
	callbacks: {
		onFinish: Callback[];
	};
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
