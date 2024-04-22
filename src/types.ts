import type { ContextCallback } from './create-context.js';

export type Callback = () => void;

export type onFinish = (callback: Callback) => void;

export type onTestFailCallback = (error: unknown) => void;
export type TestApi = {
	onTestFail: (callback: onTestFailCallback) => void;
	onTestFinish: onFinish;
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

export type Describe = (
	description: string,
	callback: ContextCallback,
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
};
