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
	promise: unknown,
	timeout: number | undefined,
) => {
	const isPromise = promise && typeof promise === 'object' && 'then' in promise;
	if (
		!isPromise
		|| timeout === undefined
		|| timeout === 0
	) {
		return promise;
	}

	const timer = setTimer(timeout);
	return Promise.race([
		promise as Promise<unknown>,
		timer,
	]).finally(() => {
		clearTimeout(timer.timeoutId);
	});
};
