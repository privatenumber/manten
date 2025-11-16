import { expectTypeOf } from 'expect-type';
import { testSuite } from '#manten';

expectTypeOf(
	testSuite((_context, _a: string, _b: number, _c: 'hello') => 1234),
).toEqualTypeOf<(_a: string, _b: number, _c: 'hello') => number>();
