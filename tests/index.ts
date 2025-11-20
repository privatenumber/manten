import { describe } from 'manten';

describe('manten', ({ runTestSuite }) => {
	runTestSuite(import('./specs/abort-signal.js'));
	runTestSuite(import('./specs/api.js'));
	runTestSuite(import('./specs/async.js'));
	runTestSuite(import('./specs/describe-timeout.js'));
	runTestSuite(import('./specs/filtering.js'));
	runTestSuite(import('./specs/hooks.js'));
	runTestSuite(import('./specs/nesting.js'));
	runTestSuite(import('./specs/parallel.js'));
	runTestSuite(import('./specs/process-timeout.js'));
	runTestSuite(import('./specs/reporting.js'));
	runTestSuite(import('./specs/retry.js'));
	runTestSuite(import('./specs/test-suites.js'));
});

test('skip', async ({ onTestFail }) => {
	const testProcess = await execaNode('./tests/specs/skip', {
		env,
		all: true,
		reject: false,
	});

	onTestFail(() => {
		console.log(testProcess);
	});

	expect(testProcess.all).toMatch('○ should skip');
	expect(testProcess.all).toMatch('✔ should pass');
	expect(testProcess.all).toMatch('✖ should fail');

	expect(testProcess.stdout).toMatch('1 passed');
	expect(testProcess.stdout).toMatch('1 failed');
	expect(testProcess.stdout).toMatch('1 skipped');
});
