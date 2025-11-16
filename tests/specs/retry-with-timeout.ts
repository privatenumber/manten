import { setTimeout } from '../utils/set-timeout.js';
import { describe } from '#manten';

describe('retry with timeout', ({ test }) => {
	let attempt = 0;

	test('should retry timed-out tests', async () => {
		attempt += 1;

		if (attempt < 3) {
			// First two attempts: timeout
			await setTimeout(100);
		}
		// Third attempt: complete quickly
		await setTimeout(5);
	}, {
		retry: 3,
		timeout: 50,
	});
});
