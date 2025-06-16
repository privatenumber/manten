import { describe } from '#manten';

describe('retry', ({ test }) => {
	{
		let count = 0;
		test('should fail 5 times', () => {
			count += 1;
			throw new Error(`should fail ${count}`);
		}, {
			retry: 5,
		});
	}

	{
		let count = 0;
		test('should pass on 3rd try', () => {
			count += 1;
			if (count !== 3) {
				throw new Error(`should pass ${count}`);
			}
		}, {
			retry: 5,
		});
	}
});
