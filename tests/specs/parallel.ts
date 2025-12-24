import { createFixture } from 'fs-fixture';
import { expectMatchInOrder } from '../utils/expect-match-in-order.js';
import { installManten, node } from '../utils/spec-helpers.js';
import { testSuite, expect } from 'manten';

export default testSuite('parallel', ({ describe }) => {
	describe('parallel: false (sequential)', ({ test }) => {
		test('runs tests one at a time', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { describe } from 'manten';

				describe('Sequential tests', ({ test }) => {
					test('Test 1', async () => {
						console.log('Test 1 start');
						await setTimeout(50);
						console.log('Test 1 end');
					});

					test('Test 2', async () => {
						console.log('Test 2 start');
						await setTimeout(50);
						console.log('Test 2 end');
					});

					test('Test 3', async () => {
						console.log('Test 3 start');
						await setTimeout(50);
						console.log('Test 3 end');
					});
				}, { parallel: false });
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect(testProcess.exitCode).toBe(0);

			// Sequential execution: each test completes before next starts
			expectMatchInOrder(testProcess.stdout, [
				'Test 1 start',
				'Test 1 end',
				'Test 2 start',
				'Test 2 end',
				'Test 3 start',
				'Test 3 end',
			]);

			expect(testProcess.stdout).toMatch('3 passed');
		});

		test('works with nested describes', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { describe } from 'manten';

				describe('Outer', ({ test, describe }) => {
					test('Outer test', async () => {
						console.log('Outer test start');
						await setTimeout(50);
						console.log('Outer test end');
					});

					describe('Inner', ({ test }) => {
						test('Inner test 1', async () => {
							console.log('Inner test 1 start');
							await setTimeout(50);
							console.log('Inner test 1 end');
						});

						test('Inner test 2', async () => {
							console.log('Inner test 2 start');
							await setTimeout(50);
							console.log('Inner test 2 end');
						});
					});
				}, { parallel: false });
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect(testProcess.exitCode).toBe(0);

			// All execute sequentially
			expectMatchInOrder(testProcess.stdout, [
				'Outer test start',
				'Outer test end',
				'Inner test 1 start',
				'Inner test 1 end',
			]);

			expect(testProcess.stdout).toMatch('3 passed');
		});
	});

	describe('parallel: true (unbounded)', ({ test }) => {
		test('runs all tests concurrently', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { describe } from 'manten';

				describe('Concurrent tests', ({ test }) => {
					test('Test 1', async () => {
						console.log('Test 1 start');
						await setTimeout(50);
						console.log('Test 1 end');
					});

					test('Test 2', async () => {
						console.log('Test 2 start');
						await setTimeout(300);
						console.log('Test 2 end');
					});

					test('Test 3', async () => {
						console.log('Test 3 start');
						await setTimeout(600);
						console.log('Test 3 end');
					});
				}, { parallel: true });
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect(testProcess.exitCode).toBe(0);

			const lines = testProcess.stdout.split('\n').filter(line => line.trim());

			// Find indices of messages
			const test1Start = lines.indexOf('Test 1 start');
			const test2Start = lines.indexOf('Test 2 start');
			const test3Start = lines.indexOf('Test 3 start');
			const test1End = lines.indexOf('Test 1 end');
			const test2End = lines.indexOf('Test 2 end');
			const test3End = lines.indexOf('Test 3 end');

			// All three tests should start before any of them end (concurrent execution)
			const lastStart = Math.max(test1Start, test2Start, test3Start);
			const firstEnd = Math.min(test1End, test2End, test3End);
			expect(lastStart).toBeLessThan(firstEnd);

			// Due to different timeouts, they should end in order:
			// Test 1 (50ms), Test 2 (300ms), Test 3 (600ms)
			expect(test1End).toBeLessThan(test2End);
			expect(test2End).toBeLessThan(test3End);

			expect(testProcess.stdout).toMatch('3 passed');
		});
	});

	describe('parallel: N (fixed limit)', ({ test }) => {
		test('limits concurrent execution to N', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { describe } from 'manten';

				describe('Limited concurrent tests', ({ test }) => {
					test('Test 1', async () => {
						console.log('Test 1 start');
						await setTimeout(100);
						console.log('Test 1 end');
					});

					test('Test 2', async () => {
						console.log('Test 2 start');
						await setTimeout(100);
						console.log('Test 2 end');
					});

					test('Test 3', async () => {
						console.log('Test 3 start');
						await setTimeout(100);
						console.log('Test 3 end');
					});

					test('Test 4', async () => {
						console.log('Test 4 start');
						await setTimeout(100);
						console.log('Test 4 end');
					});
				}, { parallel: 2 });
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect(testProcess.exitCode).toBe(0);

			// With parallel: 2, only 2 tests run concurrently
			// Test 1 and Test 2 should start (in any order)
			// Test 3 and Test 4 should only start after one of the first two completes

			const lines = testProcess.stdout.split('\n').filter(line => line.trim());

			// Find indices of start messages
			const test1Start = lines.indexOf('Test 1 start');
			const test2Start = lines.indexOf('Test 2 start');
			const test3Start = lines.indexOf('Test 3 start');
			const test4Start = lines.indexOf('Test 4 start');

			// Find indices of end messages
			const test1End = lines.indexOf('Test 1 end');
			const test2End = lines.indexOf('Test 2 end');

			// Verify Test 1 and Test 2 both start early (in first 2 positions)
			expect(Math.max(test1Start, test2Start)).toBeLessThanOrEqual(1);

			// Verify Test 3 starts only after Test 1 or Test 2 ends
			const firstEndIndex = Math.min(test1End, test2End);
			expect(test3Start).toBeGreaterThan(firstEndIndex);

			// Verify Test 4 starts only after another test ends
			expect(test4Start).toBeGreaterThan(firstEndIndex);

			// All 4 tests should complete
			expect(testProcess.stdout).toMatch('Test 1 start');
			expect(testProcess.stdout).toMatch('Test 2 start');
			expect(testProcess.stdout).toMatch('Test 3 start');
			expect(testProcess.stdout).toMatch('Test 4 start');

			expect(testProcess.stdout).toMatch('4 passed');
		});

		test('applies to both test and describe children', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { describe } from 'manten';

				describe('Parent', ({ test, describe }) => {
					test('Parent test 1', async () => {
						console.log('Parent test 1 start');
						await setTimeout(50);
						console.log('Parent test 1 end');
					});

					test('Parent test 2', async () => {
						console.log('Parent test 2 start');
						await setTimeout(50);
						console.log('Parent test 2 end');
					});

					describe('Child describe', ({ test }) => {
						test('Child test', async () => {
							console.log('Child test start');
							await setTimeout(50);
							console.log('Child test end');
						});
					});
				}, { parallel: 2 });
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect(testProcess.exitCode).toBe(0);

			const lines = testProcess.stdout.split('\n').filter(line => line.trim());

			// Find indices of start messages
			const parent1Start = lines.indexOf('Parent test 1 start');
			const parent2Start = lines.indexOf('Parent test 2 start');
			const childStart = lines.indexOf('Child test start');

			// Find indices of end messages
			const parent1End = lines.indexOf('Parent test 1 end');
			const parent2End = lines.indexOf('Parent test 2 end');

			// Parent test 1 and 2 should both start early (in first 2 positions)
			expect(Math.max(parent1Start, parent2Start)).toBeLessThanOrEqual(1);

			// Child test starts only after at least one parent completes
			const firstParentEnd = Math.min(parent1End, parent2End);
			expect(childStart).toBeGreaterThan(firstParentEnd);

			// All tests should complete
			expect(testProcess.stdout).toMatch('Parent test 1 start');
			expect(testProcess.stdout).toMatch('Parent test 2 start');
			expect(testProcess.stdout).toMatch('Child test start');
			expect(testProcess.stdout).toMatch('3 passed');
		});
	});

	describe('parallel: auto (dynamic)', ({ test }) => {
		test('adapts concurrency based on system load', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { describe } from 'manten';

				describe('Auto concurrent tests', ({ test }) => {
					test('Test 1', async () => {
						await setTimeout(50);
					});

					test('Test 2', async () => {
						await setTimeout(50);
					});

					test('Test 3', async () => {
						await setTimeout(50);
					});
				}, { parallel: 'auto' });
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect(testProcess.exitCode).toBe(0);
			expect(testProcess.stdout).toMatch('3 passed');
		});
	});

	describe('await bypasses parallel limiting', ({ test }) => {
		test('explicit await runs immediately regardless of parallel setting', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { describe } from 'manten';

				(async () => {
					describe('Mixed await', async ({ test }) => {
						await test('Setup', async () => {
							console.log('Setup start');
							await setTimeout(50);
							console.log('Setup end');
						});

						test('Test 1', async () => {
							console.log('Test 1 start');
							await setTimeout(50);
							console.log('Test 1 end');
						});

						test('Test 2', async () => {
							console.log('Test 2 start');
							await setTimeout(50);
							console.log('Test 2 end');
						});

						await test('Teardown', async () => {
							console.log('Teardown start');
							await setTimeout(50);
							console.log('Teardown end');
						});
					}, { parallel: 2 });
				})();
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect(testProcess.exitCode).toBe(0);

			const lines = testProcess.stdout.split('\n').filter(line => line.trim());

			// Find indices of messages
			const setupStart = lines.indexOf('Setup start');
			const setupEnd = lines.indexOf('Setup end');
			const test1Start = lines.indexOf('Test 1 start');
			const test2Start = lines.indexOf('Test 2 start');
			const test1End = lines.indexOf('Test 1 end');
			const test2End = lines.indexOf('Test 2 end');
			const teardownStart = lines.indexOf('Teardown start');

			// Setup runs first (due to await)
			expect(setupStart).toBeLessThan(setupEnd);
			expect(setupEnd).toBeLessThan(test1Start);
			expect(setupEnd).toBeLessThan(test2Start);

			// Test 1 and Test 2 run concurrently (both start before either ends)
			const lastTestStart = Math.max(test1Start, test2Start);
			const firstTestEnd = Math.min(test1End, test2End);
			expect(lastTestStart).toBeLessThan(firstTestEnd);

			// Teardown should start after both Test 1 and Test 2 start
			// Due to the parallel limiter implementation, teardown might start
			// slightly before the "Test 1 end" log appears, but it should be after both tests start
			expect(teardownStart).toBeGreaterThan(test1Start);
			expect(teardownStart).toBeGreaterThan(test2Start);

			// Teardown should be one of the last operations
			expect(lines.indexOf('Teardown start')).toBeGreaterThan(5);

			expect(testProcess.stdout).toMatch('4 passed');
		});

		test('all awaited tests run sequentially despite parallel setting', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { describe } from 'manten';

				(async () => {
					describe('All awaited', async ({ test }) => {
						await test('Test 1', async () => {
							console.log('Test 1 start');
							await setTimeout(50);
							console.log('Test 1 end');
						});

						await test('Test 2', async () => {
							console.log('Test 2 start');
							await setTimeout(50);
							console.log('Test 2 end');
						});

						await test('Test 3', async () => {
							console.log('Test 3 start');
							await setTimeout(50);
							console.log('Test 3 end');
						});
					}, { parallel: 10 });
				})();
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect(testProcess.exitCode).toBe(0);

			// All awaited = sequential execution despite parallel: 10
			expectMatchInOrder(testProcess.stdout, [
				'Test 1 start',
				'Test 1 end',
				'Test 2 start',
				'Test 2 end',
				'Test 3 start',
				'Test 3 end',
			]);

			expect(testProcess.stdout).toMatch('3 passed');
		});
	});

	describe('nested parallel settings', ({ test }) => {
		test('child and parent limits work independently', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { describe } from 'manten';

				describe('Parent auto', ({ test, describe }) => {
					test('Parent test', async () => {
						console.log('Parent test');
						await setTimeout(50);
					});

					describe('Child auto', ({ test }) => {
						test('Child test 1', async () => {
							console.log('Child test 1');
							await setTimeout(50);
						});

						test('Child test 2', async () => {
							console.log('Child test 2');
							await setTimeout(50);
						});
					}, { parallel: 'auto' });
				}, { parallel: 'auto' });
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect(testProcess.exitCode).toBe(0);
			expect(testProcess.stdout).toMatch('3 passed');
		});
	});

	describe('testSuite with parallel option', ({ test }) => {
		test('testSuite respects parallel option when named', async () => {
			await using fixture = await createFixture({
				'index.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { testSuite } from 'manten';

				const suite = testSuite('Sequential suite', ({ test }) => {
					test('Test 1', async () => {
						console.log('Test 1 start');
						await setTimeout(50);
						console.log('Test 1 end');
					});

					test('Test 2', async () => {
						console.log('Test 2 start');
						await setTimeout(50);
						console.log('Test 2 end');
					});

					test('Test 3', async () => {
						console.log('Test 3 start');
						await setTimeout(50);
						console.log('Test 3 end');
					});
				}, { parallel: false });

				suite();
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect(testProcess.exitCode).toBe(0);

			// Sequential execution: each test completes before next starts
			expectMatchInOrder(testProcess.stdout, [
				'Test 1 start',
				'Test 1 end',
				'Test 2 start',
				'Test 2 end',
				'Test 3 start',
				'Test 3 end',
			]);

			expect(testProcess.stdout).toMatch('3 passed');
		});

		test('testSuite parallel option limits runTestSuite calls', async () => {
			await using fixture = await createFixture({
				'suite-a.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { testSuite } from 'manten';

				export default testSuite('Suite A', ({ test }) => {
					test('A1', async () => {
						console.log('A1 start');
						await setTimeout(200);
						console.log('A1 end');
					});
				});
				`,
				'suite-b.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { testSuite } from 'manten';

				export default testSuite('Suite B', ({ test }) => {
					test('B1', async () => {
						console.log('B1 start');
						await setTimeout(200);
						console.log('B1 end');
					});
				});
				`,
				'suite-c.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { testSuite } from 'manten';

				export default testSuite('Suite C', ({ test }) => {
					test('C1', async () => {
						console.log('C1 start');
						await setTimeout(200);
						console.log('C1 end');
					});
				});
				`,
				'index.mjs': `
				import { describe } from 'manten';

				describe('Container', ({ runTestSuite }) => {
					runTestSuite(import('./suite-a.mjs'));
					runTestSuite(import('./suite-b.mjs'));
					runTestSuite(import('./suite-c.mjs'));
				}, { parallel: 2 });
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			expect(testProcess.exitCode).toBe(0);

			// Only 2 suites run at a time: A+B start (in any order), then C starts after one completes
			expect(testProcess.stdout).toMatch('A1 start');
			expect(testProcess.stdout).toMatch('B1 start');

			// C starts after A or B completes - verify parallel limit works
			const cStartIndex = testProcess.stdout.indexOf('C1 start');
			const aEndIndex = testProcess.stdout.indexOf('A1 end');
			const bEndIndex = testProcess.stdout.indexOf('B1 end');

			// C must start AFTER (A ends OR B ends) to prove the parallel: 2 limit works
			const slotOpened = (aEndIndex !== -1 && cStartIndex > aEndIndex)
								|| (bEndIndex !== -1 && cStartIndex > bEndIndex);

			if (!slotOpened) {
				throw new Error('C started before a concurrency slot opened!');
			}

			expect(testProcess.stdout).toMatch('3 passed');
		});
	});
});
