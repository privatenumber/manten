<p align="center">
	<img width="350" src=".github/logo.png">
    <!-- LICENSE https://www.ac-illust.com/main/detail.php?id=22468077 -->
</p>

<h1 align="center">満点 (manten)</h1>

Lightweight testing library for Node.js

### Features
- Minimal API: `test`, `describe`, `testSuite`
- Async first design
- Flow control via `async`/`await`
- Strongly typed
- Tiny! `2.3 kB`

<br>

<p align="center">
	<a href="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum">
		<picture>
			<source width="830" media="(prefers-color-scheme: dark)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum&image=dark">
			<source width="830" media="(prefers-color-scheme: light)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum&image">
			<img width="830" src="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum&image" alt="Premium sponsor banner">
		</picture>
	</a>
</p>

## Install
```sh
npm i -D manten
```

## Quick start
- All test files are plain JavaScript files
- `test()`/`describe()` run on creation
- Use `async`/`await`/Promise API for async flow control
- Nest `describe()` groups by inheriting a new the `describe` function
- [`expect`](https://www.npmjs.com/package/expect) assertion library is re-exported
- When a test fails, the Node.js process will exit with code `1`

```ts
// tests/test.mjs

import { describe, expect } from 'manten'

describe('My test suite', ({ test, describe }) => {
    test('My test', () => {
        expect(true).toBe(true)
    })

    describe('Nested groups', ({ test }) => {
        // ...
    })
})
```

Run the test file with Node.js:
```sh
node tests/test.mjs
```

## Usage

### Writing tests
Create and run a test with the `test(name, testFunction)` function. The first argument is the test name, and the second is the test function. Optionally, you can pass in a timeout in milliseconds as the third argument for asynchronous tests.

The test runs immediately after the test function is invoked and the results are logged to stdout.

```ts
import { test, expect } from 'manten'

test('Test A', () => {
    expect(somethingSync()).toBe(1)
})

// Runs after Test A completes
test('Test B', () => {
    expect(somethingSync()).toBe(2)
})
```

### Assertions
Jest's [`expect`](https://www.npmjs.com/package/expect) is exported as the default assertion library. Read the docs [here](https://jestjs.io/docs/expect). 

```ts
import { expect } from 'manten'
```

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

    // ...

    describe('Nested group', ({ test }) => {
        // ...
    })
})
```

### Asynchronous tests
Test async code by passing in an `async` function to `test()`.

Control the flow of your tests via native `async`/`await` syntax or [Promise API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).


#### Sequential flow
Run asynchronous tests sequentially by `await`ing on each test.

Node.js v14.8 and up supports [top-level await](https://v8.dev/features/top-level-await). Alternatively, wrap the whole block in an async [IIFE](https://developer.mozilla.org/en-US/docs/Glossary/IIFE).

```ts
await test('Test A', async () => {
    await somethingAsync()
})

// Runs after Test A completes
await test('Test B', async () => {
    await somethingAsync()
})
```

#### Concurrent flow
Run tests concurrently by running them without `await`.

```ts
test('Test A', async () => {
    await somethingAsync()
})

// Runs while "Test A" is running
test('Test B', async () => {
    await somethingAsync()
})
```

#### Timeouts
Pass in the max time duration a test can run for as the third argument to `test()`.

```ts
test('should finish within 1s', async () => {
    await slowTest()
}, 1000)
```

### Grouping async tests
All descendant tests in a `describe()` are collected so `await`ing on the `describe()` will wait for all async tests inside to complete, even if they are not individually `await`ed.

To run tests inside `describe()` sequentially, pass in an async function to `describe()` and use `await` on each test.

```ts
await describe('Group A', ({ test }) => {
    test('Test A1', () => {
        // ...
    })

    // Test A2 will run concurrently with A1
    test('Test A2', () => {
        // ...
    })
})

// Will wait for all tests in Group A to finish
test('Test B', () => {
    // ...
})
```

<!-- 
### Concurrency limiting

You can limit the number of tests that run at the same time by setting the `concurrency` option. This limit only applies to immediate children.

```ts
await describe('Run one test at a time', ({ test }) => {
    test('Test A1', () => {
        // ...
    })

    // Test A2 will run concurrently with A1
    test('Test A2', () => {
        // ...
    })
}, {
    concurrency: 1
})
``` -->

### Test suites
Group tests into separate files by exporting a `testSuite()`. This can be useful for organization, or creating a set of reusable tests since test suites can accept arguments.

```ts
// test-suite-a.ts

import { testSuite } from 'manten'

export default testSuite((
    { describe, test },

    // Can have parameters to accept
    value: number
) => {
    test('Test A', async () => {
        // ...
    })

    describe('Group B', ({ test }) => {
        // ...
    })
})
```

```ts
import testSuiteA from './test-suite-a'

// Pass in a value to the test suite
testSuiteA(100)
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

##### `onTestFail`

By using the `onTestFail` hook, you can debug tests by logging relevant information when a test fails.

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

By using the `onTestFinish` hook, you can execute cleanup code after the test finishes, even if it errors.

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

<p align="center">
	<a href="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=gold">
		<picture>
			<source width="830" media="(prefers-color-scheme: dark)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=gold&image=dark">
			<source width="830" media="(prefers-color-scheme: light)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=gold&image">
			<img width="830" src="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=gold&image" alt="Premium sponsor banner">
		</picture>
	</a>
</p>


## Examples

### Testing a script in different versions of Node.js
```ts
import getNode from 'get-node'
import { execaNode } from 'execa'
import { testSuite } from 'manten'

const runTest = testSuite((
    { test },
    node: { path: string; version: string }
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

## API

### test(name, testFunction, timeout?)

name: `string`

testFunction: `() => void`

timeout: `number`

Return value: `Promise<void>`

Create and run a test.

### describe(description, testGroupFunction)
description: `string`

testGroupFunction: `({ test, describe, runTestSuite }) => void`

Return value: `Promise<void>`

Create a group of tests.

### testSuite(testSuiteFunction, ...testSuiteArguments)
testSuiteFunction: `({ test, describe, runTestSuite }) => any`

testSuiteArguments: `any[]`

Return value: `(...testSuiteArguments) => Promise<ReturnType<testSuiteFunction>>`

Create a test suite.

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
Currently, _Manten_ does not come with a test runner because the tradeoffs are not worh it.

The primary benefit of the test runner is that it can detect and run all test files, and maybe watch for file changes to re-run tests.

The drawbacks are:
- Re-invented Node.js binary API. In today's Node.js ecosystem, it's common to see a build step for TypeScript, Babel, etc. By creating a new binary to run JavaScript, we have to re-invent APIs to allow for things like transformations.
- Test files are implicitly declared. Instead of explicitly specifying test files, the test runner traverses the project to find tests that match a pattern. This search adds an overhead and can incorrectly match files that are not tests (eg. complex test fixtures in projects that are related to testing).
- Tests in _Manten_ are async first and can run concurrently. While this might be fine in some cases, it can also be too much and may require guidance in how many tests can run in parallel.

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
	<a href="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver1">
		<picture>
			<source width="410" media="(prefers-color-scheme: dark)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver1&image=dark">
			<source width="410" media="(prefers-color-scheme: light)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver1&image">
			<img width="410" src="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver1&image" alt="Premium sponsor banner">
		</picture>
	</a>
	<a href="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver2">
		<picture>
			<source width="410" media="(prefers-color-scheme: dark)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver2&image=dark">
			<source width="410" media="(prefers-color-scheme: light)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver2&image">
			<img width="410" src="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver2&image" alt="Premium sponsor banner">
		</picture>
	</a>
</p>

<p align="center">
	<a href="https://github.com/sponsors/privatenumber">
		<img src="https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg">
	</a>
</p>
