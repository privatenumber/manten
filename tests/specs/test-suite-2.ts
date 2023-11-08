import { setTimeout } from '../utils/set-timeout.js';
import { testSuite, expect } from '#manten';

export default testSuite(({ test }) => {
	test('Test suite 2', async () => {
		await setTimeout(70);
	});
});
