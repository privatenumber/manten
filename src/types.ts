import type { ContextCallback } from './create-context.js';

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

export type Describe = (
	description: string,
	callback: ContextCallback,
) => Promise<void>;

export type TestMeta = {
	title: string;
	testFunction: TestFunction;
	timeout?: number;
	startTime?: number;
	endTime?: number;
	error?: Error;
};
