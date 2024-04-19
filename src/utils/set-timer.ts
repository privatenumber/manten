import { createDeferred } from './deferred.js';

export const setTimer = (
	duration: number,
) => {
	const deferred = createDeferred();
	const timeoutId = setTimeout(
		() => deferred.reject(new Error(`Timeout: ${duration}ms`)),
		duration,
	);

	return Object.assign(deferred, { timeoutId });
};
