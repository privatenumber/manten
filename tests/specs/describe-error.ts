import { describe } from '#manten';

const noop = () => {};

console.log = noop;
console.error = noop;

describe('should fail', () => {
	throw new Error('Error');
});
