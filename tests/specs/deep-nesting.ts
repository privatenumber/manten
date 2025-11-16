import { describe } from '#manten';

describe('Level 1', ({ describe, test }) => {
	test('Test at level 1', () => {
		console.log('level 1');
	});

	describe('Level 2', ({ describe, test }) => {
		test('Test at level 2', () => {
			console.log('level 2');
		});

		describe('Level 3', ({ describe, test }) => {
			test('Test at level 3', () => {
				console.log('level 3');
			});

			describe('Level 4', ({ test }) => {
				test('Test at level 4', () => {
					console.log('level 4');
				});
			});
		});
	});
});
