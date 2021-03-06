// @ts-expect-error execa is ESM
import { execaNode } from 'execa';
import { test, expect, describe } from '#manten';

test('Failures should exit with 1', async () => {
	const testProcess = await execaNode('./tests/specs/test-fail').catch(error => error);

	expect(testProcess.exitCode).toBe(1);
	expect(testProcess.stdout).toBe('');
	expect(testProcess.stderr).toMatch('Expected: 2');
});

test('synchronous', async () => {
	const testProcess = await execaNode('./tests/specs/synchronous');

	expect(testProcess.exitCode).toBe(0);
	expect(testProcess.stdout).toBe('a\nb\nc\n✔ Async\n✔ B\n✔ C');
});

describe('asynchronous', ({ test }) => {
	test('sequential', async () => {
		const testProcess = await execaNode('./tests/specs/asynchronous-sequential');

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toBe('✔ A\n✔ Group › B\n✔ Group › B\n✔ Group - async › C\n✔ Group - async › D\n✔ Group - async › Test suite - Group › A\n✔ Group - async › Test suite - Group › B\n✔ Group - async › Test suite - Group Async › C\n✔ Group - async › Test suite - Group Async › D\n✔ Group - async › Test suite - E\n✔ E');
	});

	test('concurrent', async () => {
		const testProcess = await execaNode('./tests/specs/asynchronous-concurrent');

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toBe('✔ B\n✔ C\n✔ A');
	});

	test('timeout', async () => {
		const testProcess = await execaNode('./tests/specs/asynchronous-timeout', {
			reject: false,
		});

		expect(testProcess.exitCode).toBe(1);
		expect(testProcess.stderr).toMatch('✖ should fail');
		expect(testProcess.stderr).toMatch('Error: Timeout: 1ms');
	});
});
