import { expectTypeOf } from 'expect-type';
import { describe, testSuite } from '#manten';

expectTypeOf(
	testSuite((_context, _a: string, _b: number, _c: 'hello') => 1234),
).toEqualTypeOf<(_a: string, _b: number, _c: 'hello') => number>();

// Verify skip() return type
describe('type check', ({ skip }) => {
	// skip() returns void
	const result = skip('test');
	expectTypeOf(result).toBeVoid();
});
