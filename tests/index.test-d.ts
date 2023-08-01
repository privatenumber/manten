import { expectType } from 'tsd';
import { testSuite } from '#manten';

const importedTestSuite = testSuite((context, value: string) => 1234);
expectType<(value: string) => number>(importedTestSuite);
