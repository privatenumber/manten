import { setTimeout } from '../utils/set-timeout';
import { test } from '#manten';

test('A', async () => {
	await setTimeout(30);
});

test('B', async () => {
	await setTimeout(10);
});

test('C', async () => {
	await setTimeout(20);
});
