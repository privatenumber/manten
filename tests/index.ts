import { describe } from 'manten';

describe('manten', ({ runTestSuite }) => {
	runTestSuite(import('./specs/abort-signal.js'));
	runTestSuite(import('./specs/api.js'));
	runTestSuite(import('./specs/async.js'));
	runTestSuite(import('./specs/filtering.js'));
	runTestSuite(import('./specs/hooks.js'));
	runTestSuite(import('./specs/nesting.js'));
	runTestSuite(import('./specs/parallel.js'));
	runTestSuite(import('./specs/reporting.js'));
	runTestSuite(import('./specs/retry.js'));
	runTestSuite(import('./specs/test-suites.js'));
});
