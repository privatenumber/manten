import { setTimeout } from '../utils/set-timeout.js';
import { test, describe } from '#manten';

(async () => {
	await test('A', async () => {
		await setTimeout(10);
	});

	await describe('Group', ({ test }) => {
		test('B', async () => {
			await setTimeout(10);
		});

		test('B', async () => {
			await setTimeout(10);
		});
	});

	await describe('Group - async', async ({ test, runTestSuite }) => {
		await test('C', async () => {
			await setTimeout(10);
		});

		await runTestSuite(import('./test-suite.js'), 'hello world');

		await test('D', async () => {
			await setTimeout(10);
		});
	});

	await test('E', async () => {
		await setTimeout(10);
	});
})();
