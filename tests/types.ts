import { expectTypeOf } from 'expect-type';
import { describe, test, testSuite } from '#manten';

expectTypeOf(
	testSuite((_context, _a: string, _b: number, _c: 'hello') => 1234),
).toEqualTypeOf<(_a: string, _b: number, _c: 'hello') => number>();

// Verify describe skip() returns void
describe('type check', ({ skip }) => {
	const result = skip('test');
	expectTypeOf(result).toBeVoid();
});

// Verify test skip() returns never
test('type check', ({ skip }) => {
	const result = skip('test');
	expectTypeOf(result).toBeNever();
});
