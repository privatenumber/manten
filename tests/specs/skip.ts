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

		expect(testProcess.exitCode).toBe(1); // Should exit with 1 due to the failing test
		expect(testProcess.stdout).toMatch('○ should skip');
		expect(testProcess.stdout).toMatch('✔ should pass');
		expect(testProcess.stdout).toMatch('1 passed');
		expect(testProcess.stdout).toMatch('1 failed');
		expect(testProcess.stdout).toMatch('1 skipped');
	});
});
