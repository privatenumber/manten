import { createDeferred } from './deferred.ts';

const setTimer = (
	duration: number,
	abortController?: AbortController,
) => {
	const deferred = createDeferred();
	const timeoutId = setTimeout(
		() => {
			const error = new Error(`Timeout: ${duration}ms`);
			abortController?.abort(error);
			deferred.reject(error);
		},
		duration,
	);

	return Object.assign(deferred, { timeoutId });
};

export const timeLimitFunction = (
	promise: void | Promise<void>,
	timeout: number | undefined,
	abortController?: AbortController,
) => {
	if (
		!promise
		|| !('then' in promise)
		|| timeout === undefined
		|| timeout === 0
	) {
		return promise;
	}

	const timer = setTimer(timeout, abortController);
	return Promise.race([
		promise,
		timer,
	]).finally(() => {
		clearTimeout(timer.timeoutId);
	});
};
