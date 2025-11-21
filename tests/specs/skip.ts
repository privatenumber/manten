import { createFixture } from 'fs-fixture';
import { installManten, node } from '../utils/spec-helpers.js';
import { testSuite, expect } from 'manten';

export default testSuite('skip', ({ test }) => {
	test('should skip conditionally', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			test('should skip', ({ skip }) => {
				const someCondition = true;
				if (someCondition) {
					skip('reason why');
				}
				throw new Error('This should not execute');
			});

			test('should pass', () => {
				// Normal test
			});

			test('should fail', () => {
				throw new Error('fail');
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stdout).toMatch('○ should skip');
		expect(testProcess.stdout).toMatch('✔ should pass');
		expect(testProcess.stdout).toMatch('1 passed');
		expect(testProcess.stdout).toMatch('1 failed');
		expect(testProcess.stdout).toMatch('1 skipped');
	});

	test('should skip without reason', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			test('should skip no reason', ({ skip }) => {
				skip();
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('○ should skip no reason');
		expect(testProcess.stdout).toMatch('0 passed');
		expect(testProcess.stdout).toMatch('1 skipped');
	});

	test('should skip inside describe groups', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			await describe('Group A', async ({ test, describe }) => {
				test('nested skip', ({ skip }) => {
					skip('nested reason');
				});

				await describe('Group B', ({ test }) => {
					test('deeply nested skip', ({ skip }) => {
						skip();
					});
				});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('○ Group A › nested skip');
		expect(testProcess.stdout).toMatch('○ Group A › Group B › deeply nested skip');
		expect(testProcess.stdout).toMatch('0 passed');
		expect(testProcess.stdout).toMatch('2 skipped');
	});

	test('should run hooks for skipped tests', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			test('skip with hooks', ({ skip, onTestFinish }) => {
				console.log('before skip');
				onTestFinish(() => {
					console.log('cleanup ran');
				});
				skip('testing hooks');
				console.log('after skip should not run');
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('before skip');
		expect(testProcess.stdout).toMatch('cleanup ran');
		expect(testProcess.stdout).not.toMatch('after skip should not run');
		expect(testProcess.stdout).toMatch('○ skip with hooks');
		expect(testProcess.stdout).toMatch('1 skipped');
	});

	test('should not retry skipped tests', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			let attemptCount = 0;
			test('skip with retry', ({ skip }) => {
				attemptCount += 1;
				console.log('attempt:', attemptCount);
				skip('should not retry');
			}, { retry: 5 });
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('attempt: 1');
		expect(testProcess.stdout).not.toMatch('attempt: 2');
		expect(testProcess.stdout).toMatch('○ skip with retry');
		expect(testProcess.stdout).not.toMatch('(1/5)');
		expect(testProcess.stdout).toMatch('1 skipped');
	});

	test('should not trigger timeout for skipped tests', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			test('skip with timeout', ({ skip }) => {
				skip('immediate skip');
			}, 100);
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('○ skip with timeout');
		expect(testProcess.stdout).not.toMatch('Timeout');
		expect(testProcess.stdout).toMatch('1 skipped');
	});
});
