import { test, describe } from '#manten';

test('Test A', () => {
	console.log('Test A ran');
});

test('Test B', () => {
	console.log('Test B ran');
});

describe('Group', ({ test }) => {
	test('Test C', () => {
		console.log('Group Test C ran');
	});

	test('Another Test', () => {
		console.log('Group Another Test ran');
	});
});

test('Special [chars]', () => {
	console.log('Special chars ran');
});
