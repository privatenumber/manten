import { expectTypeOf } from 'expect-type';
import { describe, test, skip } from '#manten';

// Verify describe callback receives optional { signal }
describe('type check', () => {
	const result = skip('test');
	expectTypeOf(result).toBeVoid();
});

// Verify test callback receives optional { signal }
test('type check', () => {
	const result = skip('test');
	expectTypeOf(result).toBeVoid();
});
