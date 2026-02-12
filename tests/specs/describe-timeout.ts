import { createFixture } from 'fs-fixture';
import { installManten, node } from '../utils/spec-helpers.ts';
import {
	describe, test, expect, onTestFail,
} from 'manten';

describe('describe timeout', () => {
	test('describe timeout aborts all child tests', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe, test } from 'manten';

			describe('Group', () => {
				test('slow test 1', async ({ signal }) => {
					// Will be aborted by group timeout
					await setTimeout(3_600_000, null, { signal });
				});

				test('slow test 2', async ({ signal }) => {
					// Will be aborted by group timeout
					await setTimeout(3_600_000, null, { signal });
				});
			}, { timeout: 100 });
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('Timeout: 100ms');
		expect(testProcess.stdout).toMatch('2 failed');
	});

	test('describe signal provided for cleanup', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe, test } from 'manten';

			describe('Group', ({ signal }) => {
				let cleaned = false;

				signal.addEventListener('abort', () => {
					cleaned = true;
					console.log('CLEANUP:', cleaned);
				});

				test('slow test', async ({ signal }) => {
					// Will be aborted by group timeout
					await setTimeout(3_600_000, null, { signal });
				});
			}, { timeout: 100 });
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stdout).toMatch('CLEANUP: true');
	});

	test('nested describe timeouts - minimum wins', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe, test } from 'manten';

			describe('Level 1', () => {
				describe('Level 2', () => {
					test('test', async ({ signal }) => {
						// Will be aborted by Level 2 timeout
						await setTimeout(3_600_000, null, { signal });
					}, 5000); // Test timeout: 5s
				}, { timeout: 100 }); // Level 2 timeout: 100ms ← Should win
			}, { timeout: 5000 }); // Level 1 timeout: 5s
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		// Should abort due to Level 2's 100ms timeout, not Level 1's 5s or test's 5s
		expect(testProcess.stderr).toMatch('Timeout: 100ms');
	});

	test('describe timeout with retry - aborts immediately', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe, test } from 'manten';

			let attempt = 0;
			describe('Group', () => {
				test('flaky', async ({ signal }) => {
					attempt += 1;
					console.log('ATTEMPT:', attempt);
					// Will be aborted by group timeout
					await setTimeout(3_600_000, null, { signal });
				}, { retry: 10, timeout: 5000 });
			}, { timeout: 100 });
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		// Should abort after ~100ms from group timeout, not test timeout
		expect(testProcess.stdout).toMatch('ATTEMPT: 1');
		expect(testProcess.stderr).toMatch('Timeout: 100ms');
	});

	test('describe timeout with parallel false', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe, test } from 'manten';

			describe('Group', () => {
				test('test 1', async ({ signal }) => {
					// Instant success. Eliminates race against group timeout.
					await new Promise(resolve => setImmediate(resolve));
				});

				test('test 2', async ({ signal }) => {
					// Will be aborted by group timeout
					await setTimeout(3_600_000, null, { signal });
				});

				test('test 3', async ({ signal }) => {
					// Should never start
					await setTimeout(3_600_000, null, { signal });
				});
			}, { parallel: false, timeout: 100 });
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		// Test 1 passes, test 2 times out, test 3 never starts
		expect(testProcess.stdout).toMatch('passed');
		expect(testProcess.stdout).toMatch('failed');
	});

	test('describe timeout starts on callback entry', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe, test } from 'manten';

			describe('Group', async ({ signal }) => {
				// Hang until signal fires (deterministic)
				await setTimeout(3_600_000, null, { signal });

				test('test', async ({ signal }) => {
					// Should not be reached, or aborted immediately
				});
			}, { timeout: 50 });
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('Timeout: 50ms');
	});

	test('child inherits already aborted state', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe, test } from 'manten';

			describe('Parent', async ({ signal }) => {
				// Hang until signal fires - deterministic timeout trigger
				try {
					await setTimeout(3_600_000, null, { signal });
				} catch {} // Swallow abort error to continue execution

				// Define child AFTER parent abort
				test('Child', ({ signal }) => {
					// This verifies the fix - without it, signal would NOT be aborted yet
					if (!signal.aborted) {
						throw new Error('Signal should be aborted immediately');
					}
					console.log('VERIFIED_CHILD_RAN');
				});
			}, { timeout: 50 });
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('Timeout: 50ms');
		// Ensure the child actually ran the check
		expect(testProcess.stdout).toMatch('VERIFIED_CHILD_RAN');
	});

	test('test timeout takes precedence if shorter', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe, test } from 'manten';

			describe('Group', () => {
				test('test', async ({ signal }) => {
					// Will be aborted by test timeout
					await setTimeout(3_600_000, null, { signal });
				}, 50); // Test timeout: 50ms ← Should win
			}, { timeout: 5000 }); // Group timeout: 5s
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		// Test's own 50ms timeout should fire first
		expect(testProcess.stderr).toMatch('Timeout: 50ms');
		// Should not see describe's 5s timeout
		expect(testProcess.stderr).not.toMatch('Timeout: 5000ms');
	});

	test('no MaxListenersExceededWarning with many children', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe, test } from 'manten';

			describe('Stress', () => {
				// Create 20 tests to trigger default listener limit (10)
				for (let i = 0; i < 20; i += 1) {
					test('child ' + i, async () => {});
				}
			}, { timeout: 1000 });
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		// stderr should be empty (no MaxListenersExceededWarning)
		expect(testProcess.stderr).toBe('');
		expect(testProcess.stdout).toMatch('20 passed');
	});

	test('swallows errors thrown after timeout', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { test } from 'manten';

			test('zombie', async () => {
				await setTimeout(500);
				// This runs AFTER the test has already "failed" due to timeout
				throw new Error('I AM A ZOMBIE ERROR');
			}, 100);
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('Timeout: 100ms');
		// Verify the zombie error doesn't print a confusing second failure
		expect(testProcess.stderr).not.toMatch('I AM A ZOMBIE ERROR');
	});

	test('queued tests abort when group times out', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { describe, test } from 'manten';

			describe('Queue', () => {
				// Test 1: Blocks the queue until aborted
				test('blocker', async ({ signal }) => {
					console.log('BLOCKER_STARTED');
					// Long timeout that will be aborted
					await setTimeout(3_600_000, null, { signal });
				});

				// Test 2: Starts after Test 1 is aborted
				test('queued', async ({ signal }) => {
					console.log('QUEUED_STARTED');
					console.log('QUEUED_ABORTED:', signal.aborted);
					// Also long timeout
					await setTimeout(3_600_000, null, { signal });
				});
			}, {
				parallel: 1, // Force queueing
				timeout: 100 // Timeout happens while Test 1 is running
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('Timeout: 100ms');
		// Blocker starts and hangs
		expect(testProcess.stdout).toMatch('BLOCKER_STARTED');
		// Queued test runs after blocker is aborted
		expect(testProcess.stdout).toMatch('QUEUED_STARTED');
		// Critical: queued test sees abort signal immediately
		expect(testProcess.stdout).toMatch('QUEUED_ABORTED: true');
	});
});
