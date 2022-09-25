import { setTimeout } from 'timers/promises';
import { test, describe } from '#manten';

(async () => {
	await test('should fail', async () => {
		await setTimeout(10);
	}, 1);

	await describe('timeout to be cleaned up from event loop', ({ test }) => {
		test(
			'on pass',
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			() => {},
			5000,
		);

		test(
			'on fail',
			async () => {
				throw new Error('1');
			},
			5000,
		);
	});
})();
