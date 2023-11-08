import type { RunTestSuite } from './create-run-test-suite.js';

export type Callback = () => void;

export type onFinish = (callback: Callback) => void;

export type onTestFailCallback = (error: Error) => void;
export type TestApi = {
	onTestFail: (callback: onTestFailCallback) => void;
	onTestFinish: onFinish;
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
	onFinish: onFinish;
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
