import os from 'node:os';

type Semaphore = {
	acquire: () => Promise<() => void>;
	setLimit: (newLimit: number) => void;
	cleanup: () => void;
};

export const createSemaphore = (limit: number | 'auto'): Semaphore => {
	let currentLimit = typeof limit === 'number' ? limit : calculateAutoLimit();
	let running = 0;
	const queue: Array<() => void> = [];
	let autoInterval: ReturnType<typeof setInterval> | undefined;

	if (limit === 'auto') {
		// Recalculate concurrency every 5 seconds
		autoInterval = setInterval(() => {
			const newLimit = calculateAutoLimit();
			if (newLimit !== currentLimit) {
				currentLimit = newLimit;
				// Release queued tasks if limit increased
				while (queue.length > 0 && running < currentLimit) {
					const resolve = queue.shift();
					if (resolve) {
						running += 1;
						resolve();
					}
				}
			}
		}, 5000);

		// Prevent interval from keeping process alive
		autoInterval.unref();
	}

	const acquire = (): Promise<() => void> => {
		if (running < currentLimit) {
			running += 1;
			return Promise.resolve(() => {
				running -= 1;
				// Release next queued task
				const resolve = queue.shift();
				if (resolve) {
					running += 1;
					resolve();
				}
			});
		}

		// Queue and wait for slot
		return new Promise<() => void>((resolve) => {
			queue.push(() => {
				resolve(() => {
					running -= 1;
					// Release next queued task
					const nextResolve = queue.shift();
					if (nextResolve) {
						running += 1;
						nextResolve();
					}
				});
			});
		});
	};

	const setLimit = (newLimit: number): void => {
		currentLimit = newLimit;
		// Release queued tasks if limit increased
		while (queue.length > 0 && running < currentLimit) {
			const resolve = queue.shift();
			if (resolve) {
				running += 1;
				resolve();
			}
		}
	};

	const cleanup = (): void => {
		if (autoInterval) {
			clearInterval(autoInterval);
		}
	};

	return {
		acquire,
		setLimit,
		cleanup,
	};
};

const calculateAutoLimit = (): number => {
	const cpuCount = os.cpus().length;
	const loadAverage = os.loadavg()[0]; // 1-minute average

	// Note: os.loadavg() always returns [0, 0, 0] on Windows
	// This causes the formula to effectively return cpuCount (no dynamic throttling)
	// On Unix systems (macOS, Linux), load average is reported correctly

	// Reduce concurrency proportionally to CPU load (0-80% reduction)
	// Formula: cpuCount * (1 - min(load/cpuCount, 0.8))
	const concurrency = Math.max(
		1,
		Math.min(
			Math.floor(cpuCount * (1 - Math.min(loadAverage / cpuCount, 0.8))),
			cpuCount,
		),
	);

	return concurrency;
};
