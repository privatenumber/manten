import type { Describe, Context, PendingTests } from './types.js';
import { createTest } from './create-test.js';

/**
 * This accepts a promises array that can have more promises
 * in it by the time every promise is resolved.
 *
 * This keeps waiting on the new it until the promises array
 * is empty.
 */
async function waitAllPromises(promises: Promise<any>[]) {
	while (promises.length > 0) {
		const currentPromises = promises.splice(0);
		await Promise.all(currentPromises);
	}
}

export function createDescribe(
	prefix?: string,
	pendingTests?: PendingTests,
): Describe {
	return async function describe(
		description,
		callback,
	) {
		if (prefix) {
			description = `${prefix} ${description}`;
		}

		const childTests: PendingTests = [];
		try {
			const inProgress = (async () => {
				const context: Context = {
					test: createTest(`${description} ›`, childTests),
					describe: createDescribe(`${description} ›`, childTests),
					runTestSuite: (
						testSuite,
						...args
					) => {
						const runningTestSuite = (async () => {
							let maybeTestSuiteModule = await testSuite;

							if ('default' in maybeTestSuiteModule) {
								maybeTestSuiteModule = maybeTestSuiteModule.default;
							}

							/**
							 * When ESM is compiled to CJS, it's possible the entire module
							 * gets assigned as an object o default. In this case,
							 * it needs to be unwrapped again.
							 */
							if ('default' in maybeTestSuiteModule) {
								maybeTestSuiteModule = maybeTestSuiteModule.default;
							}

							return maybeTestSuiteModule.apply(context, args);
						})();

						childTests.push(runningTestSuite);

						return runningTestSuite;
					},
				};

				await callback(context);
				await waitAllPromises(childTests);
			})();

			if (pendingTests) {
				pendingTests.push(inProgress);
			}

			await inProgress;
		} catch (error) {
			console.error(error);
		}
	};
}
