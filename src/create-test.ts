import type {
	Test,
	TestApi,
	TestMeta,
	onTestFailCallback,
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

const runTest = async (testMeta: TestMeta) => {
	const { testFunction, timeout } = testMeta;

	let onTestFail: undefined | onTestFailCallback;
	const api: TestApi = {
		onTestFail(callback) {
			onTestFail = callback;
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

		testMeta.endTime = Date.now();
		logTestResult(testMeta);
	} catch (error: any) {
		testMeta.endTime = Date.now();
		testMeta.error = error;
		logTestResult(testMeta);

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

		if (typeof onTestFail === 'function') {
			onTestFail(error);
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
