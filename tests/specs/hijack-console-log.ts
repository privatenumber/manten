import { test } from '#manten';

const noop = () => {};

console.log = noop;

test('should log', noop);
