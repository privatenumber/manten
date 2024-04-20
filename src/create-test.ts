import type {
	Test,
	TestMeta,
	onTestFailCallback,
	Callback,
} from './types.js';
import {
	consoleError,
	logTestResult,
	logReport,
} from './logger.js';
import type { Context } from './create-context.js';
import { timeLimitFunction } from './utils/timer.js';
import { createHook } from './utils/hook.js';

const runTest = async (
	testMeta: TestMeta,
) => {
	const { testFunction, timeout } = testMeta;

	const testFail = createHook<onTestFailCallback>((hookError) => {
		consoleError('[onTestFail]', testMeta.title);
		consoleError(hookError);
	});

	const handleError = async (
		error: unknown,
	) => {
		// Remove "jest assertion error" matcherResult object
		if (
			error
			&& typeof error === 'object'
			&& 'matcherResult' in error
			&& error.constructor.name === 'JestAssertionError'
		) {
			delete error.matcherResult;
		}

		consoleError(error);
		process.exitCode = 1;

		await testFail.runHooks(error);

		return error;
	};

	const testFinish = createHook<Callback>(async (hookError) => {
		const error = await handleError(hookError);
		if (!testMeta.error) {
			testMeta.error = error;
		}
	});

	testMeta.startTime = Date.now();
	try {
		await timeLimitFunction(
			testFunction({
				onTestFail: testFail.addHook,
				onTestFinish: testFinish.addHook,
			}),
			timeout,
		);
	} catch (error) {
		testMeta.error = await handleError(error);
	} finally {
		await testFinish.runHooks();
		testMeta.endTime = Date.now();
		logTestResult(testMeta);
	}
};

const allTests: TestMeta[] = [];

process.on('exit', () => {
	logReport(allTests);
});

export const createTest = (
	prefix?: string,
	parentContext?: Context,
): Test => (
	async (
		title,
		testFunction,
		timeout,
	) => {
		if (prefix) {
			title = `${prefix} ${title}`;
		}

		const testMeta = {
			title,
			testFunction,
			timeout,
		};
		allTests.push(testMeta);

		const testRunning = runTest(testMeta);

		if (parentContext) {
			parentContext.pendingTests.push(testRunning);
		}

		await testRunning;
	}
);
