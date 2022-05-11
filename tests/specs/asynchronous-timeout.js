import { setTimeout } from 'timers/promises';
import { test } from '../../dist/index.js';

(async () => {
	await test('should fail', async () => {
		await setTimeout(10);
	}, 1);
})();
