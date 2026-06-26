import { createFixture } from 'fs-fixture';
import { installManten, node } from '../utils/spec-helpers.ts';
import { isBun } from '../utils/runtime.ts';
import {
	describe, test, expect, skip,
} from 'manten';

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

		expect('exitCode' in testProcess).toBe(false);
		expect(testProcess.stdout).toMatch('✔ Level 1 › Test at level 1');
		expect(testProcess.stdout).toMatch('✔ Level 1 › Level 2 › Test at level 2');
		expect(testProcess.stdout).toMatch('✔ Level 1 › Level 2 › Level 3 › Test at level 3');
		expect(testProcess.stdout).toMatch('✔ Level 1 › Level 2 › Level 3 › Level 4 › Test at level 4');
		expect(testProcess.stdout).toMatch('4 passed');
	});

	test('nests tests from dynamically imported files', async () => {
		// Cross-file nesting relies on the imported file's test()/describe()
		// running within the parent's AsyncLocalStorage context. Bun does not
		// propagate ALS across dynamic import(), so children are flattened to the
		// root instead of nesting under the parent. The static/parameterized
		// pattern (export a function wrapping describe()) works on both runtimes.
		if (isBun) {
			skip('Bun drops AsyncLocalStorage across dynamic import()');
		}

		await using fixture = await createFixture({
			'child.mjs': `
			import { test } from 'manten';

			test('imported test', () => {});
			`,
			'index.mjs': `
			import { describe } from 'manten';

			await describe('Parent', async () => {
				await import('./child.mjs');
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect('exitCode' in testProcess).toBe(false);
		expect(testProcess.stdout).toMatch('✔ Parent › imported test');
		expect(testProcess.stdout).toMatch('1 passed');
	});
});
