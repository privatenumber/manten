import { test } from '#manten';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

console.log = noop;

test('should log', noop);
