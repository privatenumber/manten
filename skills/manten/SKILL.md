---
name: manten
description: Manten testing library patterns - standalone imports via AsyncLocalStorage, async tests, describe groups, hooks, snapshots, timeouts, retries, and concurrency. Use when writing tests with manten, running node test files, or setting up a no-config test suite.
---

## Quick Reference

| API | Purpose |
|-----|---------|
| `test(name, fn, opts?)` | Run a single test. Returns `Promise<void>` |
| `describe(name, fn, opts?)` | Group tests. Returns `Promise<void>` |
| `expect(value)` | Jest assertions |
| `expectSnapshot(value, name?)` | Snapshot testing |
| `onTestFail(callback)` | Debug hook (inside `test()`) |
| `onTestFinish(callback)` | Cleanup hook (inside `test()`) |
| `onFinish(callback)` | Cleanup hook (inside `describe()`) |
| `skip(reason?)` | Skip current test or describe group |
| `setProcessTimeout(ms)` | Global process timeout |
| `configure({ snapshotPath? })` | Snapshot configuration |

**All APIs are standalone imports:**

```ts
import {
    test, describe, expect, skip, onTestFail, onTestFinish, onFinish, expectSnapshot
} from 'manten'
```

Each function automatically knows which test or group it belongs to via AsyncLocalStorage.

## Core Pattern: Await Controls Flow

```ts
import { test, expect } from 'manten'

// Concurrent (recommended default)
test('A', async () => { /* ... */ })
test('B', async () => { /* runs simultaneously with A */ })

// Sequential: only await when you need ordering
await test('first', async () => { /* ... */ })
await test('second', async () => { /* runs after first */ })
```

Node.js won't exit while promises are settling, so you don't need `await` to keep the process alive — only to enforce ordering.

## Describe Blocks

```ts
import { describe, test } from 'manten'

describe('Auth', () => {
    test('login', async () => { /* ... */ })
    test('logout', async () => { /* ... */ })
})
```

Nesting:

```ts
describe('Outer', () => {
    test('A', () => { /* ... */ })

    describe('Inner', () => {
        test('B', () => { /* ... */ })
    })
})
```

Awaiting a group waits for all children:

```ts
await describe('Group', () => {
    test('A', async () => { /* ... */ })
    test('B', async () => { /* ... */ })
})
// Both A and B complete before continuing
```

## Timeouts & Retries

`test()` and `describe()` callbacks always receive `{ signal }` — an `AbortSignal` that aborts on timeout or when the parent group is aborted:

```ts
// Timeout (3rd arg as number)
test('fast test', async ({ signal }) => {
    await fetch('/api', { signal })
}, 1000)

// Options object
test('flaky test', async () => {
    await unreliableAPI()
}, {
    timeout: 5000,
    retry: 3
})
```

## Hooks

```ts
import { test, onTestFail, onTestFinish } from 'manten'

test('with cleanup', async () => {
    const resource = await createResource()
    onTestFinish(() => resource.cleanup()) // Always runs
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

Hook errors are logged but don't fail the test. `onFinish` errors set `process.exitCode = 1`.

## Skipping

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
    test('render', () => { /* ... */ }) // All skipped
})
```

## Concurrency Control

```ts
describe('Database tests', () => {
    test('query 1', async () => { /* ... */ })
    test('query 2', async () => { /* ... */ })
    test('query 3', async () => { /* ... */ })
}, { parallel: 2 }) // Max 2 concurrent
```

Options: `false` (sequential), `true` (unbounded), `number` (limit), `'auto'` (adapts to CPU load).

Tests that you explicitly `await` bypass the parallel queue.

## Group Timeouts

```ts
describe('Suite', () => {
    test('A', async () => { /* ... */ })
    test('B', async () => { /* ... */ })
}, { timeout: 10_000 })
```

Individual test timeouts still apply — whichever is stricter wins.

## Snapshot Testing

```ts
import { test, expectSnapshot } from 'manten'

test('user data', () => {
    // Named (recommended) — order-independent
    expectSnapshot(getUser(), 'initial user')

    // Auto-numbered — keys become "user data 1", "user data 2", etc.
    expectSnapshot(getUser())
})
```

Snapshots are stored in `.manten.snap` by default. Serialized with `util.inspect` — output may differ across Node.js versions, so regenerate after upgrading Node.

Update snapshots: `MANTEN_UPDATE_SNAPSHOTS=1 node tests/index.ts`

Configure path via `configure()` or `MANTEN_SNAPSHOT_PATH` env var:

```ts
import { configure } from 'manten'

configure({ snapshotPath: 'custom.snap' })
```

## Splitting Tests Across Files

Import files inside `describe()` — they automatically nest under the parent group:

```ts
// tests/index.ts
import { describe } from 'manten'

describe('my-app', async () => {
    import('./specs/auth.ts')
    import('./specs/api.ts')

    // Or add `await` to run files sequentially
})
```

```ts
// tests/specs/auth.ts
import { describe, test, expect } from 'manten'

describe('Authentication', () => {
    test('login', () => { /* ... */ })
    test('logout', () => { /* ... */ })
})
```

Each file works standalone too — `node tests/specs/auth.ts` runs just that file.

### Parameterized Test Files

Export a function wrapping `describe()` to pass data into test files:

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

Since `describe()` doesn't run until called, these can be statically imported:

```ts
// tests/index.ts
import { builds } from './specs/builds.ts'
import { describe } from 'manten'

describe('my-app', async () => {
    for (const nodeVersion of ['v20', 'v22', 'v24']) {
        const node = await getNode(nodeVersion)
        await describe(`Node ${node.version}`, () => {
            builds(node.path)
        })
    }
})
```

Export names should match the file name or `describe()` description.

## Recommended Project Structure

```
tests/
  specs/       # test files
  utils/       # shared test helpers
  fixtures/    # static test data
  index.ts     # entry point — run this
```

## Running Tests

```sh
# Run tests (Node 22.6+ runs TypeScript natively)
node tests/index.ts

# Watch mode
node --watch tests/index.ts

# Run specific test by substring match (case-sensitive)
TESTONLY='login' node tests/index.ts

# Update snapshots
MANTEN_UPDATE_SNAPSHOTS=1 node tests/index.ts
```

## Process-Level Timeout

```ts
import { setProcessTimeout } from 'manten'

setProcessTimeout(10 * 60 * 1000) // 10 minutes max
```

## Key Behaviors

- **Tests run immediately** — no collection phase. `test()` executes as soon as it's called.
- **No beforeAll/beforeEach** — inline setup in each test, or use `describe()` + `onFinish()` for shared resources.
- **Exit code** — failures set `process.exitCode = 1` but don't force-exit. All tests run to completion.
- **`TESTONLY`** — matches against full title including describe prefixes (e.g. `Auth › login`). Case-sensitive.
- **`signal`** — always provided to `test()` and `describe()` callbacks, not just when timeouts are set.
- **`skip()` in describe** — must be called before any `test()` or nested `describe()`.
- **TypeScript** — all APIs fully typed. `Test` and `Describe` types exported for advanced use cases.

## Migrating from v1

For migrating from manten v1 (callback destructuring) to v2 (standalone imports), see [MIGRATION.md](./MIGRATION.md).

## Related

For disposable file system fixtures, use [`fs-fixture`](https://github.com/privatenumber/fs-fixture) with `await using` for automatic cleanup.
