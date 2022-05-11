export { default as expect } from 'expect';

declare type InferCallback<T extends (...args: any) => any> = (T extends (context: any, ...args: infer Args) => infer ReturnType ? {
    args: Args;
    returnType: ReturnType;
} : never);
declare type TestSuiteCallback<T extends any[], ReturnType> = (context: Context, ...args: T) => ReturnType;
declare type TestSuite<Callback extends (...args: any) => any> = (this: void | Context, ...callbackArgs: InferCallback<Callback>['args']) => InferCallback<Callback>['returnType'];
declare type ModuleDefaultExport<defaultExport> = {
    default: defaultExport;
};
declare type RunTestSuite = <Callback extends TestSuiteCallback<any[], any>>(testSuite: TestSuite<Callback> | Promise<ModuleDefaultExport<TestSuite<Callback>>>, ...args: InferCallback<Callback>['args']) => InferCallback<Callback>['returnType'];
declare type Test = (title: string, testFunction: () => void) => Promise<void>;
declare type Describe = (description: string, callback: (context: Context) => void) => Promise<void>;
declare type Context = {
    describe: Describe;
    test: Test;
    runTestSuite: RunTestSuite;
};

declare const test: Test;
declare const describe: Describe;

declare function testSuite<Callback extends TestSuiteCallback<any[], any>>(callback: Callback): TestSuite<Callback>;

export { Context, Describe, Test, TestSuite, describe, test, testSuite };
