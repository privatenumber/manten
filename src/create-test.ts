import type {
	Test,
	TestApi,
	TestMeta,
	onTestFailCallback,
	onTestFinishCallback,
	PendingTests,
} from './types.js';
import {
	consoleError,
	logTestResult,
	logReport,
} from './logger.js';

const throwOnTimeout = async (
	duration: number,
	controller: { timeoutId?: NodeJS.Timeout },
) => new Promise((_resolve, reject) => {
	controller.timeoutId = setTimeout(() => {
		reject(new Error(`Timeout: ${duration}ms`));
	}, duration);
});

type Callbacks = {
	onTestFail: onTestFailCallback[];
	onTestFinish: onTestFinishCallback[];
};

const runTest = async (testMeta: TestMeta) => {
	const { testFunction, timeout } = testMeta;
	const callbacks: Callbacks = {
		onTestFail: [],
		onTestFinish: [],
	};

	const api: TestApi = {
		onTestFail(callback) {
			callbacks.onTestFail.push(callback);
		},
		onTestFinish(callback) {
			callbacks.onTestFinish.push(callback);
		},
	};

	testMeta.startTime = Date.now();
	try {
		if (timeout) {
			const controller = { timeoutId: undefined };
			try {
				await Promise.race([
					testFunction(api),
					throwOnTimeout(timeout, controller),
				]);
			} finally {
				clearTimeout(controller.timeoutId);
			}
		} else {
			await testFunction(api);
		}
	} catch (error) {
		testMeta.error = error as Error;

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
			await onTestFail(error as Error);
		}
	} finally {
		testMeta.endTime = Date.now();
		logTestResult(testMeta);

		for (const onTestFinish of callbacks.onTestFinish) {
			await onTestFinish();
		}
	}
};

const allTests: TestMeta[] = [];

process.on('exit', () => {
	logReport(allTests);
});

export function createTest(
	prefix?: string,
	pendingTests?: PendingTests,
): Test {
	return async function test(
		title,
		testFunction,
		timeout,
	) {
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

		if (pendingTests) {
			pendingTests.push(testRunning);
		}

		await testRunning;
	};
}
