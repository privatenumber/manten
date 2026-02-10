import { serialize } from '../../src/snapshot/snapshots.js';
import { describe, test, expect } from 'manten';

describe('snapshots serialize', () => {
	test('sorts object keys', () => {
		expect(serialize({
			z: 1,
			a: 2,
			m: 3,
		})).toBe('{ a: 2, m: 3, z: 1 }');
	});

	test('sorts nested object keys', () => {
		expect(serialize({
			z: {
				b: 1,
				a: 2,
			},
			a: 1,
		})).toBe('{ a: 1, z: { a: 2, b: 1 } }');
	});

	test('quotes strings', () => {
		expect(serialize('hello')).toBe("'hello'");
		expect(serialize('hello world')).toBe("'hello world'");
	});

	test('handles arrays', () => {
		expect(serialize([1, 2, 3])).toBe('[ 1, 2, 3 ]');
		expect(serialize(['a', 'b'])).toBe("[ 'a', 'b' ]");
	});

	test('handles nested arrays', () => {
		expect(serialize([[1, 2], [3, 4]])).toBe('[ [ 1, 2 ], [ 3, 4 ] ]');
	});

	test('handles sparse arrays', () => {
		// eslint-disable-next-line no-sparse-arrays
		expect(serialize([1, , 3])).toBe('[ 1, <1 empty item>, 3 ]');
	});

	test('handles null and undefined', () => {
		expect(serialize(null)).toBe('null');
		expect(serialize(undefined)).toBe('undefined');
	});

	test('handles numbers', () => {
		expect(serialize(42)).toBe('42');
		expect(serialize(3.14)).toBe('3.14');
		expect(serialize(-0)).toBe('-0');
		expect(serialize(Number.NaN)).toBe('NaN');
		expect(serialize(Infinity)).toBe('Infinity');
		expect(serialize(-Infinity)).toBe('-Infinity');
	});

	test('handles booleans', () => {
		expect(serialize(true)).toBe('true');
		expect(serialize(false)).toBe('false');
	});

	test('handles BigInt', () => {
		expect(serialize(123n)).toBe('123n');
		expect(serialize(9_007_199_254_740_993n)).toBe('9007199254740993n');
	});

	test('handles Date', () => {
		expect(serialize(new Date('2024-01-15T12:00:00.000Z'))).toBe('2024-01-15T12:00:00.000Z');
	});

	test('handles RegExp', () => {
		expect(serialize(/foo/)).toBe('/foo/');
		expect(serialize(/bar/gi)).toBe('/bar/gi');
	});

	test('handles Map with sorted keys', () => {
		expect(serialize(new Map([['z', 1], ['a', 2]]))).toBe("Map(2) { 'a' => 2, 'z' => 1 }");
	});

	test('handles Set with sorted values', () => {
		expect(serialize(new Set([3, 1, 2]))).toBe('Set(3) { 1, 2, 3 }');
	});

	test('handles circular references', () => {
		const object: Record<string, unknown> = { a: 1 };
		object.self = object;
		expect(serialize(object)).toBe('<ref *1> { a: 1, self: [Circular *1] }');
	});

	test('handles functions', () => {
		const function_ = () => {};
		expect(serialize(function_)).toBe('[Function: function_]');

		const arrow = () => {};
		expect(serialize(arrow)).toBe('[Function: arrow]');
	});

	test('handles Symbol', () => {
		expect(serialize(Symbol('test'))).toBe('Symbol(test)');
		expect(serialize(Symbol.for('global'))).toBe('Symbol(global)');
	});

	test('handles Error', () => {
		// Error includes stack trace which varies by environment
		const result = serialize(new Error('test message'));
		expect(result).toMatch(/^Error: test message\n\s+at /);
	});

	test('handles Buffer', () => {
		expect(serialize(Buffer.from([1, 2, 3]))).toBe('<Buffer 01 02 03>');
	});

	test('handles TypedArrays', () => {
		expect(serialize(new Uint8Array([1, 2, 3]))).toBe('Uint8Array(3) [ 1, 2, 3 ]');
	});

	test('handles deeply nested structures', () => {
		expect(serialize({ a: { b: { c: { d: { e: 'deep' } } } } })).toBe(
			"{\n  a: {\n    b: { c: { d: { e: 'deep' } } }\n  }\n}",
		);
	});

	test('handles mixed complex structure', () => {
		const complex = {
			string: 'hello',
			number: 42,
			array: [1, 2],
			nested: {
				z: 1,
				a: 2,
			},
		};
		expect(serialize(complex)).toBe(
			"{\n  array: [ 1, 2 ],\n  nested: { a: 2, z: 1 },\n  number: 42,\n  string: 'hello'\n}",
		);
	});

	test('does not truncate large arrays (maxArrayLength: Infinity)', () => {
		// Default maxArrayLength is 100, we want to ensure arrays > 100 are not truncated
		const largeArray = Array.from({ length: 150 }, (_, i) => i);
		const result = serialize(largeArray);

		// Should NOT contain truncation message
		expect(result).not.toContain('... 50 more items');

		// Should contain all elements including the last ones
		expect(result).toContain('149');
		expect(result).toContain('148');
	});

	test('does not truncate large Sets (maxArrayLength: Infinity)', () => {
		const largeSet = new Set(Array.from({ length: 150 }, (_, i) => i));
		const result = serialize(largeSet);

		expect(result).not.toContain('... 50 more items');
		expect(result).toContain('149');
	});

	test('does not truncate large Maps (maxArrayLength: Infinity)', () => {
		const largeMap = new Map(Array.from({ length: 150 }, (_, i) => [`key${i}`, i]));
		const result = serialize(largeMap);

		expect(result).not.toContain('... 50 more items');
		expect(result).toContain('key149');
	});

	test('does not truncate long strings (maxStringLength: Infinity)', () => {
		// Default maxStringLength is 10000, we want to ensure longer strings are not truncated
		const longString = 'a'.repeat(15_000);
		const result = serialize(longString);

		// Should NOT contain truncation indicator
		expect(result).not.toContain('... 5000 more characters');

		// Length should be full string + quotes
		expect(result).toBe(`'${'a'.repeat(15_000)}'`);
	});
});
