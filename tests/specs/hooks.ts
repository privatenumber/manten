import { createFixture } from 'fs-fixture';
import { expectMatchInOrder } from '../utils/expect-match-in-order.ts';
import { installManten, node } from '../utils/spec-helpers.ts';
import {
	describe, test, expect, onTestFail,
} from 'manten';

describe('hooks', () => {
	test('test hooks (onTestFail, onTestFinish)', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, onTestFail, onTestFinish } from 'manten';

			test('hooks', () => {
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

		expect('exitCode' in testProcess).toBe(true);
		expectMatchInOrder(testProcess.stdout, [
			'test start',
			'test error hello',
			'test finish',
		]);
		expect(testProcess.stderr).toMatch('✖ hooks');
		expect(testProcess.stderr).toMatch('Error: hello');
	});

	test('failing test hooks', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test, onTestFail, onTestFinish } from 'manten';

			test('failing hooks', () => {
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

		expect('exitCode' in testProcess).toBe(true);

		// Check for original error
		expect(testProcess.stderr).toMatch('✖ failing hooks');
		expect(testProcess.stderr).toMatch('Error: original error');

		// Check for hook errors (use regex to ignore timing in output)
		expect(testProcess.stderr).toMatch(/✖ failing hooks.*\[onTestFail\]/);
		expect(testProcess.stderr).toMatch('Error: onTestFail error');

		expect(testProcess.stderr).toMatch(/✖ failing hooks.*\[onTestFinish\]/);
		expect(testProcess.stderr).toMatch('Error: onTestFinish error');
	});

	test('lifecycle hooks (onFinish in describe)', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe, onFinish } from 'manten';

			describe('describe', async () => {
				onFinish(() => {
					console.log('describe finish');
				});

				await describe('inner', () => {
					console.log('inner start');

					onFinish(() => {
						console.log('inner finish');
					});

					describe('nested describe', () => {
						console.log('nested start');
						onFinish(() => {
							console.log('nested finish');
						});
					});
				});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'));

		onTestFail(() => {
			console.log(testProcess);
		});

		expect('exitCode' in testProcess).toBe(false);
		expectMatchInOrder(testProcess.stdout, [
			'inner start',
			'nested start',
			'nested finish',
			'inner finish',
			'describe finish',
		]);
	});

	test('failing onFinish hook', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe, onFinish } from 'manten';

			describe('failing onFinish', () => {
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

		expect('exitCode' in testProcess).toBe(true);
		expect(testProcess.stdout).toMatch('executing hook');
		expect(testProcess.stderr).toMatch('Error: onFinish error');
	});
});
