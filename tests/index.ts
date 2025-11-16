import { fileURLToPath } from 'node:url';
import { execaNode } from 'execa';
import { createFixture, type FileTree } from 'fs-fixture';
import { expectMatchInOrder } from './utils/expect-match-in-order.js';
import { test, expect, describe } from '#manten';

const mantenPath = fileURLToPath(new URL('..', import.meta.url));

const installManten = {
	'node_modules/manten': ({ symlink }) => symlink(mantenPath),
} satisfies FileTree;

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

	const testProcess = await execaNode(fixture.getPath('index.mjs'), {
		reject: false,
	});

	expect(testProcess.exitCode).toBe(0);
	expect(testProcess.stdout).toMatch('✔ should log\n');
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

	const testProcess = await execaNode(fixture.getPath('index.mjs'), {
		reject: false,
	});

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

	const testProcess = await execaNode(fixture.getPath('index.mjs'), {
		reject: false,
	});

	expect(testProcess.exitCode).toBe(1);
	expect(testProcess.stderr).toMatch('Expected: 2');
	expect(testProcess.stdout).toMatch('0 passed\n1 failed');
});

test('synchronous', async () => {
	await using fixture = await createFixture({
		'index.mjs': `
		import { test } from 'manten';

		test('Async', async () => {
			console.log('a');
		});

		test('B', () => {
			console.log('b');
		});

		test('C', () => {
			console.log('c');
		});
		`,
		...installManten,
	});

	const testProcess = await execaNode(fixture.getPath('index.mjs'));

	expect(testProcess.exitCode).toBe(0);
	expect(testProcess.stdout).toMatch('a\nb\nc\n✔ Async\n✔ B\n✔ C');
	expect(testProcess.stdout).toMatch('3 passed');
});

describe('asynchronous', ({ test }) => {
	test('sequential', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { test, describe, testSuite } from 'manten';

			const testSuite1 = testSuite(({ describe, test, runTestSuite }, value) => {
				describe('Test suite - Group', ({ test }) => {
					test('A', async () => {
						await setTimeout(10);
					});

					test('B', async () => {
						await setTimeout(20);
					});
				});

				describe('Test suite - Group Async', async ({ test }) => {
					await test('C', async () => {
						await setTimeout(30);
					});

					await test('D', async () => {
						await setTimeout(30);
					});
				});

				test('Test suite - E', async () => {
					await setTimeout(70);
				});

				runTestSuite((async () => {
					const { default: suite2 } = await import('./test-suite-2.mjs');
					return suite2;
				})());
			});

			(async () => {
				await test('A', async () => {
					await setTimeout(10);
				});

				await describe('Group', ({ test }) => {
					test('B', async () => {
						await setTimeout(10);
					});

					test('B', async () => {
						await setTimeout(10);
					});
				});

				await describe('Group - async', async ({ test, runTestSuite }) => {
					await test('C', async () => {
						await setTimeout(10);
					});

					await runTestSuite(testSuite1, 'hello world');

					await runTestSuite(import('./test-suite-3.mjs'));

					await test('D', async () => {
						await setTimeout(10);
					});
				});

				await test('E', async () => {
					await setTimeout(10);
				});
			})();
			`,
			'test-suite-2.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { testSuite } from 'manten';

			export default testSuite(({ describe }) => {
				describe('Test suite 2', ({ test }) => {
					test('Test', async () => {
						await setTimeout(70);
					});
				});
			});
			`,
			'test-suite-3.mjs': `
			import { testSuite } from 'manten';

			// Simulates { default: { default: suite } }
			// by exporting a double-wrapped test suite
			export default {
				default: testSuite(({ test }) => {
					test('Double wrapped test', () => {
						console.log('double wrapped');
					});
				})
			};
			`,
			...installManten,
		});

		const testProcess = await execaNode(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);

		// Verify all expected test outputs are present
		expect(testProcess.stdout).toMatch('✔ A');
		expect(testProcess.stdout).toMatch('✔ Group › B');
		expect(testProcess.stdout).toMatch('✔ Group - async › C');
		expect(testProcess.stdout).toMatch('✔ Group - async › Test suite - Group › A');
		expect(testProcess.stdout).toMatch('✔ Group - async › Test suite - Group › B');
		expect(testProcess.stdout).toMatch('✔ Group - async › Test suite - Group Async › C');
		expect(testProcess.stdout).toMatch('✔ Group - async › Test suite - Group Async › D');
		expect(testProcess.stdout).toMatch(/✔ Group - async › Test suite - E \(\d+ms\)/);
		expect(testProcess.stdout).toMatch(/✔ Group - async › Test suite 2 › Test \(\d+ms\)/);

		// Verify double-wrapped module was unwrapped correctly
		expect(testProcess.stdout).toMatch('✔ Group - async › Double wrapped test');
		expect(testProcess.stdout).toMatch('double wrapped');

		expect(testProcess.stdout).toMatch('✔ Group - async › D');
		expect(testProcess.stdout).toMatch('✔ E');
		expect(testProcess.stdout).toMatch('13 passed');
		expect(testProcess.stdout).not.toMatch('failed');
	});

	test('concurrent', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { test } from 'manten';

			// Using larger time differences to avoid timing flakiness
			// Tests should complete in order: B (50ms), C (150ms), A (300ms)
			test('A', async () => {
				await setTimeout(300);
			});

			test('B', async () => {
				await setTimeout(50);
			});

			test('C', async () => {
				await setTimeout(150);
			});
			`,
			...installManten,
		});

		const testProcess = await execaNode(fixture.getPath('index.mjs'));

		expect(testProcess.exitCode).toBe(0);
		expectMatchInOrder(testProcess.stdout, [
			/✔ B \(\d+ms\)/,
			/✔ C \(\d+ms\)/,
			/✔ A \(\d+ms\)/,
		]);
		expect(testProcess.stdout).toMatch('3 passed');
		expect(testProcess.stdout).not.toMatch('failed');
	});

	test('timeout', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { test, describe } from 'manten';

			(async () => {
				await test('should fail', async () => {
					await setTimeout(10);
				}, 1);

				await describe('timeout to be cleaned up from event loop', ({ test }) => {
					test(
						'on pass',
						() => {},
						5000,
					);

					test(
						'on fail',
						async () => {
							throw new Error('catch me');
						},
						5000,
					);
				});
			})();
			`,
			...installManten,
		});

		const testProcess = await execaNode(fixture.getPath('index.mjs'), {
			all: true,
			reject: false,
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('✖ should fail');
		expect(testProcess.stderr).toMatch('Error: Timeout: 1ms');
	});

	test('timeout variations', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { test } from 'manten';

			(async () => {
				await test('shows duration with timeout', async () => {
					await setTimeout(60);
				}, 1000);

				await test('sync test with timeout', () => {
					// This should just pass
				}, 1000);

				await test('failing sync test with timeout', () => {
					throw new Error('sync fail');
				}, 1000);

				await test('test with timeout 0 (no timeout)', async () => {
					await setTimeout(20);
				}, { timeout: 0 });

				await test('test with undefined timeout (no timeout)', async () => {
					await setTimeout(20);
				}, { timeout: undefined });
			})();
			`,
			...installManten,
		});

		const testProcess = await execaNode(fixture.getPath('index.mjs'), {
			env: {
				NODE_DISABLE_COLORS: '0',
			},
			all: true,
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stdout).toMatch(/✔ shows duration with timeout \(\d+ms \/ 1s\)/);
		expect(testProcess.stdout).toMatch('✔ sync test with timeout');
		expect(testProcess.stdout).toMatch('✔ test with timeout 0 (no timeout)');
		expect(testProcess.stdout).toMatch('✔ test with undefined timeout (no timeout)');
		expect(testProcess.stderr).toMatch('✖ failing sync test with timeout');
		expect(testProcess.stderr).toMatch('Error: sync fail');
		expect(testProcess.stdout).toMatch('4 passed');
		expect(testProcess.stdout).toMatch('1 failed');
	});
});

test('hooks', async ({ onTestFail }) => {
	await using fixture = await createFixture({
		'index.mjs': `
		import { describe, testSuite } from 'manten';

		describe('describe', async ({ test, onFinish, runTestSuite }) => {
			onFinish(() => {
				console.log('describe finish');
			});

			await test('hooks', ({ onTestFail, onTestFinish }) => {
				console.log('test start');
				onTestFail((error) => {
					console.log('test error', error instanceof Error ? error.message : error);
				});

				onTestFinish(() => {
					console.log('test finish');
				});

				throw new Error('hello');
			});

			await test('failing hooks', ({ onTestFail, onTestFinish }) => {
				onTestFail(() => {
					throw new Error('onTestFail');
				});

				onTestFinish(() => {
					throw new Error('onTestFinish');
				});

				throw new Error('hello');
			});

			await runTestSuite(testSuite(({ describe, onFinish }) => {
				console.log('test suite start');

				onFinish(() => {
					/**
					 * This is triggered after "describe finish" because
					 * it shares the same context as the first describe
					 */
					console.log('test suite finish');
				});

				describe('test suite', ({ onFinish }) => {
					console.log('test suite describe start');

					onFinish(() => {
						console.log('test suite describe finish');
					});
				});
			}));

			describe('failing onFinish', ({ onFinish }) => {
				onFinish(() => {
					console.log('failing onFinish hook');
					throw new Error('onFinish error');
				});
			});
		});
		`,
		...installManten,
	});

	const testProcess = await execaNode(fixture.getPath('index.mjs'), {
		all: true,
		reject: false,
	});

	onTestFail(() => {
		console.log(testProcess);
	});

	expect(testProcess.exitCode).toBe(1);
	expectMatchInOrder(testProcess.stdout, [
		'test start',
		'test error hello',
		'test finish',
		'test suite start',
		'test suite describe start',
		'test suite describe finish',
		'test suite finish',
		'failing onFinish hook',
		'describe finish',
	]);
	expectMatchInOrder(testProcess.stderr, [
		'✖ describe › hooks\n',
		'    Error: hello\n',

		'✖ describe › failing hooks\n',
		'    Error: hello\n',

		'✖ describe › failing hooks [onTestFail]\n',
		'    Error: onTestFail\n',

		'✖ describe › failing hooks [onTestFinish]\n',
		'    Error: onTestFinish\n',

		'Error: onFinish error\n',
	]);
});

test('retry', async ({ onTestFail }) => {
	await using fixture = await createFixture({
		'index.mjs': `
		import { describe } from 'manten';

		describe('retry', ({ test }) => {
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

	const testProcess = await execaNode(fixture.getPath('index.mjs'), {
		all: true,
		reject: false,
	});

	onTestFail(() => {
		console.log(testProcess);
	});

	expect(testProcess.all).toMatch('✖ retry › should fail 5 times (5/5)');

	expect(testProcess.all).toMatch('✖ retry › should pass on 3rd try (2/5)');
	expect(testProcess.all).toMatch('✔ retry › should pass on 3rd try (3/5)');
	expect(testProcess.all).not.toMatch('retry › should pass on 3rd try (4/5)');

	expect(testProcess.stdout).toMatch('1 passed');
	expect(testProcess.stdout).toMatch('1 failed');
});

describe('TESTONLY filtering', ({ test }) => {
	test('filters by substring match', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			test('Test A', () => {
				console.log('Test A ran');
			});

			test('Test B', () => {
				console.log('Test B ran');
			});

			describe('Group', ({ test }) => {
				test('Test C', () => {
					console.log('Group Test C ran');
				});

				test('Another Test', () => {
					console.log('Group Another Test ran');
				});
			});

			test('Special [chars]', () => {
				console.log('Special chars ran');
			});
			`,
			...installManten,
		});

		const testProcess = await execaNode(fixture.getPath('index.mjs'), {
			env: {
				TESTONLY: 'Test A',
			},
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('✔ Test A');
		expect(testProcess.stdout).not.toMatch('✔ Test B');
		expect(testProcess.stdout).not.toMatch('✔ Group › Test C');
		expect(testProcess.stdout).toMatch('1 passed');
	});

	test('filters with describe prefix', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			test('Test A', () => {
				console.log('Test A ran');
			});

			test('Test B', () => {
				console.log('Test B ran');
			});

			describe('Group', ({ test }) => {
				test('Test C', () => {
					console.log('Group Test C ran');
				});

				test('Another Test', () => {
					console.log('Group Another Test ran');
				});
			});

			test('Special [chars]', () => {
				console.log('Special chars ran');
			});
			`,
			...installManten,
		});

		const testProcess = await execaNode(fixture.getPath('index.mjs'), {
			env: {
				TESTONLY: 'Group',
			},
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).not.toMatch('✔ Test A');
		expect(testProcess.stdout).not.toMatch('✔ Test B');
		expect(testProcess.stdout).toMatch('✔ Group › Test C');
		expect(testProcess.stdout).toMatch('✔ Group › Another Test');
		expect(testProcess.stdout).toMatch('2 passed');
	});

	test('filters with partial match', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			test('Test A', () => {
				console.log('Test A ran');
			});

			test('Test B', () => {
				console.log('Test B ran');
			});

			describe('Group', ({ test }) => {
				test('Test C', () => {
					console.log('Group Test C ran');
				});

				test('Another Test', () => {
					console.log('Group Another Test ran');
				});
			});

			test('Special [chars]', () => {
				console.log('Special chars ran');
			});
			`,
			...installManten,
		});

		const testProcess = await execaNode(fixture.getPath('index.mjs'), {
			env: {
				TESTONLY: 'Another',
			},
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).not.toMatch('✔ Test A');
		expect(testProcess.stdout).not.toMatch('✔ Test B');
		expect(testProcess.stdout).not.toMatch('✔ Group › Test C');
		expect(testProcess.stdout).toMatch('✔ Group › Another Test');
		expect(testProcess.stdout).toMatch('1 passed');
	});

	test('filters with special characters', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			test('Test A', () => {
				console.log('Test A ran');
			});

			test('Test B', () => {
				console.log('Test B ran');
			});

			describe('Group', ({ test }) => {
				test('Test C', () => {
					console.log('Group Test C ran');
				});

				test('Another Test', () => {
					console.log('Group Another Test ran');
				});
			});

			test('Special [chars]', () => {
				console.log('Special chars ran');
			});
			`,
			...installManten,
		});

		const testProcess = await execaNode(fixture.getPath('index.mjs'), {
			env: {
				TESTONLY: '[chars]',
			},
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('✔ Special [chars]');
		expect(testProcess.stdout).not.toMatch('✔ Test A');
		expect(testProcess.stdout).toMatch('1 passed');
	});

	test('no matches skips all tests', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			test('Test A', () => {
				console.log('Test A ran');
			});

			test('Test B', () => {
				console.log('Test B ran');
			});

			describe('Group', ({ test }) => {
				test('Test C', () => {
					console.log('Group Test C ran');
				});

				test('Another Test', () => {
					console.log('Group Another Test ran');
				});
			});

			test('Special [chars]', () => {
				console.log('Special chars ran');
			});
			`,
			...installManten,
		});

		const testProcess = await execaNode(fixture.getPath('index.mjs'), {
			env: {
				TESTONLY: 'NonExistentTest',
			},
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toBe('');
		expect(testProcess.stdout).not.toMatch('✔');
		expect(testProcess.stdout).not.toMatch('passed');
	});

	test('empty string runs all tests', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, describe } from 'manten';

			test('Test A', () => {
				console.log('Test A ran');
			});

			test('Test B', () => {
				console.log('Test B ran');
			});

			describe('Group', ({ test }) => {
				test('Test C', () => {
					console.log('Group Test C ran');
				});

				test('Another Test', () => {
					console.log('Group Another Test ran');
				});
			});

			test('Special [chars]', () => {
				console.log('Special chars ran');
			});
			`,
			...installManten,
		});

		const testProcess = await execaNode(fixture.getPath('index.mjs'), {
			env: {
				TESTONLY: '',
			},
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('5 passed');
	});
});

describe('unfinished test detection', ({ test }) => {
	test('shows pending symbol for incomplete tests', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			console.log('MODULE LOADED');

			(async () => {
				console.log('IIFE STARTED');
				await test('completed test', () => {
					console.log('completed');
				});

				await test('unfinished test', () => {
					console.log('started');
					// Exit immediately to simulate crash
					process.exit(1);
				});
			})();
			`,
			...installManten,
		});

		const testProcess = await execaNode(fixture.getPath('index.mjs'), {
			all: true,
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stdout).toMatch('✔ completed test');
		expect(testProcess.stdout).toMatch('• unfinished test');
		expect(testProcess.stdout).toMatch('1 passed');
		expect(testProcess.stdout).toMatch('1 pending');
	});
});

test('retry with timeout interaction', async ({ onTestFail }) => {
	await using fixture = await createFixture({
		'index.mjs': `
		import { setTimeout } from 'node:timers/promises';
		import { describe } from 'manten';

		describe('retry with timeout', ({ test }) => {
			let attempt = 0;

			test('should retry timed-out tests', async () => {
				attempt += 1;

				if (attempt < 3) {
					// First two attempts: timeout
					await setTimeout(100);
				}
				// Third attempt: complete quickly
				await setTimeout(5);
			}, {
				retry: 3,
				timeout: 50,
			});
		});
		`,
		...installManten,
	});

	const testProcess = await execaNode(fixture.getPath('index.mjs'), {
		all: true,
		reject: false,
	});

	onTestFail(() => {
		console.log(testProcess);
	});

	expect(testProcess.exitCode).toBe(0);
	expect(testProcess.all).toMatch('Timeout: 50ms');
	expect(testProcess.all).toMatch('(3/3)');
	expect(testProcess.stdout).toMatch('1 passed');
});

test('deep context nesting', async ({ onTestFail }) => {
	await using fixture = await createFixture({
		'index.mjs': `
		import { describe } from 'manten';

		describe('Level 1', ({ describe, test }) => {
			test('Test at level 1', () => {
				console.log('level 1');
			});

			describe('Level 2', ({ describe, test }) => {
				test('Test at level 2', () => {
					console.log('level 2');
				});

				describe('Level 3', ({ describe, test }) => {
					test('Test at level 3', () => {
						console.log('level 3');
					});

					describe('Level 4', ({ test }) => {
						test('Test at level 4', () => {
							console.log('level 4');
						});
					});
				});
			});
		});
		`,
		...installManten,
	});

	const testProcess = await execaNode(fixture.getPath('index.mjs'), {
		reject: false,
	});

	onTestFail(() => {
		console.log(testProcess);
	});

	expect(testProcess.exitCode).toBe(0);
	expect(testProcess.stdout).toMatch('✔ Level 1 › Test at level 1');
	expect(testProcess.stdout).toMatch('✔ Level 1 › Level 2 › Test at level 2');
	expect(testProcess.stdout).toMatch('✔ Level 1 › Level 2 › Level 3 › Test at level 3');
	expect(testProcess.stdout).toMatch('✔ Level 1 › Level 2 › Level 3 › Level 4 › Test at level 4');
	expect(testProcess.stdout).toMatch('4 passed');
});
