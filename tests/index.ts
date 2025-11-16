import { execaNode } from 'execa';
import { expectMatchInOrder } from './utils/expect-match-in-order.js';
import { test, expect, describe } from '#manten';

const env = { NODE_DISABLE_COLORS: '0' };

test('Should prevent console.log hijack', async () => {
	const testProcess = await execaNode('./tests/specs/hijack-console-log', {
		env,
		reject: false,
	});

	expect(testProcess.exitCode).toBe(0);
	expect(testProcess.stdout).toMatch('✔ should log\n');
	expect(testProcess.stdout).toMatch('1 passed');
	expect(testProcess.stdout).not.toMatch('failed');
});

test('describe should error', async () => {
	const testProcess = await execaNode('./tests/specs/describe-error', {
		env,
		reject: false,
	});

	expect(testProcess.exitCode).toBe(1);
	expect(testProcess.stderr).toMatch('Error: Error');
});

test('Failures should exit with 1', async () => {
	const testProcess = await execaNode('./tests/specs/test-fail', {
		env,
		reject: false,
	});

	expect(testProcess.exitCode).toBe(1);
	expect(testProcess.stderr).toMatch('Expected: 2');
	expect(testProcess.stdout).toMatch('0 passed\n1 failed');
});

test('synchronous', async () => {
	const testProcess = await execaNode('./tests/specs/synchronous', { env });

	expect(testProcess.exitCode).toBe(0);
	expect(testProcess.stdout).toMatch('a\nb\nc\n✔ Async\n✔ B\n✔ C');
	expect(testProcess.stdout).toMatch('3 passed');
});

describe('asynchronous', ({ test }) => {
	test('sequential', async ({ onTestFail }) => {
		const testProcess = await execaNode('./tests/specs/asynchronous-sequential', { env });

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expectMatchInOrder(testProcess.stdout, [
			'✔ A\n',
			'✔ Group › B\n',
			'✔ Group › B\n',
			'✔ Group - async › C\n',
			'✔ Group - async › Test suite - Group › A\n',
			'✔ Group - async › Test suite - Group › B\n',
			'✔ Group - async › Test suite - Group Async › C\n',
			'✔ Group - async › Test suite - Group Async › D\n',
			/✔ Group - async › Test suite - E \(\d+ms\)\n/,
			/✔ Group - async › Test suite 2 › Test \(\d+ms\)\n/,
			'✔ Group - async › D\n',
			'✔ E\n',
			'\n',
			/\d+ms\n/,
			'12 passed\n',
		]);
		expect(testProcess.stdout).not.toMatch('failed');
	});

	test('concurrent', async () => {
		const testProcess = await execaNode('./tests/specs/asynchronous-concurrent', { env });

		expect(testProcess.exitCode).toBe(0);
		expectMatchInOrder(testProcess.stdout, [
			/✔ B \(\d+ms\)/,
			/✔ C \(\d+ms\)/,
			/✔ A \(\d+ms\)/,
		]);
		expect(testProcess.stdout).toMatch('3 passed');
		expect(testProcess.stdout).not.toMatch('failed');
	});

	test('timeout', async () => {
		const testProcess = await execaNode('./tests/specs/asynchronous-timeout', {
			env,
			all: true,
			reject: false,
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('✖ should fail');
		expect(testProcess.stderr).toMatch('Error: Timeout: 1ms');
	});
});

test('hooks', async ({ onTestFail }) => {
	const testProcess = await execaNode('./tests/specs/hooks', {
		env,
		all: true,
		reject: false,
	});

	onTestFail(() => {
		console.log(testProcess);
	});

	expect(testProcess.exitCode).toBe(1);
	expectMatchInOrder(testProcess.stdout, [
		'test start',
		'test error hello',
		'test finish',
		'test suite start',
		'test suite describe start',
		'test suite describe finish',
		'test suite finish',
		'describe finish',
	]);
	expectMatchInOrder(testProcess.stderr, [
		'✖ describe › hooks\n',
		'    Error: hello\n',

		'✖ describe › failing hooks\n',
		'    Error: hello\n',

		'✖ describe › failing hooks [onTestFail]\n',
		'    Error: onTestFail\n',

		'✖ describe › failing hooks [onTestFinish]\n',
		'    Error: onTestFinish\n',
	]);
});

test('retry', async ({ onTestFail }) => {
	const testProcess = await execaNode('./tests/specs/retry', {
		env,
		all: true,
		reject: false,
	});

	onTestFail(() => {
		console.log(testProcess);
	});

	expect(testProcess.all).toMatch('✖ retry › should fail 5 times (5/5)');

	expect(testProcess.all).toMatch('✖ retry › should pass on 3rd try (2/5)');
	expect(testProcess.all).toMatch('✔ retry › should pass on 3rd try (3/5)');
	expect(testProcess.all).not.toMatch('retry › should pass on 3rd try (4/5)');

	expect(testProcess.stdout).toMatch('1 passed');
	expect(testProcess.stdout).toMatch('1 failed');
});

describe('TESTONLY filtering', ({ test }) => {
	test('filters by substring match', async ({ onTestFail }) => {
		const testProcess = await execaNode('./tests/specs/testonly-filter', {
			env: {
				...env,
				TESTONLY: 'Test A',
			},
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('✔ Test A');
		expect(testProcess.stdout).not.toMatch('✔ Test B');
		expect(testProcess.stdout).not.toMatch('✔ Group › Test C');
		expect(testProcess.stdout).toMatch('1 passed');
	});

	test('filters with describe prefix', async ({ onTestFail }) => {
		const testProcess = await execaNode('./tests/specs/testonly-filter', {
			env: {
				...env,
				TESTONLY: 'Group',
			},
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).not.toMatch('✔ Test A');
		expect(testProcess.stdout).not.toMatch('✔ Test B');
		expect(testProcess.stdout).toMatch('✔ Group › Test C');
		expect(testProcess.stdout).toMatch('✔ Group › Another Test');
		expect(testProcess.stdout).toMatch('2 passed');
	});

	test('filters with partial match', async ({ onTestFail }) => {
		const testProcess = await execaNode('./tests/specs/testonly-filter', {
			env: {
				...env,
				TESTONLY: 'Another',
			},
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).not.toMatch('✔ Test A');
		expect(testProcess.stdout).not.toMatch('✔ Test B');
		expect(testProcess.stdout).not.toMatch('✔ Group › Test C');
		expect(testProcess.stdout).toMatch('✔ Group › Another Test');
		expect(testProcess.stdout).toMatch('1 passed');
	});

	test('filters with special characters', async ({ onTestFail }) => {
		const testProcess = await execaNode('./tests/specs/testonly-filter', {
			env: {
				...env,
				TESTONLY: '[chars]',
			},
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('✔ Special [chars]');
		expect(testProcess.stdout).not.toMatch('✔ Test A');
		expect(testProcess.stdout).toMatch('1 passed');
	});

	test('no matches skips all tests', async ({ onTestFail }) => {
		const testProcess = await execaNode('./tests/specs/testonly-filter', {
			env: {
				...env,
				TESTONLY: 'NonExistentTest',
			},
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toBe('');
		expect(testProcess.stdout).not.toMatch('✔');
		expect(testProcess.stdout).not.toMatch('passed');
	});

	test('empty string runs all tests', async ({ onTestFail }) => {
		const testProcess = await execaNode('./tests/specs/testonly-filter', {
			env: {
				...env,
				TESTONLY: '',
			},
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('5 passed');
	});
});

describe('unfinished test detection', ({ test }) => {
	test('shows pending symbol for incomplete tests', async ({ onTestFail }) => {
		const testProcess = await execaNode('./tests/specs/unfinished-test.ts', {
			env,
			all: true,
			reject: false,
		});

		onTestFail(() => {
			console.log(testProcess);
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stdout).toMatch('✔ completed test');
		expect(testProcess.stdout).toMatch('• unfinished test');
		expect(testProcess.stdout).toMatch('1 passed');
		expect(testProcess.stdout).toMatch('1 pending');
	});
});

test('retry with timeout interaction', async ({ onTestFail }) => {
	const testProcess = await execaNode('./tests/specs/retry-with-timeout', {
		env,
		all: true,
		reject: false,
	});

	onTestFail(() => {
		console.log(testProcess);
	});

	expect(testProcess.exitCode).toBe(0);
	expect(testProcess.all).toMatch('Timeout: 50ms');
	expect(testProcess.all).toMatch('(3/3)');
	expect(testProcess.stdout).toMatch('1 passed');
});

test('deep context nesting', async ({ onTestFail }) => {
	const testProcess = await execaNode('./tests/specs/deep-nesting', {
		env,
		reject: false,
	});

	onTestFail(() => {
		console.log(testProcess);
	});

	expect(testProcess.exitCode).toBe(0);
	expect(testProcess.stdout).toMatch('✔ Level 1 › Test at level 1');
	expect(testProcess.stdout).toMatch('✔ Level 1 › Level 2 › Test at level 2');
	expect(testProcess.stdout).toMatch('✔ Level 1 › Level 2 › Level 3 › Test at level 3');
	expect(testProcess.stdout).toMatch('✔ Level 1 › Level 2 › Level 3 › Level 4 › Test at level 4');
	expect(testProcess.stdout).toMatch('4 passed');
});
