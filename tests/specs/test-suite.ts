import { expectTypeOf } from 'expect-type';
import { setTimeout } from '../utils/set-timeout.js';
import { testSuite, expect } from '#manten';

export default testSuite(({ describe, test, runTestSuite }, value: string) => {
	expect<string>(value).toBe('hello world');

	// Type test: verify testSuite function signature
	expectTypeOf(testSuite((_context, _a: string, _b: number, _c: 'hello') => 1234))
		.toEqualTypeOf<(_a: string, _b: number, _c: 'hello') => number>();

	describe('Test suite - Group', ({ test }) => {
		test('A', async () => {
			await setTimeout(10);
		});

		test('B', async () => {
			await setTimeout(20);
		});
	});

	describe('Test suite - Group Async', async ({ test }) => {
		await test('C', async () => {
			await setTimeout(30);
		});

		await test('D', async () => {
			await setTimeout(30);
		});
	});

	test('Test suite - E', async () => {
		await setTimeout(70);
	});

	runTestSuite(import('./test-suite-2.js'));
});
