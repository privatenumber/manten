import { createFixture } from 'fs-fixture';
import { installManten, node } from '../utils/spec-helpers.js';
import { testSuite, expect } from 'manten';

export default testSuite('nesting', ({ test }) => {
	test('deep context nesting', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe } from 'manten';

			await describe('Level 1', async ({ test, describe }) => {
				test('Test at level 1', () => {});

				await describe('Level 2', async ({ test, describe }) => {
					test('Test at level 2', () => {});

					await describe('Level 3', async ({ test, describe }) => {
						test('Test at level 3', () => {});

						await describe('Level 4', ({ test }) => {
							test('Test at level 4', () => {});
						});
					});
				});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('✔ Level 1 › Test at level 1');
		expect(testProcess.stdout).toMatch('✔ Level 1 › Level 2 › Test at level 2');
		expect(testProcess.stdout).toMatch('✔ Level 1 › Level 2 › Level 3 › Test at level 3');
		expect(testProcess.stdout).toMatch('✔ Level 1 › Level 2 › Level 3 › Level 4 › Test at level 4');
		expect(testProcess.stdout).toMatch('4 passed');
	});
});
