# Migration Guide

Migrating from manten v1 (callback destructuring) to v2 (standalone imports via AsyncLocalStorage).

## Quick Summary

**Before:** APIs accessed via callback destructuring

```ts
import { describe, testSuite } from 'manten'

describe('App', ({
    test, describe, onFinish, skip
}) => {
    test('works', ({ onTestFail, expectSnapshot }) => {
        // ...
    })
})

export default testSuite(({ test }, parameter) => {
    // ...
})
```

**After:** APIs are standalone imports, callbacks only receive `{ signal }`

```ts
import {
    describe, test, onFinish, skip, onTestFail, expectSnapshot
} from 'manten'

describe('App', () => {
    test('works', () => {
        // ...
    })
})
```

## Step-by-Step Migration

### 1. Remove callback destructuring from `describe`

```diff
-describe('Group', ({ test, describe, onFinish, skip }) => {
+describe('Group', () => {
```

If the callback uses `signal`, keep it:

```diff
-describe('Group', ({ test, signal }) => {
+describe('Group', ({ signal }) => {
```

### 2. Remove callback destructuring from `test`

```diff
-test('name', ({ onTestFail, onTestFinish, skip, expectSnapshot }) => {
+test('name', () => {
```

If the callback uses `signal`, keep it:

```diff
-test('name', ({ signal, onTestFail }) => {
+test('name', ({ signal }) => {
```

### 3. Add standalone imports

Add any APIs that were destructured from callbacks to the import statement:

```diff
-import { describe } from 'manten';
+import { describe, test, onFinish, skip } from 'manten';
```

```diff
-import { testSuite, expect } from 'manten';
+import { describe, test, expect, onTestFail } from 'manten';
```

Full list of standalone imports:

| API | Previously from | Now |
| --- | --- | --- |
| `test` | `describe` callback | `import { test } from 'manten'` |
| `describe` | `describe` callback | `import { describe } from 'manten'` |
| `onFinish` | `describe` callback | `import { onFinish } from 'manten'` |
| `skip` | `describe`/`test` callback | `import { skip } from 'manten'` |
| `onTestFail` | `test` callback | `import { onTestFail } from 'manten'` |
| `onTestFinish` | `test` callback | `import { onTestFinish } from 'manten'` |
| `expectSnapshot` | `test` callback | `import { expectSnapshot } from 'manten'` |

### 4. Replace `testSuite` + `runTestSuite` with `describe` + `import()`

`testSuite` and `runTestSuite` are removed. There are two replacement patterns:

#### Pattern A: Self-executing files (no parameters)

Files with a top-level `describe()` that runs on import. These files are also independently runnable as `node file.ts`.

**Must use dynamic `import()` inside a `describe()` block** — the import executes the top-level `describe()`, which registers with the parent context via AsyncLocalStorage.

Spec file:

```diff
-import { testSuite, expect } from 'manten';
+import { describe, test, expect } from 'manten';

-export default testSuite('Auth', ({ test }) => {
+describe('Auth', () => {
     test('login', () => {
         expect(true).toBe(true);
     });
 });
```

Entry point:

```diff
-describe('App', ({ runTestSuite }) => {
-    runTestSuite(import('./specs/auth.js'));
-    runTestSuite(import('./specs/api.js'));
+describe('App', async () => {
+    await import('./specs/auth.ts');
+    await import('./specs/api.ts');
 });
```

#### Pattern B: Exported functions (with parameters)

Files that export a function wrapping a `describe()` call. Since the `describe()` doesn't execute until the function is called, these **can use static `import` at the top of the file**.

Spec file:

```diff
-import { testSuite, expect } from 'manten';
+import { describe, test, expect } from 'manten';

-export default testSuite(({ test }, nodePath: string) => {
-    test('works', async () => {
-        const result = await run(nodePath);
-        expect(result.exitCode).toBe(0);
-    });
-});
+export const builds = (nodePath: string) =>
+    describe('builds', () => {
+        test('works', async () => {
+            const result = await run(nodePath);
+            expect(result.exitCode).toBe(0);
+        });
+    });
```

The export name should match the file name or `describe()` description. Entry point:

```diff
+import { builds } from './specs/builds.ts';
+import { errors } from './specs/errors.ts';

-describe('App', ({ runTestSuite }) => {
-    runTestSuite(import('./specs/builds.js'), nodePath);
-    runTestSuite(import('./specs/errors.js'), nodePath);
+describe('App', () => {
+    builds(nodePath);
+    errors(nodePath);
 });
```

#### Pattern B with nested suites and options

```diff
-import { testSuite } from 'manten';
-
-export default testSuite('builds', ({ runTestSuite }, nodePath: string) => {
-    runTestSuite(import('./output-commonjs.js'), nodePath);
-    runTestSuite(import('./output-module.js'), nodePath);
-}, {
-    parallel: 'auto',
-});
+import { describe } from 'manten';
+import { outputCommonjs } from './output-commonjs.ts';
+import { outputModule } from './output-module.ts';
+
+export const builds = (nodePath: string) =>
+    describe('builds', () => {
+        outputCommonjs(nodePath);
+        outputModule(nodePath);
+    }, {
+        parallel: 'auto',
+    });
```

### 5. Update file extensions

If migrating to native Node.js type stripping (Node 22.6+), change `.js` imports to `.ts`:

```diff
-runTestSuite(import('./specs/auth.js'));
+await import('./specs/auth.ts');
```

### 6. Remove unused imports

After migration, remove `testSuite` and `runTestSuite` from all imports. They no longer exist:

```diff
-import { testSuite, expect } from 'manten';
+import { describe, test, expect } from 'manten';
```

## Removed APIs

| Removed | Replacement |
| --- | --- |
| `testSuite()` | `describe()` + exported function |
| `runTestSuite()` | `await import()` inside `describe()` |
| `TestSuite` type | Not needed |
| `Context` type | Not needed |
| `ContextApi` type | Not needed |
| `TestApi` type | Not needed |

## Unchanged APIs

These work exactly the same:

- `expect()` — Jest assertion library
- `setProcessTimeout(ms)` — process-level timeout
- `configure({ snapshotPath })` — snapshot configuration
- `test(title, fn, timeout)` — timeout as number
- `test(title, fn, { retry, timeout })` — options object
- `describe(title, fn, { parallel, timeout })` — options object

## Common Patterns

### Entry point with parameterized suites

This pattern is common when testing across Node versions:

```diff
-import { describe, setProcessTimeout } from 'manten';
-
-setProcessTimeout(1000 * 60 * 10);
-
-describe('App', async ({ describe }) => {
-    for (const nodeVersion of nodeVersions) {
-        const node = await getNode(nodeVersion);
-        await describe(`Node ${node.version}`, ({ runTestSuite }) => {
-            runTestSuite(import('./specs/builds.js'), node.path);
-            runTestSuite(import('./specs/errors.js'), node.path);
-        });
-    }
-});
+import { describe, setProcessTimeout } from 'manten';
+import { builds } from './specs/builds.ts';
+import { errors } from './specs/errors.ts';
+
+setProcessTimeout(1000 * 60 * 10);
+
+describe('App', async () => {
+    for (const nodeVersion of nodeVersions) {
+        const node = await getNode(nodeVersion);
+        await describe(`Node ${node.version}`, () => {
+            builds(node.path);
+            errors(node.path);
+        });
+    }
+});
```

### Test with hooks and signal

```diff
-test('fetches data', async ({ signal, onTestFail, onTestFinish }) => {
+test('fetches data', async ({ signal }) => {
     const response = await fetch('/api', { signal });
     onTestFail(error => console.log('Response:', response));
     onTestFinish(() => cleanup());
     expect(response.ok).toBe(true);
 });
```

### Describe with onFinish cleanup

```diff
-describe('Database', async ({ test, onFinish }) => {
-    const database = await connect();
-    onFinish(() => database.close());
+describe('Database', async () => {
+    const database = await connect();
+    onFinish(() => database.close());

-    test('query', async () => {
+    test('query', async () => {
         expect(await database.query('SELECT 1')).toBeTruthy();
     });
 });
```

### Describe with skip

```diff
-describe('Linux only', ({ test, skip }) => {
-    if (process.platform !== 'linux') {
-        skip('Not on Linux');
-    }
+describe('Linux only', () => {
+    if (process.platform !== 'linux') {
+        skip('Not on Linux');
+    }

-    test('works', () => {
+    test('works', () => {
         // ...
     });
 });
```

## Recommendations

### Prefer concurrent execution

`test()` and `describe()` return plain promises. Node.js won't exit while promises are still settling, so you don't need to `await` them to keep the process alive. Prefer leaving off `await` to maximize concurrency — only add it when you need ordering guarantees.

### Use a single entry point

Instead of running each test file independently, create a `tests/index.ts` that imports all test files. This gives you one command to run everything and enables `node --watch` across all files.

### Recommended project structure

```
tests/
  specs/       # test files
  utils/       # shared test helpers
  fixtures/    # static test data
  index.ts     # entry point — run this
```
