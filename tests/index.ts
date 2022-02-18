import { execaNode } from 'execa';
import { test, expect, describe } from '../dist/index.js';

test('Failures should exit with 1', async () => {
	const testProcess = await execaNode('./tests/specs/test-fail.js').catch(error => error);

	expect(testProcess.exitCode).toBe(1);
	expect(testProcess.stdout).toBe('');
	expect(testProcess.stderr).toMatch('Expected: 2');
});

test('synchronous', async () => {
	const testProcess = await execaNode('./tests/specs/synchronous.js');

	expect(testProcess.exitCode).toBe(0);
	expect(testProcess.stdout).toBe('a\nb\nc\n✔ Async\n✔ B\n✔ C');
});

describe('asynchronous', ({ test }) => {
	test('sequential', async () => {
		const testProcess = await execaNode('./tests/specs/asynchronous-sequential.js');

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toBe('✔ A\n✔ Group > B\n✔ Group > B\n✔ Group - async > C\n✔ Group - async > D\n✔ Group - async > Test suite - Group > A\n✔ Group - async > Test suite - Group > B\n✔ Group - async > Test suite - Group Async > C\n✔ Group - async > Test suite - Group Async > D\n✔ Group - async > Test suite - E\n✔ E');
	});

	test('concurrent', async () => {
		const testProcess = await execaNode('./tests/specs/asynchronous-concurrent.js');

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toBe('✔ B\n✔ C\n✔ A');
	});
});
