/**
 * Links a child AbortController to a parent AbortSignal so the child
 * aborts whenever the parent does (propagating the reason).
 *
 * Returns a cleanup function to remove the listener.
 */
export const linkAbortSignal = (
	child: AbortController,
	parent: AbortSignal,
): (() => void) => {
	const handler = () => {
		if (!child.signal.aborted) {
			child.abort(parent.reason);
		}
	};
	parent.addEventListener('abort', handler);

	// Check if parent already aborted (missed the event)
	if (parent.aborted) {
		handler();
	}

	return () => parent.removeEventListener('abort', handler);
};
