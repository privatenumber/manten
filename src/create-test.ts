import { green, red } from 'kleur/colors'; // eslint-disable-line node/file-extension-in-import
import type { Test, PendingTests } from './types';

const successIcon = green('✔');
const failureIcon = red('✖');

export function createTest(
	prefix?: string,
	pendingTests?: PendingTests,
): Test {
	return async function test(
		title,
		testFunction,
	) {
		if (prefix) {
			title = `${prefix} ${title}`;
		}

		const testRunning = (async () => {
			try {
				await testFunction();
				console.log(successIcon, title);
			} catch (error: any) {
				console.error(failureIcon, title);

				// Remove "jest assertion error" matcherResult object
				if (
					'matcherResult' in error
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
