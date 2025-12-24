import { createFixture } from 'fs-fixture';
import { expectMatchInOrder } from '../utils/expect-match-in-order.js';
import { installManten, node } from '../utils/spec-helpers.js';
import { testSuite, expect } from 'manten';

// Snapshot tests verify that the snapshot functionality works correctly.
// Snapshots are now saved to a single global file using synchronous writes on process exit.
// Values are serialized using util.inspect() with sorted keys for deterministic output.
export default testSuite('Snapshots', ({ test }) => {
	test('Creates new snapshots on first run', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				test('snapshot test', async ({ expectSnapshot }) => {
					const data = { foo: 'bar', count: 42 };
					expectSnapshot(data);
					expectSnapshot('simple string');
					expectSnapshot([1, 2, 3], 'named snapshot');
				});
			`,
			...installManten,
		});

		// First run - create snapshots
		const result = await node(fixture.getPath('test.mjs'), {
			env: {
				MANTEN_UPDATE_SNAPSHOTS: '1',
			},
		});

		expectMatchInOrder(result.stdout, [
			/✔ snapshot test/,
			'1 passed',
			'Snapshots: 📸 3 new',
		]);
	});

	test('Compares with existing snapshots', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				test('snapshot test', async ({ expectSnapshot }) => {
					const data = { foo: 'bar', count: 42 };
					expectSnapshot(data);
				});
			`,
			// util.inspect output format with sorted keys
			'.manten.snap': JSON.stringify({
				'snapshot test 1': "{ count: 42, foo: 'bar' }",
			}, null, 2),
			...installManten,
		});

		// Run and compare with existing snapshot
		const result = await node(fixture.getPath('test.mjs'));

		expectMatchInOrder(result.stdout, [
			/✔ snapshot test/,
			'1 passed',
		]);
	});

	test('Fails when snapshot doesn\'t match', async () => {
		const fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				test('snapshot test', async ({ expectSnapshot }) => {
					const data = { foo: 'baz', count: 100 };  // Different values
					expectSnapshot(data);
				});
			`,
			// util.inspect output format
			'.manten.snap': JSON.stringify({
				'snapshot test 1': "{ count: 42, foo: 'bar' }",
			}, null, 2),
			...installManten,
		});

		// Run and expect failure
		const result = await node(fixture.getPath('test.mjs'));

		expectMatchInOrder(result.stderr, [
			/✖ snapshot test/,
			'Snapshot mismatch',
		]);

		expectMatchInOrder(result.stdout, [
			'1 failed',
		]);
	});

	test('Updates snapshots with environment variable', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				test('snapshot test', async ({ expectSnapshot }) => {
					const data = { foo: 'updated', count: 999 };
					expectSnapshot(data);
				});
			`,
			// util.inspect output format
			'.manten.snap': JSON.stringify({
				'snapshot test 1': "{ count: 1, foo: 'old' }",
			}, null, 2),
			...installManten,
		});

		// Update snapshots
		const result = await node(fixture.getPath('test.mjs'), {
			env: {
				MANTEN_UPDATE_SNAPSHOTS: '1',
			},
		});

		expectMatchInOrder(result.stdout, [
			/✔ snapshot test/,
			'1 passed',
			'Snapshots: ✏️ 1 updated',
		]);

		// Verify the snapshot file was updated (now stores util.inspect string)
		const snapshotContent = await fixture.readFile('.manten.snap', 'utf8');
		const parsed = JSON.parse(snapshotContent);
		expect(parsed['snapshot test 1']).toBe("{ count: 999, foo: 'updated' }");
	});

	test('Named snapshots', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				test('snapshot test', async ({ expectSnapshot }) => {
					expectSnapshot({ data: 1 }, 'first custom name');
					expectSnapshot({ data: 2 }, 'second custom name');
				});
			`,
			...installManten,
		});

		// Create snapshots
		await node(fixture.getPath('test.mjs'), {
			env: {
				MANTEN_UPDATE_SNAPSHOTS: '1',
			},
		});

		// Check the snapshot file
		const snapshotContent = await fixture.readFile('.manten.snap', 'utf8');
		const parsed = JSON.parse(snapshotContent);
		expect(parsed).toHaveProperty('first custom name');
		expect(parsed).toHaveProperty('second custom name');
	});

	test('Multiple tests with multiple snapshots', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				test('first test', async ({ expectSnapshot }) => {
					expectSnapshot('first-1');
					expectSnapshot('first-2');
				});

				test('second test', async ({ expectSnapshot }) => {
					expectSnapshot('second-1');
					expectSnapshot('second-2');
					expectSnapshot('second-3');
				});
			`,
			...installManten,
		});

		// Create snapshots
		const result = await node(fixture.getPath('test.mjs'), {
			env: {
				MANTEN_UPDATE_SNAPSHOTS: '1',
			},
		});

		expectMatchInOrder(result.stdout, [
			/✔ first test/,
			/✔ second test/,
			'2 passed',
			'Snapshots: 📸 5 new',
		]);

		// Check the snapshot file - strings are quoted by util.inspect
		const snapshotContent = await fixture.readFile('.manten.snap', 'utf8');
		const parsed = JSON.parse(snapshotContent);
		expect(parsed['first test 1']).toBe("'first-1'");
		expect(parsed['first test 2']).toBe("'first-2'");
		expect(parsed['second test 1']).toBe("'second-1'");
		expect(parsed['second test 2']).toBe("'second-2'");
		expect(parsed['second test 3']).toBe("'second-3'");
	});

	test('Custom snapshot path', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test, configure } from 'manten';

				configure({ snapshotPath: 'custom-snapshots.snap' });

				test('snapshot test', async ({ expectSnapshot }) => {
					expectSnapshot('custom location');
				});
			`,
			...installManten,
		});

		// Create snapshots
		await node(fixture.getPath('test.mjs'), {
			env: {
				MANTEN_UPDATE_SNAPSHOTS: '1',
			},
		});

		// Verify the snapshot was created at custom path - string is quoted
		const snapshotContent = await fixture.readFile('custom-snapshots.snap', 'utf8');
		const parsed = JSON.parse(snapshotContent);
		expect(parsed['snapshot test 1']).toBe("'custom location'");
	});

	test('Handles sparse arrays', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				test('sparse array snapshot', ({ expectSnapshot }) => {
					const sparse = [1, , 3]; // Sparse array with hole at index 1
					sparse.length = 5; // Extend with more holes
					expectSnapshot(sparse);
				});
			`,
			...installManten,
		});

		// Create snapshot
		await node(fixture.getPath('test.mjs'), {
			env: {
				MANTEN_UPDATE_SNAPSHOTS: '1',
			},
		});

		// Read snapshot - util.inspect shows sparse array format
		const snapshotContent = await fixture.readFile('.manten.snap', 'utf8');
		const parsed = JSON.parse(snapshotContent);
		const snapshot = parsed['sparse array snapshot 1'];

		// util.inspect shows: [ 1, <1 empty item>, 3, <2 empty items> ]
		expect(snapshot).toContain('1');
		expect(snapshot).toContain('3');
		expect(snapshot).toContain('empty item');

		// Run again without update to verify comparison works
		const result = await node(fixture.getPath('test.mjs'));
		expectMatchInOrder(result.stdout, [
			/✔ sparse array snapshot/,
		]);
	});

	test('Same test names in different describe blocks are allowed', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { describe, test } from 'manten';

				describe('Group A', ({ test }) => {
					test('same name', ({ expectSnapshot }) => {
						expectSnapshot('value from Group A');
					});
				});

				describe('Group B', ({ test }) => {
					test('same name', ({ expectSnapshot }) => {
						expectSnapshot('value from Group B');
					});
				});
			`,
			...installManten,
		});

		// Run tests - should NOT throw error since they're in different describe blocks
		const result = await node(fixture.getPath('test.mjs'), {
			env: {
				MANTEN_UPDATE_SNAPSHOTS: '1',
			},
		});

		// Should succeed with both tests passing
		expectMatchInOrder(result.stdout, [
			/✔ Group A › same name/,
			/✔ Group B › same name/,
			'2 passed',
			'Snapshots: 📸 2 new',
		]);

		expect(result.exitCode).toBe(0);

		// Verify the snapshot file - strings are quoted
		const snapshotContent = await fixture.readFile('.manten.snap', 'utf8');
		const parsed = JSON.parse(snapshotContent);
		expect(parsed['Group A › same name 1']).toBe("'value from Group A'");
		expect(parsed['Group B › same name 1']).toBe("'value from Group B'");
	});

	test('Throws error on duplicate test titles in same describe across files', async () => {
		await using fixture = await createFixture({
			'test1.mjs': `
				import { describe } from 'manten';

				describe('Same Group', ({ test }) => {
					test('duplicate name', ({ expectSnapshot }) => {
						expectSnapshot('value from file 1');
					});
				});
			`,
			'test2.mjs': `
				import { describe } from 'manten';

				describe('Same Group', ({ test }) => {
					test('duplicate name', ({ expectSnapshot }) => {
						expectSnapshot('value from file 2');
					});
				});
			`,
			'run-all.mjs': `
				import './test1.mjs';
				import './test2.mjs';
			`,
			...installManten,
		});

		// Run both tests and expect error due to duplicate title
		const result = await node(fixture.getPath('run-all.mjs'), {
			env: {
				MANTEN_UPDATE_SNAPSHOTS: '1',
			},
			reject: false,
		});

		// Should fail with duplicate test title error
		expectMatchInOrder(result.stderr, [
			'Duplicate test title detected: "Same Group › duplicate name"',
			'Test titles must be unique across all files when using global snapshots',
		]);

		expect(result.exitCode).toBe(1);
	});

	test('Throws error on duplicate test titles across files', async () => {
		await using fixture = await createFixture({
			'test1.mjs': `
				import { test } from 'manten';

				test('duplicate name', ({ expectSnapshot }) => {
					expectSnapshot('value from file 1');
				});
			`,
			'test2.mjs': `
				import { test } from 'manten';

				test('duplicate name', ({ expectSnapshot }) => {
					expectSnapshot('value from file 2');
				});
			`,
			'run-all.mjs': `
				import './test1.mjs';
				import './test2.mjs';
			`,
			...installManten,
		});

		// Run both tests and expect error due to duplicate title
		const result = await node(fixture.getPath('run-all.mjs'), {
			env: {
				MANTEN_UPDATE_SNAPSHOTS: '1',
			},
			reject: false,
		});

		// Should fail with duplicate test title error
		expectMatchInOrder(result.stderr, [
			'Duplicate test title detected: "duplicate name"',
			'Test titles must be unique across all files when using global snapshots',
		]);

		expect(result.exitCode).toBe(1);
	});

	test('Throws error when configure is called after snapshots are loaded', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test, configure } from 'manten';

				// Run a test that loads snapshots
				test('first test', ({ expectSnapshot }) => {
					expectSnapshot('value');
				});

				// Try to configure after snapshots are already loaded
				try {
					configure({
						snapshotPath: 'custom-path.snap'
					});
					console.error('ERROR: configure did not throw');
				} catch (error) {
					console.log('Expected error:', error.message);
				}
			`,
			...installManten,
		});

		// Run the test
		const result = await node(fixture.getPath('test.mjs'), {
			env: {
				MANTEN_UPDATE_SNAPSHOTS: '1',
			},
		});

		// Should see the error message
		expectMatchInOrder(result.stdout, [
			'Expected error: configure() must be called before any snapshot tests are run',
			/✔ first test/,
			'1 passed',
			'Snapshots: 📸 1 new',
		]);

		expect(result.exitCode).toBe(0);
	});

	test('Throws error on duplicate snapshot keys', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				// Two tests with the same name across different files would normally
				// cause duplicate keys since we use a single global snapshot file
				test('duplicate test name', async ({ expectSnapshot }) => {
					expectSnapshot('value 1');
					expectSnapshot('value 2', 'duplicate test name 1'); // This will duplicate the auto-generated key
				});
			`,
			...installManten,
		});

		// Run and expect failure due to duplicate key
		const result = await node(fixture.getPath('test.mjs'), {
			env: {
				MANTEN_UPDATE_SNAPSHOTS: '1',
			},
		});

		expectMatchInOrder(result.stderr, [
			/✖ duplicate test name/,
			'Duplicate snapshot key',
			'"duplicate test name 1"',
			'Test names must be unique across all test files',
		]);

		expect(result.exitCode).toBe(1);
	});

	test('Retried tests use same snapshot keys', async () => {
		await using fixture = await createFixture({
			'test.mjs': `
				import { test } from 'manten';

				let attempt = 0;
				test('flaky test', async ({ expectSnapshot }) => {
					attempt++;

					// These should use "flaky test 1" and "flaky test 2"
					// on both attempts (not "flaky test 3" and "flaky test 4" on retry)
					expectSnapshot('value1');
					expectSnapshot('value2');

					if (attempt === 1) {
						throw new Error('First attempt fails');
					}
				}, { retry: 2 });
			`,
			// util.inspect format - strings are quoted
			'.manten.snap': JSON.stringify({
				'flaky test 1': "'value1'",
				'flaky test 2': "'value2'",
			}, null, 2),
			...installManten,
		});

		const result = await node(fixture.getPath('test.mjs'));

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain('✔ flaky test (2/2)');
	});
});
