import { createFixture } from 'fs-fixture';
import { expectMatchInOrder } from '../utils/expect-match-in-order.js';
import { installManten, node } from '../utils/spec-helpers.js';
import { testSuite, expect } from 'manten';

export default testSuite('hooks', ({ test }) => {
	test('test hooks (onTestFail, onTestFinish)', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			test('hooks', ({ onTestFail, onTestFinish }) => {
				console.log('test start');
				onTestFail((error) => {
					console.log('test error', error.message);
				});

				onTestFinish(() => {
					console.log('test finish');
				});

				throw new Error('hello');
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expectMatchInOrder(testProcess.stdout, [
			'test start',
			'test error hello',
			'test finish',
		]);
		expect(testProcess.stderr).toMatch('✖ hooks');
		expect(testProcess.stderr).toMatch('Error: hello');
	});

	test('failing test hooks', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			test('failing hooks', ({ onTestFail, onTestFinish }) => {
				onTestFail(() => {
					throw new Error('onTestFail error');
				});

				onTestFinish(() => {
					throw new Error('onTestFinish error');
				});

				throw new Error('original error');
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);

		// Check for original error
		expect(testProcess.stderr).toMatch('✖ failing hooks');
		expect(testProcess.stderr).toMatch('Error: original error');

		// Check for hook errors (use regex to ignore timing in output)
		expect(testProcess.stderr).toMatch(/✖ failing hooks.*\[onTestFail\]/);
		expect(testProcess.stderr).toMatch('Error: onTestFail error');

		expect(testProcess.stderr).toMatch(/✖ failing hooks.*\[onTestFinish\]/);
		expect(testProcess.stderr).toMatch('Error: onTestFinish error');
	});

	test('lifecycle hooks (onFinish in describe/suite)', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe, testSuite } from 'manten';

			describe('describe', async ({ onFinish, runTestSuite }) => {
				onFinish(() => {
					console.log('describe finish');
				});

				await runTestSuite(testSuite(({ describe, onFinish }) => {
					console.log('test suite start');

					onFinish(() => {
						console.log('test suite finish');
					});

					describe('nested describe', ({ onFinish }) => {
						console.log('nested start');
						onFinish(() => {
							console.log('nested finish');
						});
					});
				}));
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expectMatchInOrder(testProcess.stdout, [
			'test suite start',
			'nested start',
			'nested finish',
			'test suite finish',
			'describe finish',
		]);
	});

	test('failing onFinish hook', async ({ onTestFail }) => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe } from 'manten';

			describe('failing onFinish', ({ onFinish }) => {
				onFinish(() => {
					console.log('executing hook');
					throw new Error('onFinish error');
				});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stdout).toMatch('executing hook');
		expect(testProcess.stderr).toMatch('Error: onFinish error');
	});
});
