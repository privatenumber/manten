import {
	createContext,
	type Context,
	type ContextApi,
} from './context.js';

const defaultContext = createContext();

export type TestSuiteCallback<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	T extends unknown[] = any[],
	ReturnType = unknown,
> = (
	api: ContextApi,
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
	Callback extends TestSuiteCallback,
> = (
	this: void | Context,
	...callbackArgs: InferCallback<Callback>['args']
) => InferCallback<Callback>['returnType'];

type TestSuiteFunction = {
	<Callback extends TestSuiteCallback>(
		name: string,
		callback: Callback,
		options?: {
			parallel?: boolean | number | 'auto';
		},
	): TestSuite<Callback>;

	<Callback extends TestSuiteCallback>(
		callback: Callback,
	): TestSuite<Callback>;
};

export const testSuite: TestSuiteFunction = <Callback extends TestSuiteCallback>(
	nameOrCallback: string | Callback,
	maybeCallback?: Callback,
	maybeOptions?: {
		parallel?: boolean | number | 'auto';
	},
): TestSuite<Callback> => {
	const name = typeof nameOrCallback === 'string' ? nameOrCallback : undefined;
	const callback = typeof nameOrCallback === 'string' ? maybeCallback! : nameOrCallback;
	const options = typeof nameOrCallback === 'string' ? maybeOptions : undefined;

	return async function testSuiteWrapper(...callbackArgs) {
		const context = this || defaultContext;

		if (name) {
			await context.api.describe(name, api => callback(api, ...callbackArgs), options);
		} else {
			await callback(
				context.api,
				...callbackArgs,
			);
		}
	};
};
