import { setTimeout } from 'timers/promises';
import { test } from '#manten';

(async () => {
	await test('should fail', async () => {
		await setTimeout(10);
	}, 1);
})();
