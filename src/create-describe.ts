import type {
	Describe,
	PendingTests,
} from './types.js';
import { consoleError } from './logger.js';
import { waitAllPromises } from './utils/wait-all-promises.js';
import { createContext } from './create-context.js';

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

		const context = createContext(description);

		try {
			const inProgress = (async () => {
				await callback(context);
				await waitAllPromises(context.pendingTests);
			})();

			if (pendingTests) {
				pendingTests.push(inProgress);
			}

			await inProgress;
		} catch (error) {
			consoleError(error);
			process.exitCode = 1;
		} finally {
			for (const onFinish of context.callbacks.onFinish) {
				await onFinish();
			}
		}
	};
}
