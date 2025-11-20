import { test } from '#manten';

test('should skip', ({ skip }) => {
	const someCondition = true;
	if (someCondition) {
		skip('reason why');
	}

	// This should not run
	throw new Error('This should not execute');
});

test('should pass', () => {
	// Normal test
});

test('should fail', () => {
	throw new Error('fail');
});
