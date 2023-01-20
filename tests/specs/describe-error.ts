import { describe } from '#manten';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

console.log = noop;
console.error = noop;

describe('should fail', () => {
	throw new Error('Error');
});
