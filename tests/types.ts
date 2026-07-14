import { expectTypeOf } from 'expect-type';
import { describe, test, skip } from '#manten';

describe('skip return type in describe', () => {
	const result = skip('test');
	expectTypeOf(result).toBeVoid();
});

test('skip return type in test', () => {
	const result = skip('test');
	expectTypeOf(result).toBeVoid();
});

describe('describe callback context', ({ signal }) => {
	expectTypeOf(signal).toEqualTypeOf<AbortSignal>();
});

test('test callback context', ({ signal }) => {
	expectTypeOf(signal).toEqualTypeOf<AbortSignal>();
});
