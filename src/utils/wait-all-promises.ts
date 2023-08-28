/**
 * This accepts a promises array that can have more promises
 * in it by the time every promise is resolved.
 *
 * This keeps waiting on the new it until the promises array
 * is empty.
 */
export const waitAllPromises = async (
	promises: Promise<unknown>[],
) => {
	while (promises.length > 0) {
		const currentPromises = promises.splice(0);
		await Promise.all(currentPromises);
	}
};
