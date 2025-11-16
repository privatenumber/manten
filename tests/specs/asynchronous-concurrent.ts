import { setTimeout } from '../utils/set-timeout.js';
import { test } from '#manten';

// Using larger time differences to avoid timing flakiness
// Tests should complete in order: B (50ms), C (150ms), A (300ms)
test('A', async () => {
	await setTimeout(300);
});

test('B', async () => {
	await setTimeout(50);
});

test('C', async () => {
	await setTimeout(150);
});
