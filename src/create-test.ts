import { green, red, dim } from 'kolorist';
import prettyMs from 'pretty-ms';
import type {
	Test,
	TestApi,
	onTestFailCallback,
	PendingTests,
} from './types.js';

const successIcon = green('✔');
const failureIcon = red('✖');

const throwOnTimeout = async (
	duration: number,
	controller: { timeoutId?: NodeJS.Timeout },
) => new Promise((_resolve, reject) => {
	controller.timeoutId = setTimeout(() => {
		reject(new Error(`Timeout: ${duration}ms`));
	}, duration);
});

const startTimer = () => {
	const startTime = Date.now();
	return () => {
		const duration = Date.now() - startTime;
		if (duration < 50) {
			return '';
		}

		return ` ${dim(`(${prettyMs(duration)})`)}`;
	};
};

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

		const testRunning = (async () => {
			let onTestFail: undefined | onTestFailCallback;
			const api: TestApi = {
				onTestFail(callback) {
					onTestFail = callback;
				},
			};

			const getDuration = startTimer();
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

				console.log(successIcon, title + getDuration());
			} catch (error: any) {
				console.error(failureIcon, title + getDuration());

				// Remove "jest assertion error" matcherResult object
				if (
					error
					&& typeof error === 'object'
					&& 'matcherResult' in error
					&& error.constructor.name === 'JestAssertionError'
				) {
					delete error.matcherResult;
				}

				console.error(error);
				process.exitCode = 1;

				if (typeof onTestFail === 'function') {
					onTestFail(error);
				}
			}
		})();

		if (pendingTests) {
			pendingTests.push(testRunning);
		}

		await testRunning;
	};
}
