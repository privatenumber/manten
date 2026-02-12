import { createFixture } from 'fs-fixture';
import { expectMatchInOrder } from '../utils/expect-match-in-order.ts';
import { installManten, node } from '../utils/spec-helpers.ts';
import { describe, test, expect } from 'manten';

describe('async', async () => {
	test('synchronous', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			test('Async', async () => {
				console.log('a');
			});

			test('B', () => {
				console.log('b');
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect('exitCode' in testProcess).toBe(false);
		expectMatchInOrder(testProcess.stdout, ['b', 'a']);
		expect(testProcess.stdout).toMatch('2 passed');
	});

	await describe('asynchronous', async () => {
		await test('sequential', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { test } from 'manten';
				import { setTimeout } from 'node:timers/promises';

				(async () => {
					await test('First test', async () => {
						await setTimeout(50);
					});

					await test('Second test', async () => {
						await setTimeout(50);
					});
				})();
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect('exitCode' in testProcess).toBe(false);
			expect(testProcess.stdout).toMatch('2 passed');
		});

		await test('concurrent', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { test } from 'manten';
				import { setTimeout } from 'node:timers/promises';

				test('Test A', async () => {
					await setTimeout(50);
					console.log('A');
				});

				test('Test B', async () => {
					await setTimeout(200);
					console.log('B');
				});

				test('Test C', async () => {
					await setTimeout(500);
					console.log('C');
				});
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect('exitCode' in testProcess).toBe(false);
			expectMatchInOrder(testProcess.stdout, ['A', 'B', 'C']);
			expect(testProcess.stdout).toMatch('3 passed');
		});

		await test('timeout', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { test } from 'manten';

				test('should timeout', async () => {
					// Hang forever - only way out is timeout
					await new Promise(() => {});
				}, 100);
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect('exitCode' in testProcess).toBe(true);
			expect(testProcess.stderr).toMatch('Error: Timeout: 100ms');
		});

		await test('timeout variations', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { test } from 'manten';

				test('timeout option', async () => {
					// Hang forever - only way out is timeout
					await new Promise(() => {});
				}, { timeout: 100 });

				test('no timeout', async () => {
					// Complete immediately
				});
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect('exitCode' in testProcess).toBe(true);
			expect(testProcess.stderr).toMatch('Error: Timeout: 100ms');
			expect(testProcess.stdout).toMatch('1 passed');
			expect(testProcess.stdout).toMatch('1 failed');
		});
	});
});
