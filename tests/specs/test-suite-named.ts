import { setTimeout } from '../utils/set-timeout.js';
import { testSuite, describe } from '#manten';

const namedSuite = testSuite('Named suite', ({ test }) => {
	test('Test A', async () => {
		await setTimeout(10);
	});

	test('Test B', async () => {
		await setTimeout(20);
	});
});

namedSuite();

const namedSuiteWithParams = testSuite('Parameterized suite', ({ test }, value: string) => {
	test(`Test with ${value}`, async () => {
		await setTimeout(10);
	});
});

namedSuiteWithParams('param1');
namedSuiteWithParams('param2');

const nestedNamedSuite = testSuite('Nested named suite', ({ test }) => {
	test('Inner test', async () => {
		await setTimeout(10);
	});
});

describe('Outer group', async ({ test }) => {
	await nestedNamedSuite();

	test('Other test', () => {
		// Another test in the same group
	});
});
