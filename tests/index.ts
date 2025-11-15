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
			'✔ B',
			'✔ C',
			'✔ A',
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
