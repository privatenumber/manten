import { createFixture } from 'fs-fixture';
import { installManten, node } from '../utils/spec-helpers.js';
import { testSuite, expect } from 'manten';

export default testSuite('test-suites', ({ test }) => {
	test('named test suites', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { testSuite, describe } from 'manten';

			const namedSuite = testSuite('Named suite', ({ test }) => {
				test('Test A', async () => {
					await setTimeout(10);
				});

				test('Test B', async () => {
					await setTimeout(20);
				});
			});

			namedSuite();

			const namedSuiteWithParams = testSuite('Parameterized suite', ({ test }, value) => {
				test(\`Test with \${value}\`, async () => {
					await setTimeout(10);
				});
			});

			namedSuiteWithParams('param1');
			namedSuiteWithParams('param2');

			const nestedNamedSuite = testSuite('Nested named suite', ({ test }) => {
				test('Inner test', async () => {
					await setTimeout(10);
				});
			});

			describe('Outer group', async ({ test }) => {
				await nestedNamedSuite();

				test('Other test', () => {
					// Another test in the same group
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

		// Check all expected outputs appear (order may vary due to concurrency)
		expect(testProcess.stdout).toMatch('✔ Named suite › Test A');
		expect(testProcess.stdout).toMatch('✔ Named suite › Test B');
		expect(testProcess.stdout).toMatch('✔ Parameterized suite › Test with param1');
		expect(testProcess.stdout).toMatch('✔ Parameterized suite › Test with param2');
		// When called directly (not via runTestSuite), suite doesn't inherit parent context
		expect(testProcess.stdout).toMatch('✔ Nested named suite › Inner test');
		expect(testProcess.stdout).toMatch('✔ Outer group › Other test');

		expect(testProcess.stdout).toMatch('6 passed');
		expect(testProcess.stdout).not.toMatch('failed');
	});

	test('test suite with timeout', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { testSuite } from 'manten';

			const timedSuite = testSuite('Timed suite', ({ test }) => {
				test('fast test', async ({ signal }) => {
					// Complete immediately
				});

				test('slow test', async ({ signal }) => {
					// Long timeout that will be aborted
					await setTimeout(3_600_000, null, { signal });
				});
			}, { timeout: 100 });

			timedSuite();
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('Timeout: 100ms');
		expect(testProcess.stdout).toMatch('1 passed');
		expect(testProcess.stdout).toMatch('1 failed');
	});

	test('timeout propagates across module boundaries via runTestSuite', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'suite.mjs': `
			import { setTimeout } from 'node:timers/promises';
			import { testSuite } from 'manten';

			export default testSuite('External suite', ({ test }) => {
				test('slow test', async ({ signal }) => {
					console.log('EXTERNAL_STARTED');
					console.log('EXTERNAL_ABORTED:', signal.aborted);
					// Long timeout that will be aborted
					await setTimeout(3_600_000, null, { signal });
				});
			});
			`,
			'index.mjs': `
			import { describe } from 'manten';

			describe('Parent', ({ runTestSuite }) => {
				runTestSuite(import('./suite.mjs'));
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
		// Verify parent's timeout propagated to child suite across module boundary
		expect(testProcess.stdout).toMatch('EXTERNAL_STARTED');
		expect(testProcess.stdout).toMatch('1 failed');
	});
});
