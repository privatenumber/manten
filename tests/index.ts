import { describe } from 'manten';

describe('manten', async () => {
	await import('./specs/abort-signal.ts');
	await import('./specs/api.ts');
	await import('./specs/async.ts');
	await import('./specs/describe-timeout.ts');
	await import('./specs/filtering.ts');
	await import('./specs/hooks.ts');
	await import('./specs/nesting.ts');
	await import('./specs/parallel.ts');
	await import('./specs/process-timeout.ts');
	await import('./specs/reporting.ts');
	await import('./specs/retry.ts');
	await import('./specs/skip.ts');
	await import('./specs/snapshots.ts');
	await import('./specs/snapshots-serialize.ts');
});
