import type {
	Test,
	TestApi,
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

type Callbacks = {
	onTestFail: onTestFailCallback[];
	onTestFinish: Callback[];
};

const runTest = async (testMeta: TestMeta) => {
	const { testFunction, timeout } = testMeta;
	const callbacks: Callbacks = {
		onTestFail: [],
		onTestFinish: [],
	};

	const api: TestApi = {
		onTestFail: (callback) => {
			callbacks.onTestFail.push(callback);
		},
		onTestFinish: (callback) => {
			callbacks.onTestFinish.push(callback);
		},
	};

	const handleError = async (error: Error) => {
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

		for (const onTestFail of callbacks.onTestFail) {
			try {
				await onTestFail(error as Error);
			} catch (hookError) {
				consoleError('[onTestFail]', testMeta.title);
				consoleError(hookError);
			}
		}

		return error;
	};

	testMeta.startTime = Date.now();

	try {
		await timeLimitFunction(testFunction(api), timeout);
	} catch (error) {
		testMeta.error = await handleError(error as Error);
	} finally {
		for (const onTestFinish of callbacks.onTestFinish) {
			try {
				await onTestFinish();
			} catch (_error) {
				const error = await handleError(_error as Error);
				if (!testMeta.error) {
					testMeta.error = error;
				}
			}
		}

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
