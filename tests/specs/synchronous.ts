import { test } from '#manten';

test('Async', async () => {
	console.log('a');
});

test('B', () => {
	console.log('b');
});

test('C', () => {
	console.log('c');
});
