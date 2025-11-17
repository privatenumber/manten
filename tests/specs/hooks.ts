import { createFixture } from 'fs-fixture';
import { expectMatchInOrder } from '../utils/expect-match-in-order.js';
import { installManten, node } from '../utils/spec-helpers.js';
import { testSuite, expect } from 'manten';

export default testSuite('hooks', ({ test }) => {
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

		const testProcess = await node(fixture.getPath('index.mjs'));

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
});
