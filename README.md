<p align="center">
	<img width="350" src=".github/logo.png">
    <!-- LICENSE https://www.ac-illust.com/main/detail.php?id=22468077 -->
</p>

<h1 align="center">manten</h1>

Tests are scripts. Not a framework.

Write tests in TypeScript, run with `node test.ts`.

No runner, no overhead — just **16 kB**.

```sh
$ node ./tests/index.ts

12:34:56 ✔ adds numbers
12:34:56 ✔ async operation (52ms)
12:34:56 ✔ Auth › login succeeds
12:34:56 ✔ Auth › logout clears session
12:34:56 ✖ broken test

523ms
4 passed
1 failed
```

`✔` passed · `✖` failed · `○` skipped · `•` pending (process exited before test finished)

## Install

```sh
npm i -D manten
```

## Why manten?

### No runner, just Node

Test files are plain scripts — run them directly:

```sh
node tests/test.ts
```

No file discovery, no config files, no abstraction layers. Node.js startup time, nothing more.

### You already know the API

sequential = `await`

concurrent = Remove `await`

That's the entire concurrency model.

```ts
await test('first', async () => { /* ... */ }) // waits

test('second', async () => { /* ... */ }) // runs immediately

test('third', async () => { /* ... */ }) // runs with second
```

### Standalone imports

Every API is a standalone import — no callback destructuring:

```ts
import {
    test, describe, expect, skip, onTestFinish
} from 'manten'
```

Each function automagically knows which test or group it belongs to.

### Tiny

One dependency ([`expect`](https://www.npmjs.com/package/expect) for assertions — swap it for any assertion library).

## Quick start

```ts
// tests/test.ts
import { test, expect } from 'manten'

test('adds numbers', () => {
    expect(1 + 1).toBe(2)
})

test('async operation', async () => {
    const result = await fetchData()
    expect(result).toBeDefined()
})
```

```sh
node tests/test.ts
```

> [!TIP]
> Node.js 22.6+ runs TypeScript natively — no loaders needed.

## Core concepts

### Async flow control

Tests execute immediately when `test()` is called. Use `await` to control ordering:

```ts
// Sequential
await test('step 1', async () => { /* ... */ })
await test('step 2', async () => { /* ... */ }) // runs after step 1

// Concurrent
test('independent A', async () => { /* ... */ })
test('independent B', async () => { /* ... */ }) // runs with A
```

### Grouping with describe

```ts
import { describe, test } from 'manten'

await describe('Auth', () => {
    test('login', async () => { /* ... */ }) // Auth › login
    test('logout', async () => { /* ... */ }) // Auth › logout
})

// Runs after both Auth tests complete
test('next', () => { /* ... */ })
```

Awaiting a group waits for all children. Groups nest infinitely.

### Splitting tests across files

Import files inside `describe()` — their tests automatically nest under the parent group:

```ts
// tests/index.ts
import { describe } from 'manten'

describe('my-app', async () => {
    import('./auth.ts')
    import('./api.ts')
    import('./utils.ts')

    // Or add `await` to run files sequentially
})
```

```ts
// tests/auth.ts
import { describe, test, expect } from 'manten'

describe('Authentication', () => {
    test('login', () => { /* ... */ })
    test('logout', () => { /* ... */ })
    test('refresh token', () => { /* ... */ })
})
// Output: my-app › Authentication › login
//         my-app › Authentication › logout
//         my-app › Authentication › refresh token
```

Each file works standalone too — `node tests/auth.ts` runs just that file. The entry point is your test runner, written in plain JavaScript.

### Parameterized test files

To pass data into a test file, export a function that wraps a `describe()`:

```ts
// tests/specs/builds.ts
import { describe, test, expect } from 'manten'

export const builds = (nodePath: string) => describe('builds', () => {
    test('compiles', async () => {
        const result = await run(nodePath)
        expect(result.exitCode).toBe(0)
    })
})
```

Since the `describe()` doesn't run until the function is called, these can be statically imported:

```ts
// tests/index.ts
import { builds } from './specs/builds.ts'
import { errors } from './specs/errors.ts'
import { describe } from 'manten'

describe('my-app', async () => {
    for (const nodeVersion of ['v20', 'v22', 'v24']) {
        const node = await getNode(nodeVersion)
        await describe(`Node ${node.version}`, () => {
            builds(node.path)
            errors(node.path)
        })
    }
})
```

### Watch mode

```sh
node --watch tests/index.ts
```

Built into [Node.js](https://nodejs.org/api/cli.html#--watch) (stable since v22). Watches all imported files — change any test file, tests re-run automatically.

## Features

### Timeouts & abort signals

Pass a timeout (ms) as the third argument. The test receives an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) for cooperative cancellation:

```ts
test('fetch with timeout', async ({ signal }) => {
    await fetch('https://api.example.com', { signal })
}, 5000)
```

For multi-step tests, use [`signal.throwIfAborted()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/throwIfAborted) between operations. Combine with your own signals using [`AbortSignal.any()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static).

### Retries

```ts
test('flaky API', async () => {
    await unreliableAPI()
}, {
    timeout: 5000,
    retry: 3
})
```

Output shows which attempt succeeded: `✔ flaky API (2/3)`.

### Hooks

```ts
import { test, onTestFail, onTestFinish } from 'manten'

test('with cleanup', async () => {
    const resource = await acquire()
    onTestFinish(() => resource.cleanup()) // runs after test (pass or fail)
    onTestFail(error => console.log('Debug:', error))
})
```

`onFinish` runs after all tests in a `describe()`:

```ts
import { describe, test, onFinish } from 'manten'

describe('Database', async () => {
    const database = await connect()
    onFinish(() => database.close())

    test('query', () => { /* ... */ })
})
```

### Skipping

```ts
import { test, skip } from 'manten'

test('linux only', () => {
    if (process.platform !== 'linux') {
        skip('Only runs on Linux')
    }
    // ...
})
```

Skip entire groups — `skip()` must be called before any `test()` or nested `describe()`:

```ts
describe('GPU tests', () => {
    if (!hasGPU) {
        skip('GPU not available')
    }
    test('render shader', () => { /* ... */ }) // all skipped
})
```

### Snapshot testing

```ts
import { test, expectSnapshot } from 'manten'

test('user state', () => {
    // Named (recommended) — order-independent
    expectSnapshot(getUser(), 'initial state')

    // Auto-numbered — keys become "user state 1", "user state 2", etc.
    expectSnapshot(getUser())
    expectSnapshot(getPermissions())
})
```

Snapshots are stored in `.manten.snap`. Update with `MANTEN_UPDATE_SNAPSHOTS=1 node tests/test.ts`. Without named snapshots, reordering `expectSnapshot()` calls breaks comparisons.

> [!WARNING]
> Snapshots are serialized with [`util.inspect`](https://nodejs.org/api/util.html#utilinspectobject-options), which may produce different output across Node.js versions. If snapshots fail after upgrading Node, re-run with `MANTEN_UPDATE_SNAPSHOTS=1` to regenerate.

### Concurrency limiting

```ts
describe('Database tests', () => {
    test('query 1', async () => { /* ... */ })
    test('query 2', async () => { /* ... */ })
    test('query 3', async () => { /* ... */ })
}, { parallel: 2 }) // max 2 concurrent
```

Options:
- `false` (sequential)
- `true` (unbounded)
- `number` (limit)
- `'auto'` (adapts to CPU load)

Tests that you explicitly `await` run immediately, bypassing the parallel queue — useful for setup/teardown steps within a parallel group.

### Group timeouts

```ts
describe('API suite', () => {
    test('endpoint 1', async () => { /* ... */ })
    test('endpoint 2', async () => { /* ... */ })
}, { timeout: 10_000 })
```

Individual test timeouts still apply — whichever is stricter wins.

### Process timeout

Prevent stuck processes in CI:

```ts
import { setProcessTimeout } from 'manten'

setProcessTimeout(10 * 60 * 1000) // kill after 10 minutes
```

### Filtering

Run specific tests by substring match (case-sensitive). Matches against the full title including describe prefixes:

```sh
TESTONLY='login' node tests/test.ts
TESTONLY='Auth' node tests/test.ts   # matches "Auth › login", "Auth › logout", etc.
```

## API

### test(name, fn, timeoutOrOptions?)

Create and run a test. `fn` always receives `{ signal }` — an `AbortSignal` that aborts on timeout or when the parent group is aborted.

- `timeoutOrOptions`: `number | { timeout?: number, retry?: number }`
- Returns: `Promise<void>`

### describe(name, fn, options?)

Create a test group. `fn` always receives `{ signal }` — an `AbortSignal` that aborts on timeout or when the parent group is aborted.

- `options`: `{ parallel?: boolean | number | 'auto', timeout?: number }`
- Returns: `Promise<void>`

### expect(value)

Jest's [`expect`](https://jestjs.io/docs/expect). Or use [Node.js Assert](https://nodejs.org/api/assert.html), [Chai](https://www.chaijs.com/), etc.

### expectSnapshot(value, name?)

Compare against a stored snapshot. Creates one if none exists. Test names must be unique across all files — duplicates throw an error.

### onTestFail(callback) · onTestFinish(callback)

Hooks for the current test. Must be called within `test()`. Hook errors are logged but don't fail the test.

### onFinish(callback)

Cleanup hook for the current `describe()` group. Errors are logged and set `process.exitCode = 1`.

### skip(reason?)

Skip the current test or describe group.

### setProcessTimeout(ms)

Global timeout for the entire process.

### configure(options)

`{ snapshotPath?: string }` — must be called before any `expectSnapshot()`. Also configurable via `MANTEN_SNAPSHOT_PATH` and `MANTEN_UPDATE_SNAPSHOTS` env vars.

## TypeScript

Manten is written in TypeScript. All APIs are fully typed, and `Test`/`Describe` types are exported for advanced use cases.

## FAQ

### What does manten mean?

Manten (まんてん, 満点) means "maximum points" or 100% in Japanese.

### Why no test runner?

No runner = zero overhead. No file discovery, no spawning processes, no config. Tests are scripts — run them however you want.

### Why no beforeAll/beforeEach?

Manten runs tests concurrently by default. Shared setup hooks don't compose with concurrent execution. Inline setup in each test, or use `describe()` + `onFinish()` for shared resources.

### How does manten report failures to CI?

When a test fails, manten sets `process.exitCode = 1` but doesn't force-exit. All remaining tests run to completion, and the final report prints on the `exit` event. CI systems pick up the non-zero exit code automatically.

## Related

### [fs-fixture](https://github.com/privatenumber/fs-fixture)

Create disposable file system fixtures for testing. Pairs naturally with manten's hooks:

```ts
import { createFixture } from 'fs-fixture'
import { test, expect } from 'manten'

test('reads config', async () => {
    await using fixture = await createFixture({
        'package.json': JSON.stringify({ name: 'my-app' }),
        'src/index.js': 'export default 42'
    })

    const result = await readPackageJson(fixture.path)
    expect(result.name).toBe('my-app')
}) // fixture auto-cleaned up when test scope exits
```

## Sponsors

<p align="center">
	<a href="https://github.com/sponsors/privatenumber">
		<img src="https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg">
	</a>
</p>
