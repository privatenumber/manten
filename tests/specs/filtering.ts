import { createFixture } from 'fs-fixture';
import { installManten, node } from '../utils/spec-helpers.js';
import { testSuite, expect } from 'manten';

export default testSuite('filtering', ({ test }) => {
	test('filters by substring match', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			test('should run', () => {});
			test('should skip', () => {});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'), {
			env: { TESTONLY: 'run' },
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('✔ should run');
		expect(testProcess.stdout).not.toMatch('skip');
		expect(testProcess.stdout).toMatch('1 passed');
	});

	test('filters with partial match', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			test('authentication test', () => {});
			test('authorization test', () => {});
			test('other test', () => {});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'), {
			env: { TESTONLY: 'auth' },
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('✔ authentication test');
		expect(testProcess.stdout).toMatch('✔ authorization test');
		expect(testProcess.stdout).not.toMatch('other test');
		expect(testProcess.stdout).toMatch('2 passed');
	});

	test('filters with describe prefix', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { describe } from 'manten';

			await describe('API', ({ test }) => {
				test('GET /users', () => {});
				test('POST /users', () => {});
			});

			await describe('Database', ({ test }) => {
				test('connect', () => {});
			});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'), {
			env: { TESTONLY: 'API' },
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('✔ API › GET /users');
		expect(testProcess.stdout).toMatch('✔ API › POST /users');
		expect(testProcess.stdout).not.toMatch('Database');
		expect(testProcess.stdout).toMatch('2 passed');
	});

	test('filters with special characters', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			test('test with [brackets]', () => {});
			test('test with (parens)', () => {});
			test('other test', () => {});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'), {
			env: { TESTONLY: '[brackets]' },
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('✔ test with [brackets]');
		expect(testProcess.stdout).not.toMatch('parens');
		expect(testProcess.stdout).toMatch('1 passed');
	});

	test('empty string runs all tests', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			test('test 1', () => {});
			test('test 2', () => {});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'), {
			env: { TESTONLY: '' },
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).toMatch('✔ test 1');
		expect(testProcess.stdout).toMatch('✔ test 2');
		expect(testProcess.stdout).toMatch('2 passed');
	});

	test('no matches skips all tests', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
			import { test } from 'manten';

			test('test 1', () => {});
			test('test 2', () => {});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('index.mjs'), {
			env: { TESTONLY: 'nonexistent' },
		});

		expect(testProcess.exitCode).toBe(0);
		expect(testProcess.stdout).not.toMatch('✔');
		expect(testProcess.stdout).not.toMatch('passed');
	});
});
