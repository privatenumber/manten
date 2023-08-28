import { setTimeout } from '../utils/set-timeout.js';
import { test, describe, testSuite } from '#manten';

describe('describe', ({ test, onFinish, runTestSuite }) => {
	onFinish(() => {
		console.log('describe finish');
	});

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

	runTestSuite(testSuite(async ({ describe, onFinish }) => {
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
});
