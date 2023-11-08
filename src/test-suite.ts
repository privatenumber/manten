import type {
	DescribeApi,
	Context,
} from './types.js';
import { createContext } from './create-context.js';

const defaultContext = createContext();

export type TestSuiteCallback<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	T extends unknown[] = any[],
	ReturnType = unknown,
> = (
	api: DescribeApi,
	...args: T
) => ReturnType;

export type InferCallback<
	T extends TestSuiteCallback,
> = (
	T extends TestSuiteCallback<infer Args, infer ReturnType>
		? {
			args: Args;
			returnType: ReturnType;
		}
		: never
);

export type TestSuite<
	Callback extends TestSuiteCallback
> = (
	this: void | Context,
	...callbackArgs: InferCallback<Callback>['args']
) => InferCallback<Callback>['returnType'];

export const testSuite = <
	Callback extends TestSuiteCallback,
>(
		callback: Callback,
	): TestSuite<Callback> => (
		async function (...callbackArgs) {
			const context = this || defaultContext;
			await callback(
				context.api,
				...callbackArgs,
			);
		}
	);
