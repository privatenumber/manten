import { createFixture } from 'fs-fixture';
import { installManten, node } from '../utils/spec-helpers.ts';
import {
	describe, test, expect, onTestFail,
} from 'manten';

describe('setProcessTimeout', () => {
	test('kills process and reports pending tests', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, setProcessTimeout } from 'manten';

			// Keep event loop alive
			const keepAlive = setInterval(() => {}, 1000);

			setProcessTimeout(100);

			test('hanging test', async () => {
				console.log('TEST_STARTED');
				await new Promise(() => {});
			});

			test('another hanging test', async () => {
				console.log('TEST2_STARTED');
				await new Promise(() => {});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		// Process timeout message should appear
		expect(testProcess.stderr).toMatch('✖ Process timed out after 100ms');
		// Pending tests should be reported with • symbol
		expect(testProcess.stdout).toMatch('• hanging test');
		expect(testProcess.stdout).toMatch('• another hanging test');
		// Summary should show pending count
		expect(testProcess.stdout).toMatch('2 pending');
	});

	test('does not prevent early exit on success', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, setProcessTimeout } from 'manten';

			// Set a long timeout
			setProcessTimeout(5000);

			test('fast test', async () => {
				// Complete immediately
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		// No timeout message
		expect(testProcess.stderr).not.toMatch('Process timed out');
		// Test completed successfully
		expect(testProcess.stdout).toMatch('✔ fast test');
		expect(testProcess.stdout).toMatch('1 passed');
	});
});
