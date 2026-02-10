import { describe } from 'manten';

describe('manten', async () => {
	await import('./specs/abort-signal.js');
	await import('./specs/api.js');
	await import('./specs/async.js');
	await import('./specs/describe-timeout.js');
	await import('./specs/filtering.js');
	await import('./specs/hooks.js');
	await import('./specs/nesting.js');
	await import('./specs/parallel.js');
	await import('./specs/process-timeout.js');
	await import('./specs/reporting.js');
	await import('./specs/retry.js');
	await import('./specs/skip.js');
	await import('./specs/snapshots.js');
	await import('./specs/snapshots-serialize.js');
});
