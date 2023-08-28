import type {
	TestSuiteCallback,
	TestSuite,
} from './types.js';
import { createContext } from './create-context.js';

const defaultContext = createContext();

export function testSuite<
	Callback extends TestSuiteCallback,
>(
	callback: Callback,
): TestSuite<Callback> {
	return async function (...callbackArgs) {
		const context = this || defaultContext;
		await callback(
			context,
			...callbackArgs,
		);
	};
}
