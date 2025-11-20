import { createDeferred } from './deferred.js';

const setTimer = (
	duration: number,
) => {
	const deferred = createDeferred();
	const timeoutId = setTimeout(
		() => deferred.reject(new Error(`Timeout: ${duration}ms`)),
		duration,
	);

	return Object.assign(deferred, { timeoutId });
};

export const timeLimitFunction = (
	promise: void | Promise<void>,
	timeout: number | undefined,
) => {
	if (
		!promise
		|| !('then' in promise)
		|| timeout === undefined
		|| timeout === 0
	) {
		return promise;
	}

	const timer = setTimer(timeout);
	return Promise.race([
		promise,
		timer,
	]).finally(() => {
		clearTimeout(timer.timeoutId);
	});
};
