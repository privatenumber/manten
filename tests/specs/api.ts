import { createFixture } from 'fs-fixture';
import { installManten, node } from '../utils/spec-helpers.js';
import { describe, test, expect } from 'manten';

describe('api', () => {
	test('Should prevent console.log hijack', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			const noop = () => {};
			console.log = noop;
			test('should log', noop);
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('✔ should log');
		expect(testProcess.stdout).toMatch('1 passed');
		expect(testProcess.stdout).not.toMatch('failed');
	});

	test('describe should error', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe } from 'manten';

			const noop = () => {};

			console.log = noop;
			console.error = noop;

			describe('should fail', () => {
				throw new Error('Error');
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('Error: Error');
	});

	test('Failures should exit with 1', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, expect } from 'manten';

			test('should fail', () => {
				expect(1).toBe(2);
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('Expected: 2');
		expect(testProcess.stderr).not.toMatch('matcherResult:');
		expect(testProcess.stdout).toMatch('0 passed\n1 failed');
	});
});
