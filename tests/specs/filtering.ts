import { createFixture } from 'fs-fixture';
import { execaNode } from 'execa';
import { installManten, node, env } from '../utils/spec-helpers.js';
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

	// Tests for filter message feature
	test('shows filter message when TESTONLY is set', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				test('first test', () => {});
				test('second test', () => {});
				test('third test', () => {});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('test.mjs'), {
			env: { TESTONLY: 'second' },
		});

		// Should show the filter message
		expect(testProcess.stdout).toMatch('Only running tests that match: "second"');
		expect(testProcess.stdout).toMatch('✔ second test');
		expect(testProcess.stdout).toMatch('1 passed');

		// Should NOT run other tests
		expect(testProcess.stdout).not.toMatch('first test');
		expect(testProcess.stdout).not.toMatch('third test');
	});

	test('shows filter message even when no tests match', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				test('first test', () => {});
				test('second test', () => {});
				test('third test', () => {});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('test.mjs'), {
			env: { TESTONLY: 'DOES_NOT_EXIST' },
		});

		// Should still show the filter message
		expect(testProcess.stdout).toMatch('Only running tests that match: "DOES_NOT_EXIST"');

		// Should not run any tests
		expect(testProcess.stdout).not.toMatch('✔');
		expect(testProcess.stdout).not.toMatch('passed');
		expect(testProcess.stdout).not.toMatch('failed');
	});

	test('no filter message when TESTONLY is not set', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				test('first test', () => {});
				test('second test', () => {});
			`,
			...installManten,
		});

		// Run without inheriting TESTONLY from parent process
		const testProcess = await execaNode(fixture.getPath('test.mjs'), {
			env: {
				// Keep essential env vars for node to work properly
				PATH: process.env.PATH,
				HOME: process.env.HOME,
				USER: process.env.USER,
				TMPDIR: process.env.TMPDIR,
				// Add our custom env vars
				...env,
				// Explicitly exclude TESTONLY
			},
			extendEnv: false, // Don't inherit parent process env
			reject: false,
		});

		// Should not show filter message
		expect(testProcess.stdout).not.toMatch('Only running tests that match');

		// Should run all tests
		expect(testProcess.stdout).toMatch('✔ first test');
		expect(testProcess.stdout).toMatch('✔ second test');
		expect(testProcess.stdout).toMatch('2 passed');
	});

	test('filter with quotes in the name', async () => {
		await using fixture = await createFixture({
			'test.mjs': String.raw`
				import { test } from 'manten';

				test('test with "quotes"', () => {});
				test('test with \'single quotes\'', () => {});
				test('normal test', () => {});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('test.mjs'), {
			env: { TESTONLY: '"quotes"' },
		});

		expect(testProcess.stdout).toMatch(String.raw`Only running tests that match: "\"quotes\""`);
		expect(testProcess.stdout).toMatch('✔ test with "quotes"');
		expect(testProcess.stdout).toMatch('1 passed');

		expect(testProcess.stdout).not.toMatch('single quotes');
		expect(testProcess.stdout).not.toMatch('normal test');
	});

	test('filter message appears in dimmed text', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				test('test one', () => {});
			`,
			...installManten,
		});

		// Run with colors enabled to see ANSI codes
		const testProcess = await execaNode(fixture.getPath('test.mjs'), {
			env: {
				TESTONLY: 'test',
				FORCE_COLOR: '1',
				// Essential env vars
				PATH: process.env.PATH,
				HOME: process.env.HOME,
				USER: process.env.USER,
				TMPDIR: process.env.TMPDIR,
			},
			reject: false,
		});

		// Check that the filter message exists and has dim codes around it
		expect(testProcess.stdout).toMatch('Only running tests that match');
		// Check that dim ANSI codes exist in the output (either as \x1b or \u001b)
		expect(testProcess.stdout.includes('\u001B[2m') || testProcess.stdout.includes('\u001B[2m')).toBe(true);
		expect(testProcess.stdout.includes('\u001B[22m') || testProcess.stdout.includes('\u001B[22m')).toBe(true);
	});

	test('case-sensitive filtering', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				test('Test with Capital', () => {});
				test('test with lowercase', () => {});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('test.mjs'), {
			env: { TESTONLY: 'Test' },
		});

		expect(testProcess.stdout).toMatch('Only running tests that match: "Test"');
		expect(testProcess.stdout).toMatch('✔ Test with Capital');
		expect(testProcess.stdout).toMatch('1 passed');

		expect(testProcess.stdout).not.toMatch('lowercase');
	});

	test('filter with nested describe groups', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { describe, test } from 'manten';

				describe('Outer', ({ describe, test }) => {
					describe('Inner', ({ test }) => {
						test('deeply nested test', () => {});
					});
					test('outer test', () => {});
				});

				test('root test', () => {});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('test.mjs'), {
			env: { TESTONLY: 'Inner' },
		});

		expect(testProcess.stdout).toMatch('Only running tests that match: "Inner"');
		expect(testProcess.stdout).toMatch('✔ Outer › Inner › deeply nested test');
		expect(testProcess.stdout).toMatch('1 passed');

		expect(testProcess.stdout).not.toMatch('outer test');
		expect(testProcess.stdout).not.toMatch('root test');
	});

	test('multiple tests with same substring', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				test('user login', () => {});
				test('user logout', () => {});
				test('user registration', () => {});
				test('admin login', () => {});
			`,
			...installManten,
		});

		const testProcess = await node(fixture.getPath('test.mjs'), {
			env: { TESTONLY: 'user' },
		});

		expect(testProcess.stdout).toMatch('Only running tests that match: "user"');
		expect(testProcess.stdout).toMatch('✔ user login');
		expect(testProcess.stdout).toMatch('✔ user logout');
		expect(testProcess.stdout).toMatch('✔ user registration');
		expect(testProcess.stdout).toMatch('3 passed');

		expect(testProcess.stdout).not.toMatch('admin');
	});
});
