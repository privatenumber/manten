export { expect } from 'expect';

type TestSuiteCallback<T extends unknown[] = any[], ReturnType = unknown> = (api: ContextApi, ...args: T) => ReturnType;
type InferCallback<T extends TestSuiteCallback> = (T extends TestSuiteCallback<infer Args, infer ReturnType> ? {
    args: Args;
    returnType: ReturnType;
} : never);
type TestSuite<Callback extends TestSuiteCallback> = (this: void | Context, ...callbackArgs: InferCallback<Callback>['args']) => InferCallback<Callback>['returnType'];
type TestSuiteFunction = {
    <Callback extends TestSuiteCallback>(name: string, callback: Callback, options?: DescribeOptions): TestSuite<Callback>;
    <Callback extends TestSuiteCallback>(callback: Callback): TestSuite<Callback>;
};
declare const testSuite: TestSuiteFunction;

type ModuleDefaultExport<defaultExport> = {
    default: defaultExport;
} | {
    default: {
        default: defaultExport;
    };
};

type ContextCallback = (api: ContextApi) => void;
type RunTestSuite = <SuiteCallback extends TestSuiteCallback>(testSuite: TestSuite<SuiteCallback> | Promise<ModuleDefaultExport<TestSuite<SuiteCallback>>>, ...args: InferCallback<SuiteCallback>['args']) => InferCallback<SuiteCallback>['returnType'];
type ContextApi = {
    signal: AbortSignal;
    describe: Describe;
    test: Test;
    runTestSuite: RunTestSuite;
    onFinish: onFinish;
};
type Context = {
    api: ContextApi;
    pendingTests: Promise<unknown>[];
    callbacks: {
        onFinish: Callback[];
    };
    concurrencyLimiter?: {
        acquire: () => Promise<() => void>;
        setLimit: (newLimit: number) => void;
        cleanup: () => void;
    };
    abortController: AbortController;
    timeout?: number;
    run: (callback: ContextCallback, parentContext?: Context) => Promise<void>;
};
declare const topLevelTest: Test;
declare const topLevelDescribe: Describe;
declare const topLevelRunTestSuite: RunTestSuite;

type Callback = () => void | Promise<void>;
type onFinish = (callback: Callback) => void;
type onTestFailCallback = (error: unknown) => void;
type TestApi = {
    signal: AbortSignal;
    onTestFail: (callback: onTestFailCallback) => void;
    onTestFinish: onFinish;
};
type TestFunction = (api: TestApi) => void | Promise<void>;
type Test = (title: string, testFunction: TestFunction, timeoutOrOptions?: number | {
    timeout?: number;
    retry?: number;
}) => Promise<void>;
type DescribeOptions = {
    parallel?: boolean | number | 'auto';
    timeout?: number;
};
type Describe = (description: string, callback: ContextCallback, options?: DescribeOptions) => Promise<void>;

declare const setProcessTimeout: (ms: number) => void;

export { topLevelDescribe as describe, topLevelRunTestSuite as runTestSuite, setProcessTimeout, topLevelTest as test, testSuite };
export type { Context, Describe, Test, TestSuite };
