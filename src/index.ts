import { createRequire } from 'node:module';
import type { Expect } from 'expect';

export type {
	Test,
	Describe,
} from './types.ts';
export {
	describe, onFinish, skip,
} from './context.ts';
export { test, onTestFail, onTestFinish } from './create-test.ts';
export { expectSnapshot, configure } from './snapshot/snapshots.ts';
export { setProcessTimeout } from './process-timeout.ts';

/**
 * `expect`'s ESM wrapper (build/index.mjs) re-exports `cjsModule.expect` from a
 * default import of its CommonJS build. Bun honors the webpack `__esModule`
 * marker and binds that default import to `module.exports.default` (the
 * `expect` function itself), so `cjsModule.expect` is `undefined`. Node instead
 * binds the default to the whole `module.exports` object. Loading the CommonJS
 * build via `require` resolves identically on both runtimes.
 */
export const { expect } = createRequire(import.meta.url)('expect') as { expect: Expect };
