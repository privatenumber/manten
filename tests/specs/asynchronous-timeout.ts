import { setTimeout } from 'timers/promises';
import { test } from '#manten';

(async () => {
	await test('should fail', async () => {
		await setTimeout(10);
	}, 1);

	await test(
		'timeout checker should be cleaned up from event loop',
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		() => {},
		10_000,
	);
})();
