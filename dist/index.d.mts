export { expect } from 'expect';

type InferCallback<T extends (...args: any) => any> = (T extends (context: any, ...args: infer Args) => infer ReturnType ? {
    args: Args;
    returnType: ReturnType;
} : never);
type TestSuiteCallback<T extends any[], ReturnType> = (context: Context, ...args: T) => ReturnType;
type TestSuite<Callback extends (...args: any) => any> = (this: void | Context, ...callbackArgs: InferCallback<Callback>['args']) => InferCallback<Callback>['returnType'];
type ModuleDefaultExport<defaultExport> = {
    default: defaultExport;
} | {
    default: {
        default: defaultExport;
    };
};
type RunTestSuite = <Callback extends TestSuiteCallback<any[], any>>(testSuite: TestSuite<Callback> | Promise<ModuleDefaultExport<TestSuite<Callback>>>, ...args: InferCallback<Callback>['args']) => InferCallback<Callback>['returnType'];
type onTestFailCallback = (error: Error) => void;
type TestApi = {
    onTestFail: (callback: onTestFailCallback) => void;
};
type TestFunction = (api: TestApi) => void;
type Test = (title: string, testFunction: TestFunction, timeout?: number) => Promise<void>;
type Describe = (description: string, callback: (context: Context) => void) => Promise<void>;
type Context = {
    describe: Describe;
    test: Test;
    runTestSuite: RunTestSuite;
};

declare const test: Test;
declare const describe: Describe;

declare function testSuite<Callback extends TestSuiteCallback<any[], any>>(callback: Callback): TestSuite<Callback>;

export { Context, Describe, Test, TestSuite, describe, test, testSuite };
