import { createFixture } from 'fs-fixture';
import { installManten, node } from '../utils/spec-helpers.ts';
import {
	describe, test, expect, onTestFail,
} from 'manten';

describe('retry', () => {
	test('retry', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe, test } from 'manten';

			describe('retry', () => {
				{
					let count = 0;
					test('should fail 5 times', () => {
						count += 1;
						throw new Error(\`should fail \${count}\`);
					}, {
						retry: 5,
					});
				}

				{
					let count = 0;
					test('should pass on 3rd try', () => {
						count += 1;
						if (count !== 3) {
							throw new Error(\`should pass \${count}\`);
						}
					}, {
						retry: 5,
					});
				}
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		const output = testProcess.stdout + testProcess.stderr;
		expect(output).toMatch('✖ retry › should fail 5 times (5/5)');
		expect(output).toMatch('✖ retry › should pass on 3rd try (2/5)');
		expect(output).toMatch('✔ retry › should pass on 3rd try (3/5)');
		expect(output).not.toMatch('retry › should pass on 3rd try (4/5)');

		expect(testProcess.stdout).toMatch('1 passed');
		expect(testProcess.stdout).toMatch('1 failed');
	});

	test('retry with timeout interaction', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe, test } from 'manten';

			describe('retry with timeout', () => {
				let attempt = 0;

				test('should retry timed-out tests', async () => {
					attempt += 1;

					if (attempt < 3) {
						// First two attempts: hang forever to force timeout
						await new Promise(() => {});
					}
					// Third attempt: complete immediately
				}, {
					retry: 3,
					timeout: 50,
				});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stderr).toMatch('Timeout: 50ms');
		expect(testProcess.stdout).toMatch('(3/3)');
		expect(testProcess.stdout).toMatch('1 passed');
	});
});
