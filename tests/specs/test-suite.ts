// import { setTimeout } from 'timers/promises';
import { testSuite } from '#manten';

const setTimeout = (duration: number) => new Promise((resolve) => {
	global.setTimeout(resolve, duration);
});

export default testSuite(({ describe, test }) => {
	describe('Test suite - Group', ({ test }) => {
		test('A', async () => {
			await setTimeout(10);
		});

		test('B', async () => {
			await setTimeout(20);
		});
	});

	describe('Test suite - Group Async', async ({ test }) => {
		await test('C', async () => {
			await setTimeout(30);
		});

		await test('D', async () => {
			await setTimeout(30);
		});
	});

	test('Test suite - E', async () => {
		await setTimeout(70);
	});
});
