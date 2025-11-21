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

	test('should skip entire describe block', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			await describe('GPU tests', ({ test, skip }) => {
				const hasGPU = false;
				if (!hasGPU) {
					skip('GPU not available');
				}

				test('render shader', () => {
					console.log('This should not execute');
				});

				test('compute pipeline', () => {
					console.log('This should not execute');
				});

				test('texture sampling', () => {
					console.log('This should not execute');
				});
			});

			test('non-GPU test', () => {
				console.log('This should execute');
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('○ GPU tests › render shader');
		expect(testProcess.stdout).toMatch('○ GPU tests › compute pipeline');
		expect(testProcess.stdout).toMatch('○ GPU tests › texture sampling');
		expect(testProcess.stdout).toMatch('✔ non-GPU test');
		expect(testProcess.stdout).not.toMatch('This should not execute');
		expect(testProcess.stdout).toMatch('This should execute');
		expect(testProcess.stdout).toMatch('1 passed');
		expect(testProcess.stdout).toMatch('3 skipped');
	});

	test('should error if skip called after test starts', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			await describe('Invalid', ({ test, skip }) => {
				test('runs first', () => {
					console.log('First test ran');
				});

				skip('Too late!');

				test('second test', () => {
					console.log('Second test');
				});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stdout).toMatch('First test ran');
		expect(testProcess.stderr).toMatch('skip() must be called before any tests');
	});

	test('should inherit skip state in nested describes', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			await describe('Graphics', async ({ describe, skip }) => {
				skip('No GPU available');

				await describe('2D', ({ test }) => {
					test('canvas', () => {
						console.log('Should not run');
					});

					test('svg', () => {
						console.log('Should not run');
					});
				});

				await describe('3D', ({ test }) => {
					test('webgl', () => {
						console.log('Should not run');
					});

					test('webgpu', () => {
						console.log('Should not run');
					});
				});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('○ Graphics › 2D › canvas');
		expect(testProcess.stdout).toMatch('○ Graphics › 2D › svg');
		expect(testProcess.stdout).toMatch('○ Graphics › 3D › webgl');
		expect(testProcess.stdout).toMatch('○ Graphics › 3D › webgpu');
		expect(testProcess.stdout).not.toMatch('Should not run');
		expect(testProcess.stdout).toMatch('0 passed');
		expect(testProcess.stdout).toMatch('4 skipped');
	});

	test('should allow child describe to skip independently', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			await describe('Parent', async ({ describe }) => {
				await describe('Child A', ({ test, skip }) => {
					skip('Child A skipped');

					test('test 1', () => {
						console.log('Should not run');
					});
				});

				await describe('Child B', ({ test }) => {
					test('test 2', () => {
						console.log('Should run');
					});
				});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('○ Parent › Child A › test 1');
		expect(testProcess.stdout).toMatch('✔ Parent › Child B › test 2');
		expect(testProcess.stdout).not.toMatch('Should not run');
		expect(testProcess.stdout).toMatch('Should run');
		expect(testProcess.stdout).toMatch('1 passed');
		expect(testProcess.stdout).toMatch('1 skipped');
	});

	test('should run cleanup hooks for skipped describes', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			await describe('Database tests', async ({ test, skip, onFinish }) => {
				console.log('Setup database');

				onFinish(() => {
					console.log('Cleanup database');
				});

				skip('Database not configured');

				test('query', () => {
					console.log('Should not run');
				});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('Setup database');
		expect(testProcess.stdout).toMatch('Cleanup database');
		expect(testProcess.stdout).not.toMatch('Should not run');
		expect(testProcess.stdout).toMatch('○ Database tests › query');
		expect(testProcess.stdout).toMatch('1 skipped');
	});

	test('should error if nested describe called before skip', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			await describe('Parent', async ({ describe, skip }) => {
				await describe('Child runs first', ({ test }) => {
					test('test 1', () => {
						console.log('First test ran');
					});
				});

				skip('Too late!');
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stdout).toMatch('First test ran');
		expect(testProcess.stderr).toMatch('skip() must be called before any tests');
	});

	test('should handle mixed skip sources', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			await describe('Group', ({ test, skip }) => {
				skip('Group skipped');

				test('test with own skip', ({ skip }) => {
					console.log('Test body should not run');
					skip('Test skipped');
				});

				test('test without own skip', () => {
					console.log('Test body should not run');
				});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('○ Group › test with own skip');
		expect(testProcess.stdout).toMatch('○ Group › test without own skip');
		expect(testProcess.stdout).not.toMatch('Test body should not run');
		expect(testProcess.stdout).toMatch('2 skipped');
	});

	test('should enforce skip rules even with TESTONLY filtering', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			await describe('suite', ({ test, skip }) => {
				test('Test A', () => {
					console.log('Test A runs');
				});

				skip('Too late!');

				test('Test B', () => {
					console.log('Test B runs');
				});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'), {
			env: { TESTONLY: 'Test B' },
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('skip() must be called before any tests');
	});

	test('should error if skip called after runTestSuite', async () => {
		await using fixture = await createFixture({
			'test-suite.mjs': `
			import { testSuite } from 'manten';

			export default testSuite(({ test }) => {
				test('suite test', () => {
					console.log('Suite test ran');
				});
			});
			`,
			'index.mjs': `
			import { describe } from 'manten';

			await describe('Parent', async ({ runTestSuite, skip }) => {
				await runTestSuite(import('./test-suite.mjs'));

				skip('Too late!');
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stdout).toMatch('Suite test ran');
		expect(testProcess.stderr).toMatch('skip() must be called before any tests');
	});

	test('should allow skip before async setup completes', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe } from 'manten';

			await describe('Async setup', async ({ test, skip }) => {
				const config = await Promise.resolve({ enabled: false });

				if (!config.enabled) {
					skip('Feature disabled');
				}

				test('test 1', () => {
					console.log('Should not run');
				});

				test('test 2', () => {
					console.log('Should not run');
				});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('○ Async setup › test 1');
		expect(testProcess.stdout).toMatch('○ Async setup › test 2');
		expect(testProcess.stdout).not.toMatch('Should not run');
		expect(testProcess.stdout).toMatch('2 skipped');
	});

	test('should allow skip without early return pattern', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe } from 'manten';

			await describe('Conditional skip', ({ test, skip }) => {
				if (!process.env.FEATURE_FLAG) {
					skip('Feature not enabled');
					// Continue to register tests (no return)
				}

				test('test 1', () => {
					console.log('Should not run');
				});

				test('test 2', () => {
					console.log('Should not run');
				});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('○ Conditional skip › test 1');
		expect(testProcess.stdout).toMatch('○ Conditional skip › test 2');
		expect(testProcess.stdout).not.toMatch('Should not run');
		expect(testProcess.stdout).toMatch('2 skipped');
	});
});
