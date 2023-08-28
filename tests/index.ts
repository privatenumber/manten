import { execaNode } from 'execa';
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
	test('sequential', async () => {
		const testProcess = await execaNode('./tests/specs/asynchronous-sequential', { env });

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch(/✔ A\n✔ Group › B\n✔ Group › B\n✔ Group - async › C\n✔ Group - async › D\n✔ Group - async › Test suite - Group › A\n✔ Group - async › Test suite - Group › B\n✔ Group - async › Test suite - Group Async › C\n✔ Group - async › Test suite - Group Async › D\n✔ Group - async › Test suite - E \(\d+ms\)\n✔ E/);
		expect(testProcess.stdout).toMatch('11 passed');
		expect(testProcess.stdout).not.toMatch('failed');
	});

	test('concurrent', async () => {
		const testProcess = await execaNode('./tests/specs/asynchronous-concurrent', { env });

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('✔ B\n✔ C\n✔ A');
		expect(testProcess.stdout).toMatch('3 passed');
		expect(testProcess.stdout).not.toMatch('failed');
	});

	test('timeout', async () => {
		const startTime = Date.now();
		const testProcess = await execaNode('./tests/specs/asynchronous-timeout', {
			env,
			reject: false,
		});

		const elapsed = Date.now() - startTime;
		expect(elapsed).toBeLessThan(2000);
		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('✖ should fail');
		expect(testProcess.stderr).toMatch('Error: Timeout: 1ms');
	});
});

test('hooks', async () => {
	const testProcess = await execaNode('./tests/specs/hooks', {
		env,
		reject: false,
	});

	expect(testProcess.exitCode).toBe(1);
	const { stdout } = testProcess;
	const expectedOrder = [
		'test start',
		'test error hello',
		'test finish',
		'test suite start',
		'test suite describe start',
		'test suite describe finish',
		'describe finish',
		'test suite finish',
	];

	const matches = expectedOrder
		.map(line => [line, stdout.indexOf(line)] as const)
		.sort((lineA, lineB) => lineA[1] - lineB[1])
		.map(([line]) => line);

	expect(matches).toStrictEqual(expectedOrder);
});
