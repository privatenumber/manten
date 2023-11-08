import { setTimeout } from '../utils/set-timeout.js';
import { testSuite } from '#manten';

export default testSuite(({ describe, test }) => {
	describe('Test suite 2', ({ test }) => {
		test('Test', async () => {
			await setTimeout(70);
		});
	});
});
