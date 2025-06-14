import { setTimeout } from '../utils/set-timeout.js';
import { test, describe } from '#manten';

(async () => {
	await test('should fail', async () => {
		await setTimeout(10);
	}, 1);

	await describe('timeout to be cleaned up from event loop', ({ test }) => {
		test(
			'on pass',
			() => {},
			5000,
		);

		test(
			'on fail',
			async () => {
				throw new Error('catch me');
			},
			5000,
		);
	});
})();
