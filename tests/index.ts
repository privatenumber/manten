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
	expect(testProcess.stdout).toMatch('1 passing');
	expect(testProcess.stdout).not.toMatch('failing');
});

test('Failures should exit with 1', async () => {
	const testProcess = await execaNode('./tests/specs/test-fail', {
		env,
		reject: false,
	});

	expect(testProcess.exitCode).toBe(1);
	expect(testProcess.stderr).toMatch('Expected: 2');
	expect(testProcess.stdout).toMatch('0 passing\n1 failing');
});

test('synchronous', async () => {
	const testProcess = await execaNode('./tests/specs/synchronous', { env });

	expect(testProcess.exitCode).toBe(0);
	expect(testProcess.stdout).toMatch('a\nb\nc\n✔ Async\n✔ B\n✔ C');
	expect(testProcess.stdout).toMatch('3 passing');
});

describe('asynchronous', ({ test }) => {
	test('sequential', async () => {
		const testProcess = await execaNode('./tests/specs/asynchronous-sequential', { env });

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch(/✔ A\n✔ Group › B\n✔ Group › B\n✔ Group - async › C\n✔ Group - async › D\n✔ Group - async › Test suite - Group › A\n✔ Group - async › Test suite - Group › B\n✔ Group - async › Test suite - Group Async › C\n✔ Group - async › Test suite - Group Async › D\n✔ Group - async › Test suite - E \(\d+ms\)\n✔ E/);
		expect(testProcess.stdout).toMatch('11 passing');
		expect(testProcess.stdout).not.toMatch('failing');
	});

	test('concurrent', async () => {
		const testProcess = await execaNode('./tests/specs/asynchronous-concurrent', { env });

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('✔ B\n✔ C\n✔ A');
		expect(testProcess.stdout).toMatch('3 passing');
		expect(testProcess.stdout).not.toMatch('failing');
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
