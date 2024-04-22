export const retry = async (
	callback: (attempt: number) => Promise<void>,
	retryCount: number,
) => {
	for (let attempt = 1; attempt <= retryCount; attempt += 1) {
		try {
			await callback(attempt);
			return;
		} catch (error) {
			if (attempt === retryCount) {
				throw error;
			}
		}
	}
};
