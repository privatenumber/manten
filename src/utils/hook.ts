export const createHook = <T extends (...args: any[]) => unknown>(
	hookError: (error: unknown) => void | Promise<void>,
) => {
	const hooks: T[] = [];
	const addHook = (callback: T) => {
		hooks.push(callback);
	};
	const runHooks = async (
		...args: Parameters<T>
	) => {
		for (const callback of hooks) {
			try {
				await callback(...args);
			} catch (error) {
				await hookError(error);
			}
		}
	};

	return {
		addHook,
		runHooks,
	};
};
