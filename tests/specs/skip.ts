import { test } from '#manten';

test('should skip', () => {
	return { skip: true };
});

test('should pass', () => {
	// Normal test
});

test('should fail', () => {
	throw new Error('fail');
});
