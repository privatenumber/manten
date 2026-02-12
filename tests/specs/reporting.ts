import { createFixture } from 'fs-fixture';
import { installManten, node } from '../utils/spec-helpers.ts';
import {
	describe, test, expect, onTestFail,
} from 'manten';

describe('reporting', () => {
	test('shows pending symbol for incomplete tests', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';
			import { setTimeout } from 'node:timers/promises';

			(async () => {
				test('incomplete test', async () => {
					// Hang forever - will be interrupted by process.exit
					await new Promise(() => {});
				});

				await setTimeout(10);
				process.exit(0);
			})();
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('• incomplete test');
		expect(testProcess.stdout).toMatch('1 pending');
	});

	test('report with only pending tests', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';
			import { setTimeout } from 'node:timers/promises';

			(async () => {
				test('pending 1', async () => {
					// Hang forever - will be interrupted by process.exit
					await new Promise(() => {});
				});

				test('pending 2', async () => {
					// Hang forever - will be interrupted by process.exit
					await new Promise(() => {});
				});

				await setTimeout(10);
				process.exit(0);
			})();
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('• pending 1');
		expect(testProcess.stdout).toMatch('• pending 2');
		expect(testProcess.stdout).toMatch('0 passed');
		expect(testProcess.stdout).toMatch('2 pending');
		expect(testProcess.stdout).not.toMatch('failed');
	});
});
