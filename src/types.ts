export type Callback = () => void | Promise<void>;

export type onTestFailCallback = (error: unknown) => void;

export type TestFunction = (api?: { signal: AbortSignal }) => void | Promise<void>;

export type Test = (
	title: string,
	testFunction: TestFunction,
	timeoutOrOptions?: number | {
		timeout?: number;
		retry?: number;
	},
) => Promise<void>;

export type DescribeCallback = (api?: { signal: AbortSignal }) => void | Promise<void>;

export type DescribeOptions = {
	parallel?: boolean | number | 'auto';
	timeout?: number;
};

export type Describe = (
	description: string,
	callback: DescribeCallback,
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
