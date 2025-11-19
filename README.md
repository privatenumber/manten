<p align="center">
	<img width="350" src=".github/logo.png">
    <!-- LICENSE https://www.ac-illust.com/main/detail.php?id=22468077 -->
</p>

<h1 align="center">満点 (manten)</h1>

**A tiny, async-first testing library for Node.js**

Manten is designed for speed with minimal overhead—just `2.3 kB` and zero dependencies beyond Jest's assertion library. Tests run immediately as plain JavaScript with native `async`/`await` flow control, giving you full control over concurrency without the complexity of a test runner.

### Features
- **Tiny**: `2.3 kB` minified
- **Fast**: No test discovery overhead, tests run as plain Node.js scripts
- **Async-first**: Native `async`/`await` for sequential or concurrent execution
- **Zero config**: No test runner, no transforms—just Node.js
- **Full control**: Manage async flow exactly how you want
- **Strongly typed**: Full TypeScript support

## Install
```sh
npm i -D manten
```

## Quick start

```ts
// tests/test.mjs
import { test, expect } from 'manten'

// Tests run immediately—no collection phase
test('adds numbers', () => {
    expect(1 + 1).toBe(2)
})

// Control async flow with await
await test('async test', async () => {
    const result = await fetchData()
    expect(result).toBeDefined()
})
```

Run directly with Node.js:
```sh
node tests/test.mjs
```

**That's it.** No configuration, no test runner, no setup. Just write tests and run them.

## Usage

### Writing tests
Tests execute immediately when `test()` is called—there's no collection phase or scheduling overhead.

```ts
import { test, expect } from 'manten'

test('Test A', () => {
    expect(somethingSync()).toBe(1)
})

test('Test B', () => {
    expect(somethingSync()).toBe(2)
})
```

### Assertions
Jest's [`expect`](https://www.npmjs.com/package/expect) is exported as the default assertion library. Read the docs [here](https://jestjs.io/docs/expect).

Feel free to use a different assertion library, such as [Node.js Assert](https://nodejs.org/api/assert.html) or [Chai](https://www.chaijs.com/).


### Grouping tests
Group tests with the `describe(description, testGroupFunction)` function. The first parameter is the description of the group, and the second is the test group function.

Note, the `test` function is no longer imported but is passed as an argument to the test group function. This helps keep track of async contexts and generate better output logs, which we'll get into later.

```ts
import { describe } from 'manten'

describe('Group description', ({ test }) => {
    test('Test A', () => {
        // ...
    })

    test('Test B', () => {
        // ...
    })
})
```

`describe()` groups are infinitely nestable by using the new `describe` function from the test group function.

```ts
describe('Group description', ({ test, describe }) => {
    test('Test A', () => {
        // ...
    })

    describe('Nested group', () => {
        // ...
    })
})
```

### Asynchronous tests
Manten is built for async. You control execution flow with native `async`/`await`—no configuration needed.

#### Sequential: await each test
```ts
await test('Test A', async () => {
    await somethingAsync()
})

// Runs after Test A completes
await test('Test B', async () => {
    await somethingAsync()
})
```

#### Concurrent: omit await
```ts
test('Test A', async () => {
    await somethingAsync()
})

// Runs immediately while Test A is still running
test('Test B', async () => {
    await somethingAsync()
})
```

**This is the key design principle:** native JavaScript async control with zero overhead. No worker pools, no queue management—just the primitives you already know.

### Timeouts & Cleanup

Set a max test duration by passing a timeout (in milliseconds) as the third argument:

```ts
test('should finish within 1s', async () => {
    await slowTest()
}, 1000)
```

When a timeout is set, the test receives an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal). This signal lets you stop in-flight work—fetches, watchers, timers—once the time limit hits.

Asynchronous operations in JavaScript don't provide a built-in way to terminate them from the outside, so cancellation is handled cooperatively. `AbortSignal` is the standard mechanism for that: Manten marks the test as aborted, and your code responds by shutting things down cleanly.

### Example: Graceful Cleanup

```ts
test('fetch with timeout', async ({ signal }) => {
    // Pass the signal to APIs that support cancellation
    await fetch('https://api.example.com', { signal })
}, 5000)

test('custom cleanup', async ({ signal }) => {
    const watcher = startFileWatcher()

    // Close the watcher when the test times out
    signal.addEventListener('abort', () => watcher.close())

    await watcher.waitForChange()
}, 3000)
```

### Early Exit Pattern (`throwIfAborted`)

For multi-step tests, call `signal.throwIfAborted()` between expensive operations.
If the timeout has fired, execution stops immediately and later steps won't run.

```ts
test('heavy multi-step flow', async ({ signal }) => {
    await generateBigFile()
    signal.throwIfAborted()

    await uploadFile()
    signal.throwIfAborted()

    await verifyUpload()
}, 10_000)
```

### Combining Signals (Node.js 20+)

If you need both the test timeout *and* your own cancellation logic, combine them with `AbortSignal.any()`:

```ts
test('user cancellation + timeout', async ({ signal }) => {
    const userCancel = new AbortController()

    // Merge both signals into one
    const combined = AbortSignal.any([signal, userCancel.signal])

    await doWork({ signal: combined })
}, 5000)
```

#### Retries
Retry flaky tests automatically using the options object:

```ts
test('flaky API call', async () => {
    await unreliableAPI()
}, {
    timeout: 5000,
    retry: 3 // Will retry up to 3 times on failure
})
```

When a test passes after retries, the output shows which attempt succeeded (e.g., `✔ test (2/3)`).

### Grouping async tests
Manten tracks all tests in a `describe()` block, so awaiting the group waits for all child tests—even concurrent ones.

```ts
await describe('Group A', ({ test }) => {
    test('Test A1', async () => {
        await something()
    })

    // Test A2 runs concurrently with A1
    test('Test A2', async () => {
        await somethingElse()
    })
})

// Only runs after BOTH tests complete
test('Test B', () => {
    // ...
})
```

This gives you fine-grained control: run tests concurrently within a group, then await the group to ensure completion before the next step.

### Group Timeouts

Set a collective timeout for an entire `describe()` block to limit how long all tests within it can run:

```ts
describe('API Suite', ({ test }) => {
    test('endpoint 1', async () => { /* ... */ })
    test('endpoint 2', async () => { /* ... */ })
    test('endpoint 3', async () => { /* ... */ })
}, { timeout: 10_000 }) // All 3 tests must complete within 10 seconds total
```

**How it works:**
- Timer starts when the describe callback begins (includes setup code)
- If the timeout expires, all running tests are aborted via their `signal`
- The shortest timeout wins: if a parent has 10s and child has 5s, child's 5s applies
- Individual test timeouts still work—whichever fires first wins

**Cleanup on timeout:**

```ts
describe('Database tests', async ({ test, signal }) => {
    const database = await connectDatabase()

    // Clean up connection when group times out
    signal.addEventListener('abort', () => database.close())

    test('query 1', async ({ signal: testSignal }) => {
        await database.query('...', { signal: testSignal }) // Aborts on group timeout
    })
}, { timeout: 30_000 })
```

**Nested timeouts:**

The most restrictive timeout always wins (Parent vs Group vs Test).

```ts
describe('Level 1', ({ describe }) => {
    describe('Level 2', ({ test }) => {
        // Test asks for 5s...
        test('slow test', async ({ signal }) => {
            await slowOp({ signal })
        }, 5000)
    }, { timeout: 2000 }) // ...but Group limits to 2s ← Wins
}, { timeout: 10_000 })
```

The test will be aborted after **2 seconds** because the group limit is stricter than the test limit.

### Process-Level Timeout (CI Fail-Safe)

For CI environments, set a global timeout to prevent zombie operations from hanging indefinitely:

```ts
import { setProcessTimeout } from 'manten'

// Kill the entire process if tests don't complete within 30 minutes
setProcessTimeout(30 * 60 * 1000)

// Your tests...
test('example', async () => { /* ... */ })
```

**How it works:**
- Timer uses `.unref()` — if tests complete naturally, the process exits immediately
- On timeout, prints `✖ Process timed out after ${ms}ms` and forces exit with code 1
- Pending tests are automatically reported via the existing `process.on('exit')` hook

**Why this matters:**
Even with `AbortSignal`, a zombie async operation (e.g., hung socket, forgotten `setInterval`) can keep the Node.js event loop alive indefinitely. This causes CI jobs to hit infrastructure-level timeouts (often 6+ hours) without any diagnostic output.

`setProcessTimeout` ensures your tests fail fast with clear reporting instead of silent infrastructure timeouts.

### Controlling concurrency

Limit how many tests run simultaneously within a `describe()` block using the `parallel` option. This is useful for preventing resource exhaustion when tests hit databases, APIs, or file systems.

```ts
describe('Database tests', ({ test }) => {
    test('Query 1', async () => { /* ... */ })
    test('Query 2', async () => { /* ... */ })
    test('Query 3', async () => { /* ... */ })
    test('Query 4', async () => { /* ... */ })
}, { parallel: 2 }) // Only 2 tests run at a time
```

#### Parallel options

- `parallel: false` — Sequential execution (one at a time)
- `parallel: true` — Unbounded concurrency (all tests run simultaneously)
- `parallel: N` — Fixed limit (up to N tests run concurrently)
- `parallel: 'auto'` — Dynamic limit based on system load (adapts to CPU cores and load average)

The limit applies to **immediate children only** (direct `test()` and `describe()` calls). Nested describes have independent limits.

#### Explicit await bypasses parallel limiting

Tests that you explicitly `await` run immediately, bypassing the parallel queue:

```ts
describe('Mixed', async ({ test }) => {
    await test('Setup', async () => {
        // Runs first
    })

    test('Test 1', async () => { /* ... */ })
    test('Test 2', async () => { /* ... */ })
    // Test 1 and 2 respect the parallel limit

    await test('Teardown', async () => {
        // Waits for Test 1 and 2, then runs
    })
}, { parallel: 2 })
```

This gives you fine control: use the parallel limit for bulk tests, but `await` specific tests for setup/teardown that must run in sequence.

### Test suites
Group tests into separate files by exporting a `testSuite()`. This can be useful for organization, or creating a set of reusable tests since test suites can accept arguments.

Test suites can optionally have a name as the first parameter, which wraps all tests in an implicit `describe()` block:

```ts
// test-suite-a.ts

import { testSuite } from 'manten'

// With name (wraps tests in describe block)
export default testSuite('Test suite A', (
    { test },

    // Can have parameters to accept
    _value: number
) => {
    test('Test A', async () => {
        // ...
    })

    test('Test B', async () => {
        // ...
    })
})

// Without name (no grouping)
export const anotherSuite = testSuite((
    { describe, test }
) => {
    describe('Group', () => {
        test('Test C', () => {
            // ...
        })
    })
})
```

```ts
import testSuiteA from './test-suite-a'

// Pass in a value to the test suite
testSuiteA(100)
// Output:
// ✔ Test suite A › Test A
// ✔ Test suite A › Test B
```

#### Nesting test suites
Nest test suites with the `describe()` function by calling it with `runTestSuite(testSuite)`. This will log all tests in the test suite under the group description.

```ts
import { describe } from 'manten'

describe('Group', ({ runTestSuite }) => {
    runTestSuite(import('./test-suite-a'))
})
```

### Hooks

#### Test hooks

Tests receive an API object with hooks for debugging and cleanup:

```ts
test('example', async (_api) => {
    // _api.signal: AbortSignal - see "Timeouts & Cleanup" section above
    // _api.onTestFail: Debug hook when test fails
    // _api.onTestFinish: Cleanup hook after test completes
})
```

##### `onTestFail`

Debug tests by logging relevant information when a test fails.

```ts
test('Test', async ({ onTestFail }) => {
    const fixture = await createFixture()
    onTestFail(async (error) => {
        console.log(error)
        console.log('inspect directory:', fixture.path)
    })

    throw new Error('Test failed')
})
```


##### `onTestFinish`

Execute cleanup code after the test finishes, even if it errors.

```ts
test('Test', async ({ onTestFinish }) => {
    const fixture = await createFixture()
    onTestFinish(async () => await fixture.remove())

    throw new Error('Test failed')
})
```

#### Describe hooks

##### `onFinish`

Similarly to `onTestFinish`, you can execute cleanup code after all tests in a `describe()` finish.

```ts
describe('Describe', ({ test, onFinish }) => {
    const fixture = await createFixture()
    onFinish(async () => await fixture.remove())

    test('Check fixture', () => {
        // ...
    })
})
```

### Running a specific test

To run a specific test, use the `TESTONLY` environment variable with a substring of the test's name. This is useful for debugging a single test in isolation without running the entire suite.

```sh
TESTONLY='connects to database' node tests/test.mjs
```

```js
test('connects to database', () => {
    // Only this test will run
})

test('disconnects from database', () => {
    // Will NOT run
})
```

This will run only the test (or tests) whose name includes the substring partial-test-name. Matching is case-sensitive.

## Examples

### Testing a script in different versions of Node.js
```ts
import getNode from 'get-node'
import { execaNode } from 'execa'
import { testSuite } from 'manten'

const runTest = testSuite((
    { test },
    node
) => {
    test(
        `Works in Node.js ${node.version}`,
        () => execaNode('./script.js', { nodePath: node.path })
    )
});

['12.22.9', '14.18.3', '16.13.2'].map(
    async nodeVersion => runTest(await getNode(nodeVersion))
)
```

### Running multiple test files
Since there's no test runner, run multiple files using standard shell patterns:

```sh
# Run all test files
node tests/*.mjs

# Using tsx for TypeScript
npx tsx tests/*.ts

# Parallel execution with GNU parallel or xargs
find tests -name "*.test.ts" | xargs -P 4 -n 1 npx tsx
```

You have full control over concurrency and execution order.

### Understanding test output
Manten outputs test results in real-time as they complete:

```
✔ Test A (45ms)
✔ Group › Test B
✖ Failed test

134ms
2 passed
1 failed
```

- `✔` = Passed test
- `✖` = Failed test
- `•` = Incomplete test (if process exits before test finishes)
- Time shown for tests taking >50ms
- Retry attempts shown as `(2/5)` when using `retry` option
- Test errors logged to stderr, results to stdout

The final report is generated on `process.on('exit')`, so if the process crashes or is killed (<kbd>Ctrl+C</kbd>), any unfinished tests will be shown with the `•` symbol.

## API

### test(name, testFunction, timeoutOrOptions?)

name: `string`

testFunction: `(api: { onTestFail, onTestFinish }) => void | Promise<void>`

timeoutOrOptions: `number | { timeout?: number, retry?: number }`

Return value: `Promise<void>`

Create and run a test. Optionally pass a timeout (ms) or options object with `timeout` and `retry` settings.

### describe(description, testGroupFunction, options?)
description: `string`

testGroupFunction: `(api: { signal, test, describe, runTestSuite, onFinish }) => void | Promise<void>`

options: `{ parallel?: boolean | number | 'auto', timeout?: number }`

Return value: `Promise<void>`

Create a group of tests. The group tracks all child tests and waits for them to complete. Supports `parallel` for concurrency limiting and `timeout` for collective time limits.

### testSuite(name?, testSuiteFunction, options?)
name (optional): `string`

testSuiteFunction: `(api: { signal, test, describe, runTestSuite }, ...args) => any`

options (optional): `{ parallel?: boolean | number | 'auto', timeout?: number }`

Return value: `(...testSuiteArguments) => Promise<ReturnType<testSuiteFunction>>`

Create a test suite. When a name is provided, all tests in the suite are wrapped in an implicit `describe()` block. The options parameter only applies when a name is provided (since it uses `describe()` internally).

### setProcessTimeout(ms)
ms: `number`

Return value: `void`

Set a global timeout for the entire test process. If tests don't complete within the specified time, the process is forcibly terminated with exit code 1. The timer uses `.unref()`, so it won't prevent the process from exiting naturally if tests complete early. Pending tests are automatically reported when the timeout fires.

## FAQ

### What does Manten mean?
Manten (まんてん, 満点) means "maximum points" or 100% in Japanese.

### What's the logo?
It's a Hanamaru symbol:

> The hanamaru (はなまる, 花丸) is a variant of the O mark used in Japan, written as 💮︎. It is typically drawn as a spiral surrounded by rounded flower petals, suggesting a flower. It is frequently used in praising or complimenting children, and the motif often appears in children's characters and logos.
>
> The hanamaru is frequently written on tests if a student has achieved full marks or an otherwise outstanding result. It is sometimes used in place of an O mark in grading written response problems if a student's answer is especially good. Some teachers will add more rotations to the spiral the better the answer is. It is also used as a symbol for good weather.

— https://en.wikipedia.org/wiki/O_mark

### Why is there no test runner?
No test runner means **zero overhead**. Your tests are plain Node.js scripts—no file discovery, no spawning processes, no abstraction layers slowing you down.

**Why this matters:**
- **Faster startup**: No scanning directories or pattern matching
- **Full Node.js control**: Use any loaders, flags, or tools (tsx, Babel, etc.)
- **No false positives**: You explicitly run what you want
- **True async**: You manage concurrency exactly how you need it

Test runners add complexity and overhead. Manten gets out of your way and lets Node.js do what it does best.

## Gotchas & Important Notes

### Using await (optional)
You can `await` tests to control execution order (sequential vs concurrent).

You can also use [top-level `await`](https://v8.dev/features/top-level-await) (Node.js 14.8+) or wrap in an async IIFE if needed.

### Tests run immediately
Unlike other frameworks, tests execute **as soon as** `test()` is called—not after a collection phase. This means:

```ts
console.log('before test')
test('my test', () => {
    console.log('during test')
})
console.log('after test call')

// Output order:
// before test
// during test          ← Executes immediately!
// ✔ my test
// after test call
```

This is intentional for zero overhead, but may surprise users coming from Jest/Mocha.

### Process exit code
When tests fail, Manten sets `process.exitCode = 1` but doesn't call `process.exit()`. This allows all tests to complete and the final report to be generated on the `process.on('exit')` event.

### Concurrent tests and shared state
When running tests concurrently (without `await`), be careful with shared state:

```ts
// ❌ Bad: Shared state causes race conditions
let sharedCounter = 0
test('A', async () => {
    sharedCounter += 1
    await delay(10)
    expect(sharedCounter).toBe(1) // May fail!
})
test('B', async () => {
    sharedCounter += 1
    await delay(10)
    expect(sharedCounter).toBe(1) // May fail!
})

// ✅ Good: Each test has its own state
test('A', async () => {
    const counter = 1
    await delay(10)
    expect(counter).toBe(1)
})
test('B', async () => {
    const counter = 1
    await delay(10)
    expect(counter).toBe(1)
})
```

This is why Manten has no `beforeEach`—it encourages isolation.

### Running TypeScript tests
Manten has no built-in TypeScript support. Use Node.js loaders like [tsx](https://github.com/privatenumber/tsx):

```sh
npx tsx tests/test.ts
# or
node --loader tsx tests/test.ts
```

This is by design—you get full control over your build tooling.

### No .only, .skip, or .todo
Manten doesn't have `.only()` or `.skip()` modifiers. Instead, use the `TESTONLY` environment variable or JavaScript:

**Using `TESTONLY` to run specific tests:**

```sh
# Run only tests matching "authentication"
TESTONLY=authentication node tests/test.mjs

# Works with partial matches and nested groups
TESTONLY="API › POST" npm test
```

The `TESTONLY` env var performs substring matching against full test titles (including group prefixes), so it will run any test whose title contains the specified string.

**Using JavaScript for conditional tests:**

```ts
// Skip tests by commenting them out
// test('skipped test', () => { ... })
```

This keeps the API minimal while giving you powerful filtering.

### Why no beforeAll/beforeEach?
`beforeAll`/`beforeEach` hooks usually deal with managing shared environmental variables.

Since _Manten_ puts async flows first, this paradigm doesn't work well when tests are running concurrently.

By creating a new context for each test, a more functional approach can be taken where shared logic is better abstracted and organized.

<details>
    <summary>
        Code difference
    </summary>

<br>

**Before**

There can be a lot of code between the `beforeEach` and the actual tests that makes it hard to follow the flow in logic.

```ts
beforeAll(async () => {
    doSomethingBeforeAll()
})

beforeEach(() => {
    doSomethingBeforeEach()
})

// There can be a lot of code in between, making
// it hard to see there's logic before each test

test('My test', () => {
    // ...
})
```

**After**

Less magic, more explicit code!

```ts
await doSomethingBeforeAll()

test('My test', async () => {
    await doSomethingBeforeEach()

    // ...
})
```
</details>

## Related

### [fs-fixture](https://github.com/privatenumber/fs-fixture)

Easily create test fixtures at a temporary file-system path.

## Sponsors

<p align="center">
	<a href="https://github.com/sponsors/privatenumber">
		<img src="https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg">
	</a>
</p>
