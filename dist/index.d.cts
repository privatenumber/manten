export { expect } from 'expect';

type TestSuiteCallback<T extends any[] = any[], ReturnType = unknown> = (context: Context, ...args: T) => ReturnType;
type InferCallback<T extends TestSuiteCallback> = (T extends TestSuiteCallback<infer Args, infer ReturnType> ? {
    args: Args;
    returnType: ReturnType;
} : never);
type TestSuite<Callback extends TestSuiteCallback> = (this: void | Context, ...callbackArgs: InferCallback<Callback>['args']) => InferCallback<Callback>['returnType'];
type ModuleDefaultExport<defaultExport> = {
    default: defaultExport;
} | {
    default: {
        default: defaultExport;
    };
};
type RunTestSuite = <Callback extends TestSuiteCallback>(testSuite: TestSuite<Callback> | Promise<ModuleDefaultExport<TestSuite<Callback>>>, ...args: InferCallback<Callback>['args']) => InferCallback<Callback>['returnType'];
type Callback = () => void;
type onTestFailCallback = (error: Error) => void;
type TestApi = {
    onTestFail: (callback: onTestFailCallback) => void;
    onTestFinish: (callback: Callback) => void;
};
type TestFunction = (api: TestApi) => void;
type Test = (title: string, testFunction: TestFunction, timeout?: number) => Promise<void>;
type Describe = (description: string, callback: (context: Context) => void) => Promise<void>;
type Context = {
    describe: Describe;
    test: Test;
    runTestSuite: RunTestSuite;
    onFinish: (callback: Callback) => void;
    pendingTests: PendingTests;
    callbacks: {
        onFinish: Callback[];
    };
};
type PendingTests = Promise<unknown>[];

declare const test: Test;
declare const describe: Describe;

declare function testSuite<Callback extends TestSuiteCallback>(callback: Callback): TestSuite<Callback>;

export { Context, Describe, Test, TestSuite, describe, test, testSuite };
