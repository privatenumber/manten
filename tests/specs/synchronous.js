import { test } from '../../dist/index.js';

test('Async', async () => {
	console.log('a');
});

test('B', () => {
	console.log('b');
});

test('C', () => {
	console.log('c');
});
