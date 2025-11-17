import { createFixture } from 'fs-fixture';
import { expectMatchInOrder } from '../utils/expect-match-in-order.js';
import { installManten, node } from '../utils/spec-helpers.js';
import { testSuite, expect } from 'manten';

export default testSuite('parallel', ({ describe }) => {
	describe('parallel: false (sequential)', ({ test }) => {
		test('runs tests one at a time', async ({ onTestFail }) => {
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

			onTestFail(() => {
				console.log(testProcess);
			});

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

		test('works with nested describes', async ({ onTestFail }) => {
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

			onTestFail(() => {
				console.log(testProcess);
			});

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
		test('runs all tests concurrently', async ({ onTestFail }) => {
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
						await setTimeout(100);
						console.log('Test 2 end');
					});

					test('Test 3', async () => {
						console.log('Test 3 start');
						await setTimeout(150);
						console.log('Test 3 end');
					});
				}, { parallel: true });
				`,
				...installManten,
			});

			const testProcess = await node(fixture.getPath('index.mjs'));

			onTestFail(() => {
				console.log(testProcess);
			});

			expect(testProcess.exitCode).toBe(0);

			// All start before any complete
			expectMatchInOrder(testProcess.stdout, [
				'Test 1 start',
				'Test 2 start',
				'Test 3 start',
				'Test 1 end',
				'Test 2 end',
				'Test 3 end',
			]);

			expect(testProcess.stdout).toMatch('3 passed');
		});
	});

	describe('parallel: N (fixed limit)', ({ test }) => {
		test('limits concurrent execution to N', async ({ onTestFail }) => {
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

			onTestFail(() => {
				console.log(testProcess);
			});

			expect(testProcess.exitCode).toBe(0);

			// Only 2 run at a time: 1+2 start, then 3+4 start after some complete
			expectMatchInOrder(testProcess.stdout, [
				'Test 1 start',
				'Test 2 start',
			]);

			// Either Test 1 or Test 2 ends first, then Test 3 or 4 starts
			expect(testProcess.stdout).toMatch('Test 3 start');
			expect(testProcess.stdout).toMatch('Test 4 start');

			expect(testProcess.stdout).toMatch('4 passed');
		});

		test('applies to both test and describe children', async ({ onTestFail }) => {
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

			onTestFail(() => {
				console.log(testProcess);
			});

			expect(testProcess.exitCode).toBe(0);

			// Parent test 1+2 start (2 slots), then child describe waits
			expectMatchInOrder(testProcess.stdout, [
				'Parent test 1 start',
				'Parent test 2 start',
			]);

			// Child starts after at least one parent completes
			expect(testProcess.stdout).toMatch('Child test start');
			expect(testProcess.stdout).toMatch('3 passed');
		});
	});

	describe('parallel: auto (dynamic)', ({ test }) => {
		test('adapts concurrency based on system load', async ({ onTestFail }) => {
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

			onTestFail(() => {
				console.log(testProcess);
			});

			expect(testProcess.exitCode).toBe(0);
			expect(testProcess.stdout).toMatch('3 passed');
		});
	});

	describe('await bypasses parallel limiting', ({ test }) => {
		test('explicit await runs immediately regardless of parallel setting', async ({ onTestFail }) => {
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

			onTestFail(() => {
				console.log(testProcess);
			});

			expect(testProcess.exitCode).toBe(0);

			// Setup runs first, then Test 1+2 concurrent (both start), then Teardown
			expectMatchInOrder(testProcess.stdout, [
				'Setup start',
				'Setup end',
				'Test 1 start',
				'Test 2 start',
			]);

			// Teardown waits for both tests to complete
			expect(testProcess.stdout).toMatch('Teardown start');
			expect(testProcess.stdout).toMatch('4 passed');
		});

		test('all awaited tests run sequentially despite parallel setting', async ({ onTestFail }) => {
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

			onTestFail(() => {
				console.log(testProcess);
			});

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
		test('child and parent limits work independently', async ({ onTestFail }) => {
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

			onTestFail(() => {
				console.log(testProcess);
			});

			expect(testProcess.exitCode).toBe(0);
			expect(testProcess.stdout).toMatch('3 passed');
		});
	});

	describe('testSuite with parallel option', ({ test }) => {
		test('testSuite respects parallel option when named', async ({ onTestFail }) => {
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

			onTestFail(() => {
				console.log(testProcess);
			});

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

		test('testSuite parallel option limits runTestSuite calls', async ({ onTestFail }) => {
			await using fixture = await createFixture({
				'suite-a.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { testSuite } from 'manten';

				export default testSuite('Suite A', ({ test }) => {
					test('A1', async () => {
						console.log('A1 start');
						await setTimeout(100);
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
						await setTimeout(100);
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
						await setTimeout(100);
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

			onTestFail(() => {
				console.log(testProcess);
			});

			expect(testProcess.exitCode).toBe(0);

			// Only 2 suites run at a time: A+B start, then C starts after one completes
			expectMatchInOrder(testProcess.stdout, [
				'A1 start',
				'B1 start',
			]);

			// C starts after A or B completes
			expect(testProcess.stdout).toMatch('C1 start');
			expect(testProcess.stdout).toMatch('3 passed');
		});
	});
});
