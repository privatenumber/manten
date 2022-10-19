import { green, red } from 'kleur/colors'; // eslint-disable-line node/file-extension-in-import
import type { Test, PendingTests } from './types';

const successIcon = green('✔');
const failureIcon = red('✖');

const throwOnTimeout = async (
	duration: number,
	controller: { timeoutId?: NodeJS.Timeout },
) => new Promise((resolve, reject) => {
	controller.timeoutId = setTimeout(() => {
		reject(new Error(`Timeout: ${duration}ms`));
	}, duration);
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

		const testRunning = (async () => {
			try {
				if (timeout) {
					const controller = { timeoutId: undefined };
					try {
						await Promise.race([
							testFunction(),
							throwOnTimeout(timeout, controller),
						]);
					} finally {
						clearTimeout(controller.timeoutId);
					}
				} else {
					await testFunction();
				}

				console.log(successIcon, title);
			} catch (error: any) {
				console.error(failureIcon, title);

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
			}
		})();

		if (pendingTests) {
			pendingTests.push(testRunning);
		}

		await testRunning;
	};
}
