// timers/promise polyfill until Node 12 is deprecated
export const setTimeout = (duration: number) => new Promise((resolve) => {
	global.setTimeout(resolve, duration);
});
