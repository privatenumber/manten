import { setTimeout } from 'timers/promises';
import { test } from '../../dist/index.js';

test('A', async () => {
	await setTimeout(30);
});

test('B', async () => {
	await setTimeout(10);
});

test('C', async () => {
	await setTimeout(20);
});
