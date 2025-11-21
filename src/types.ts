import type { ContextCallback } from './context.js';

export type Callback = () => void | Promise<void>;

export type onFinish = (callback: Callback) => void;

export type onTestFailCallback = (error: unknown) => void;
export type TestApi = {
	signal: AbortSignal;
	onTestFail: (callback: onTestFailCallback) => void;
	onTestFinish: onFinish;
	skip: (reason?: string) => never;
};

type TestFunction = (api: TestApi) => void | Promise<void>;

export type Test = (
	title: string,
	testFunction: TestFunction,
	timeoutOrOptions?: number | {
		timeout?: number;
		retry?: number;
	},
) => Promise<void>;

export type DescribeOptions = {
	parallel?: boolean | number | 'auto';
	timeout?: number;
};

export type Describe = (
	description: string,
	callback: ContextCallback,
	options?: DescribeOptions,
) => Promise<void>;

export type TestMeta = {
	title: string;
	testFunction: TestFunction;
	timeout?: number;
	retry: number;
	attempt?: number;
	startTime?: number;
	endTime?: number;
	error?: unknown;
	skip?: boolean;
	skipReason?: string;
};
