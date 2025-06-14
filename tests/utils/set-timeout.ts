// 'timers/promises' polyfill until Node 12 is deprecated
export const setTimeout = (
	duration: number,
) => new Promise((resolve) => {
	globalThis.setTimeout(resolve, duration);
});
