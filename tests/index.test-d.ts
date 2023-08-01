import { expectType } from 'tsd';
import { testSuite } from '#manten';

const importedTestSuite = testSuite((_context, _a: string, _b: number, _c: 'hello') => 1234);
expectType<(_a: string, _b: number, _c: 'hello') => number>(importedTestSuite);
