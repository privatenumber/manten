import { createFixture } from 'fs-fixture';
import { installManten, node } from '../utils/spec-helpers.ts';
import { describe, test, expect } from 'manten';

describe('nesting', () => {
	test('deep context nesting', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe, test } from 'manten';

			await describe('Level 1', async () => {
				test('Test at level 1', () => {});

				await describe('Level 2', async () => {
					test('Test at level 2', () => {});

					await describe('Level 3', async () => {
						test('Test at level 3', () => {});

						await describe('Level 4', () => {
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
