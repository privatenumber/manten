import type {
	Describe,
} from './types.js';
// eslint-disable-next-line import-x/no-cycle
import {
	createContext,
	type Context,
} from './create-context.js';

export const createDescribe = (
	prefix?: string,
	parentContext?: Context,
): Describe => (
	async (
		description,
		callback,
	) => {
		if (prefix) {
			description = `${prefix} ${description}`;
		}

		const context = createContext(description);
		await context.run(callback, parentContext);
	}
);
