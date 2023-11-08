export { expect } from 'expect';

type TestSuiteCallback<T extends unknown[] = any[], ReturnType = unknown> = (api: ContextApi, ...args: T) => ReturnType;
type InferCallback<T extends TestSuiteCallback> = (T extends TestSuiteCallback<infer Args, infer ReturnType> ? {
    args: Args;
    returnType: ReturnType;
} : never);
type TestSuite<Callback extends TestSuiteCallback> = (this: void | Context, ...callbackArgs: InferCallback<Callback>['args']) => InferCallback<Callback>['returnType'];
declare const testSuite: <Callback extends TestSuiteCallback<any[], unknown>>(callback: Callback) => TestSuite<Callback>;

type ModuleDefaultExport<defaultExport> = {
    default: defaultExport;
} | {
    default: {
        default: defaultExport;
    };
};
type RunTestSuite = <Callback extends TestSuiteCallback>(testSuite: TestSuite<Callback> | Promise<ModuleDefaultExport<TestSuite<Callback>>>, ...args: InferCallback<Callback>['args']) => InferCallback<Callback>['returnType'];

type ContextCallback = (api: ContextApi) => void;
type ContextApi = {
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
    run: (callback: ContextCallback, parentContext?: Context) => Promise<void>;
};

type Callback = () => void;
type onFinish = (callback: Callback) => void;
type onTestFailCallback = (error: Error) => void;
type TestApi = {
    onTestFail: (callback: onTestFailCallback) => void;
    onTestFinish: onFinish;
};
type TestFunction = (api: TestApi) => void;
type Test = (title: string, testFunction: TestFunction, timeout?: number) => Promise<void>;
type Describe = (description: string, callback: ContextCallback) => Promise<void>;

declare const test: Test;
declare const describe: Describe;
declare const runTestSuite: RunTestSuite;

export { Context, Describe, Test, TestSuite, describe, runTestSuite, test, testSuite };
