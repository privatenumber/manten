import { createFixture } from 'fs-fixture';
import { installManten, node } from '../utils/spec-helpers.js';
import { testSuite, expect } from 'manten';

export default testSuite('abort signal', ({ test }) => {
	test('signal provided to test callback', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe } from 'manten';

			describe('abort signal', ({ test }) => {
				test('signal is AbortSignal', ({ signal }) => {
					if (!(signal instanceof AbortSignal)) {
						throw new Error('signal is not AbortSignal');
					}
					if (signal.aborted) {
						throw new Error('signal should not be aborted initially');
					}
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
		expect(testProcess.stdout).toMatch('1 passed');
	});

	test('signal aborted on timeout', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe } from 'manten';

			describe('abort signal', ({ test }) => {
				test('signal aborted on timeout', async ({ signal }) => {
					let aborted = false;
					signal.addEventListener('abort', () => {
						aborted = true;
					});

					await setTimeout(100);

					if (!aborted) {
						throw new Error('signal was not aborted');
					}
				}, { timeout: 50 });
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('Timeout: 50ms');
		expect(testProcess.stdout).toMatch('1 failed');
	});

	test('signal enables graceful cleanup', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe } from 'manten';

			describe('abort signal', ({ test }) => {
				test('graceful cleanup on timeout', async ({ signal }) => {
					let cleaned = false;

					signal.addEventListener('abort', () => {
						cleaned = true;
					});

					try {
						await setTimeout(100);
					} finally {
						// Write cleanup status to stdout for verification
						console.log('CLEANUP:', cleaned);
					}
				}, { timeout: 50 });
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('Timeout: 50ms');
		expect(testProcess.stdout).toMatch('CLEANUP: true');
		expect(testProcess.stdout).toMatch('1 failed');
	});

	test('signal not aborted when test completes', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe } from 'manten';

			describe('abort signal', ({ test }) => {
				test('signal not aborted on success', async ({ signal }) => {
					let aborted = false;
					signal.addEventListener('abort', () => {
						aborted = true;
					});

					await setTimeout(50);

					if (aborted) {
						throw new Error('signal should not be aborted');
					}
				}, { timeout: 100 });
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('1 passed');
	});

	test('new signal created per retry attempt', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe } from 'manten';

			describe('abort signal', ({ test }) => {
				let attempt = 0;
				const signals = [];

				test('new signal per retry', async ({ signal }) => {
					attempt += 1;
					signals.push(signal);

					// Check signals are different instances
					if (attempt === 2 && signals[0] === signals[1]) {
						throw new Error('signals should be different instances');
					}

					// Check previous signal was aborted
					if (attempt === 2 && !signals[0].aborted) {
						throw new Error('previous signal should be aborted');
					}

					// Current signal should not be aborted
					if (signal.aborted) {
						throw new Error('current signal should not be aborted');
					}

					if (attempt < 2) {
						await setTimeout(100);
					}
				}, {
					retry: 2,
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
		expect(testProcess.stdout).toMatch('(2/2)');
		expect(testProcess.stdout).toMatch('1 passed');
	});

	test('signal works without timeout', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe } from 'manten';

			describe('abort signal', ({ test }) => {
				test('signal provided without timeout', ({ signal }) => {
					if (!(signal instanceof AbortSignal)) {
						throw new Error('signal is not AbortSignal');
					}
					if (signal.aborted) {
						throw new Error('signal should not be aborted');
					}
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
		expect(testProcess.stdout).toMatch('1 passed');
	});

	test('signal aborted on success', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe } from 'manten';

			describe('abort signal', ({ test }) => {
				test('signal aborted after test completes', async ({ signal, onTestFinish }) => {
					let cleaned = false;

					signal.addEventListener('abort', () => {
						cleaned = true;
					});

					onTestFinish(() => {
						// Verify cleanup happened after test completed
						if (!cleaned) {
							throw new Error('Signal should have been aborted after test finished');
						}
						console.log('CLEANUP_VERIFIED: true');
					});

					// Test passes quickly
					await setTimeout(50);
				}, { timeout: 1000 });
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('CLEANUP_VERIFIED: true');
		expect(testProcess.stdout).toMatch('1 passed');
	});

	test('abort reason contains timeout error', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe } from 'manten';

			describe('abort signal', ({ test }) => {
				test('abort reason on timeout', async ({ signal }) => {
					signal.addEventListener('abort', () => {
						// Write reason to stdout for verification
						console.log('ABORT_REASON:', signal.reason?.message || 'undefined');
					});

					await setTimeout(100);
				}, { timeout: 50 });
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stdout).toMatch('ABORT_REASON: Timeout: 50ms');
		expect(testProcess.stderr).toMatch('Timeout: 50ms');
		expect(testProcess.stdout).toMatch('1 failed');
	});
});
