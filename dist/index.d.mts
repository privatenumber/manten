/// <reference types="node" />
import { AsyncLocalStorage } from 'async_hooks';

type TestSuiteCallback<T extends unknown[] = unknown[], ReturnType = unknown> = (context: Context, ...args: T) => ReturnType;
type InferCallback<T extends TestSuiteCallback> = (T extends TestSuiteCallback<infer Args, infer ReturnType> ? {
    args: Args;
    returnType: ReturnType;
} : never);
type TestSuite<Callback extends TestSuiteCallback> = (this: void | Context, ...callbackArgs: InferCallback<Callback>['args']) => InferCallback<Callback>['returnType'];
type ModuleDefaultExport<defaultExport> = {
    default: defaultExport;
} | {
    default: {
        default: defaultExport;
    };
};
type RunTestSuite = <Callback extends TestSuiteCallback>(testSuite: TestSuite<Callback> | Promise<ModuleDefaultExport<TestSuite<Callback>>>, ...args: InferCallback<Callback>['args']) => InferCallback<Callback>['returnType'];
type onTestFailCallback = (error: Error) => void;
type onTestFinishCallback = () => void;
type TestApi = {
    onTestFail: (callback: onTestFailCallback) => void;
    onTestFinish: (callback: onTestFinishCallback) => void;
};
type TestFunction = (api: TestApi) => void;
type Test = (title: string, testFunction: TestFunction, timeout?: number) => Promise<void>;
type Describe = (description: string, callback: (context: Context) => void) => Promise<void>;
type Context = {
    describe: Describe;
    test: Test;
    runTestSuite: RunTestSuite;
};

declare const test: Test;
declare const describe: Describe;

declare function testSuite<Callback extends TestSuiteCallback<unknown[], unknown>>(callback: Callback): TestSuite<Callback>;

declare type EqualsFunction = (
  a: unknown,
  b: unknown,
  customTesters?: Array<Tester>,
  strictCheck?: boolean,
) => boolean;

declare type Tester = (
  this: TesterContext,
  a: any,
  b: any,
  customTesters: Array<Tester>,
) => boolean | undefined;

declare interface TesterContext {
  equals: EqualsFunction;
}

/**
Basic foreground colors.

[More colors here.](https://github.com/chalk/chalk/blob/master/readme.md#256-and-truecolor-color-support)
*/
declare type ForegroundColor =
	| 'black'
	| 'red'
	| 'green'
	| 'yellow'
	| 'blue'
	| 'magenta'
	| 'cyan'
	| 'white'
	| 'gray'
	| 'grey'
	| 'blackBright'
	| 'redBright'
	| 'greenBright'
	| 'yellowBright'
	| 'blueBright'
	| 'magentaBright'
	| 'cyanBright'
	| 'whiteBright';

/**
Basic background colors.

[More colors here.](https://github.com/chalk/chalk/blob/master/readme.md#256-and-truecolor-color-support)
*/
declare type BackgroundColor =
	| 'bgBlack'
	| 'bgRed'
	| 'bgGreen'
	| 'bgYellow'
	| 'bgBlue'
	| 'bgMagenta'
	| 'bgCyan'
	| 'bgWhite'
	| 'bgGray'
	| 'bgGrey'
	| 'bgBlackBright'
	| 'bgRedBright'
	| 'bgGreenBright'
	| 'bgYellowBright'
	| 'bgBlueBright'
	| 'bgMagentaBright'
	| 'bgCyanBright'
	| 'bgWhiteBright';

/**
Basic colors.

[More colors here.](https://github.com/chalk/chalk/blob/master/readme.md#256-and-truecolor-color-support)
*/
declare type Color = ForegroundColor | BackgroundColor;

declare type Modifiers =
	| 'reset'
	| 'bold'
	| 'dim'
	| 'italic'
	| 'underline'
	| 'inverse'
	| 'hidden'
	| 'strikethrough'
	| 'visible';

declare namespace chalk {
	/**
	Levels:
	- `0` - All colors disabled.
	- `1` - Basic 16 colors support.
	- `2` - ANSI 256 colors support.
	- `3` - Truecolor 16 million colors support.
	*/
	type Level = 0 | 1 | 2 | 3;

	interface Options {
		/**
		Specify the color support for Chalk.

		By default, color support is automatically detected based on the environment.

		Levels:
		- `0` - All colors disabled.
		- `1` - Basic 16 colors support.
		- `2` - ANSI 256 colors support.
		- `3` - Truecolor 16 million colors support.
		*/
		level?: Level;
	}

	/**
	Return a new Chalk instance.
	*/
	type Instance = new (options?: Options) => Chalk;

	/**
	Detect whether the terminal supports color.
	*/
	interface ColorSupport {
		/**
		The color level used by Chalk.
		*/
		level: Level;

		/**
		Return whether Chalk supports basic 16 colors.
		*/
		hasBasic: boolean;

		/**
		Return whether Chalk supports ANSI 256 colors.
		*/
		has256: boolean;

		/**
		Return whether Chalk supports Truecolor 16 million colors.
		*/
		has16m: boolean;
	}

	interface ChalkFunction {
		/**
		Use a template string.

		@remarks Template literals are unsupported for nested calls (see [issue #341](https://github.com/chalk/chalk/issues/341))

		@example
		```
		import chalk = require('chalk');

		log(chalk`
		CPU: {red ${cpu.totalPercent}%}
		RAM: {green ${ram.used / ram.total * 100}%}
		DISK: {rgb(255,131,0) ${disk.used / disk.total * 100}%}
		`);
		```

		@example
		```
		import chalk = require('chalk');

		log(chalk.red.bgBlack`2 + 3 = {bold ${2 + 3}}`)
		```
		*/
		(text: TemplateStringsArray, ...placeholders: unknown[]): string;

		(...text: unknown[]): string;
	}

	interface Chalk extends ChalkFunction {
		/**
		Return a new Chalk instance.
		*/
		Instance: Instance;

		/**
		The color support for Chalk.

		By default, color support is automatically detected based on the environment.

		Levels:
		- `0` - All colors disabled.
		- `1` - Basic 16 colors support.
		- `2` - ANSI 256 colors support.
		- `3` - Truecolor 16 million colors support.
		*/
		level: Level;

		/**
		Use HEX value to set text color.

		@param color - Hexadecimal value representing the desired color.

		@example
		```
		import chalk = require('chalk');

		chalk.hex('#DEADED');
		```
		*/
		hex(color: string): Chalk;

		/**
		Use keyword color value to set text color.

		@param color - Keyword value representing the desired color.

		@example
		```
		import chalk = require('chalk');

		chalk.keyword('orange');
		```
		*/
		keyword(color: string): Chalk;

		/**
		Use RGB values to set text color.
		*/
		rgb(red: number, green: number, blue: number): Chalk;

		/**
		Use HSL values to set text color.
		*/
		hsl(hue: number, saturation: number, lightness: number): Chalk;

		/**
		Use HSV values to set text color.
		*/
		hsv(hue: number, saturation: number, value: number): Chalk;

		/**
		Use HWB values to set text color.
		*/
		hwb(hue: number, whiteness: number, blackness: number): Chalk;

		/**
		Use a [Select/Set Graphic Rendition](https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_parameters) (SGR) [color code number](https://en.wikipedia.org/wiki/ANSI_escape_code#3/4_bit) to set text color.

		30 <= code && code < 38 || 90 <= code && code < 98
		For example, 31 for red, 91 for redBright.
		*/
		ansi(code: number): Chalk;

		/**
		Use a [8-bit unsigned number](https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit) to set text color.
		*/
		ansi256(index: number): Chalk;

		/**
		Use HEX value to set background color.

		@param color - Hexadecimal value representing the desired color.

		@example
		```
		import chalk = require('chalk');

		chalk.bgHex('#DEADED');
		```
		*/
		bgHex(color: string): Chalk;

		/**
		Use keyword color value to set background color.

		@param color - Keyword value representing the desired color.

		@example
		```
		import chalk = require('chalk');

		chalk.bgKeyword('orange');
		```
		*/
		bgKeyword(color: string): Chalk;

		/**
		Use RGB values to set background color.
		*/
		bgRgb(red: number, green: number, blue: number): Chalk;

		/**
		Use HSL values to set background color.
		*/
		bgHsl(hue: number, saturation: number, lightness: number): Chalk;

		/**
		Use HSV values to set background color.
		*/
		bgHsv(hue: number, saturation: number, value: number): Chalk;

		/**
		Use HWB values to set background color.
		*/
		bgHwb(hue: number, whiteness: number, blackness: number): Chalk;

		/**
		Use a [Select/Set Graphic Rendition](https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_parameters) (SGR) [color code number](https://en.wikipedia.org/wiki/ANSI_escape_code#3/4_bit) to set background color.

		30 <= code && code < 38 || 90 <= code && code < 98
		For example, 31 for red, 91 for redBright.
		Use the foreground code, not the background code (for example, not 41, nor 101).
		*/
		bgAnsi(code: number): Chalk;

		/**
		Use a [8-bit unsigned number](https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit) to set background color.
		*/
		bgAnsi256(index: number): Chalk;

		/**
		Modifier: Resets the current color chain.
		*/
		readonly reset: Chalk;

		/**
		Modifier: Make text bold.
		*/
		readonly bold: Chalk;

		/**
		Modifier: Emitting only a small amount of light.
		*/
		readonly dim: Chalk;

		/**
		Modifier: Make text italic. (Not widely supported)
		*/
		readonly italic: Chalk;

		/**
		Modifier: Make text underline. (Not widely supported)
		*/
		readonly underline: Chalk;

		/**
		Modifier: Inverse background and foreground colors.
		*/
		readonly inverse: Chalk;

		/**
		Modifier: Prints the text, but makes it invisible.
		*/
		readonly hidden: Chalk;

		/**
		Modifier: Puts a horizontal line through the center of the text. (Not widely supported)
		*/
		readonly strikethrough: Chalk;

		/**
		Modifier: Prints the text only when Chalk has a color support level > 0.
		Can be useful for things that are purely cosmetic.
		*/
		readonly visible: Chalk;

		readonly black: Chalk;
		readonly red: Chalk;
		readonly green: Chalk;
		readonly yellow: Chalk;
		readonly blue: Chalk;
		readonly magenta: Chalk;
		readonly cyan: Chalk;
		readonly white: Chalk;

		/*
		Alias for `blackBright`.
		*/
		readonly gray: Chalk;

		/*
		Alias for `blackBright`.
		*/
		readonly grey: Chalk;

		readonly blackBright: Chalk;
		readonly redBright: Chalk;
		readonly greenBright: Chalk;
		readonly yellowBright: Chalk;
		readonly blueBright: Chalk;
		readonly magentaBright: Chalk;
		readonly cyanBright: Chalk;
		readonly whiteBright: Chalk;

		readonly bgBlack: Chalk;
		readonly bgRed: Chalk;
		readonly bgGreen: Chalk;
		readonly bgYellow: Chalk;
		readonly bgBlue: Chalk;
		readonly bgMagenta: Chalk;
		readonly bgCyan: Chalk;
		readonly bgWhite: Chalk;

		/*
		Alias for `bgBlackBright`.
		*/
		readonly bgGray: Chalk;

		/*
		Alias for `bgBlackBright`.
		*/
		readonly bgGrey: Chalk;

		readonly bgBlackBright: Chalk;
		readonly bgRedBright: Chalk;
		readonly bgGreenBright: Chalk;
		readonly bgYellowBright: Chalk;
		readonly bgBlueBright: Chalk;
		readonly bgMagentaBright: Chalk;
		readonly bgCyanBright: Chalk;
		readonly bgWhiteBright: Chalk;
	}
}

/**
Main Chalk object that allows to chain styles together.
Call the last one as a method with a string argument.
Order doesn't matter, and later styles take precedent in case of a conflict.
This simply means that `chalk.red.yellow.green` is equivalent to `chalk.green`.
*/
declare const chalk: chalk.Chalk & chalk.ChalkFunction & {
	supportsColor: chalk.ColorSupport | false;
	Level: chalk.Level;
	Color: Color;
	ForegroundColor: ForegroundColor;
	BackgroundColor: BackgroundColor;
	Modifiers: Modifiers;
	stderr: chalk.Chalk & {supportsColor: chalk.ColorSupport | false};
};

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


declare type CompareKeys =
  | ((a: string, b: string) => number)
  | null
  | undefined;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


declare type DiffOptions$1 = {
  aAnnotation?: string;
  aColor?: DiffOptionsColor;
  aIndicator?: string;
  bAnnotation?: string;
  bColor?: DiffOptionsColor;
  bIndicator?: string;
  changeColor?: DiffOptionsColor;
  changeLineTrailingSpaceColor?: DiffOptionsColor;
  commonColor?: DiffOptionsColor;
  commonIndicator?: string;
  commonLineTrailingSpaceColor?: DiffOptionsColor;
  contextLines?: number;
  emptyFirstOrLastLinePlaceholder?: string;
  expand?: boolean;
  includeChangeCounts?: boolean;
  omitAnnotationLines?: boolean;
  patchColor?: DiffOptionsColor;
  compareKeys?: CompareKeys;
};

declare type DiffOptionsColor = (arg: string) => string;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


declare const BOLD_WEIGHT: chalk.Chalk;

declare const diff: (
  a: unknown,
  b: unknown,
  options?: DiffOptions,
) => string | null;

declare type DiffOptions = DiffOptions$1;

declare const DIM_COLOR: chalk.Chalk;

/**
 * Ensures that `actual` is of type `number | bigint`
 */
declare const ensureActualIsNumber: (
  actual: unknown,
  matcherName: string,
  options?: MatcherHintOptions,
) => void;

declare const ensureExpectedIsNonNegativeInteger: (
  expected: unknown,
  matcherName: string,
  options?: MatcherHintOptions,
) => void;

/**
 * Ensures that `expected` is of type `number | bigint`
 */
declare const ensureExpectedIsNumber: (
  expected: unknown,
  matcherName: string,
  options?: MatcherHintOptions,
) => void;

declare const ensureNoExpected: (
  expected: unknown,
  matcherName: string,
  options?: MatcherHintOptions,
) => void;

/**
 * Ensures that `actual` & `expected` are of type `number | bigint`
 */
declare const ensureNumbers: (
  actual: unknown,
  expected: unknown,
  matcherName: string,
  options?: MatcherHintOptions,
) => void;

declare const EXPECTED_COLOR: chalk.Chalk;

declare const getLabelPrinter: (...strings: Array<string>) => PrintLabel;

declare const highlightTrailingWhitespace: (text: string) => string;

declare const INVERTED_COLOR: chalk.Chalk;

declare const matcherErrorMessage: (
  hint: string,
  generic: string,
  specific?: string,
) => string;

declare const matcherHint: (
  matcherName: string,
  received?: string,
  expected?: string,
  options?: MatcherHintOptions,
) => string;

declare type MatcherHintColor = (arg: string) => string;

declare type MatcherHintOptions = {
  comment?: string;
  expectedColor?: MatcherHintColor;
  isDirectExpectCall?: boolean;
  isNot?: boolean;
  promise?: string;
  receivedColor?: MatcherHintColor;
  secondArgument?: string;
  secondArgumentColor?: MatcherHintColor;
};

declare const pluralize: (word: string, count: number) => string;

declare const printDiffOrStringify: (
  expected: unknown,
  received: unknown,
  expectedLabel: string,
  receivedLabel: string,
  expand: boolean,
) => string;

declare const printExpected: (value: unknown) => string;

declare type PrintLabel = (string: string) => string;

declare const printReceived: (object: unknown) => string;

declare function printWithType<T>(
  name: string,
  value: T,
  print: (value: T) => string,
): string;

declare const RECEIVED_COLOR: chalk.Chalk;

declare function replaceMatchedToAsymmetricMatcher(
  replacedExpected: unknown,
  replacedReceived: unknown,
  expectedCycles: Array<unknown>,
  receivedCycles: Array<unknown>,
): {
  replacedExpected: unknown;
  replacedReceived: unknown;
};

declare const stringify: (
  object: unknown,
  maxDepth?: number,
  maxWidth?: number,
) => string;

declare const SUGGEST_TO_CONTAIN_EQUAL: string;

declare const jestMatcherUtils_BOLD_WEIGHT: typeof BOLD_WEIGHT;
declare const jestMatcherUtils_diff: typeof diff;
type jestMatcherUtils_DiffOptions = DiffOptions;
declare const jestMatcherUtils_DIM_COLOR: typeof DIM_COLOR;
declare const jestMatcherUtils_ensureActualIsNumber: typeof ensureActualIsNumber;
declare const jestMatcherUtils_ensureExpectedIsNonNegativeInteger: typeof ensureExpectedIsNonNegativeInteger;
declare const jestMatcherUtils_ensureExpectedIsNumber: typeof ensureExpectedIsNumber;
declare const jestMatcherUtils_ensureNoExpected: typeof ensureNoExpected;
declare const jestMatcherUtils_ensureNumbers: typeof ensureNumbers;
declare const jestMatcherUtils_EXPECTED_COLOR: typeof EXPECTED_COLOR;
declare const jestMatcherUtils_getLabelPrinter: typeof getLabelPrinter;
declare const jestMatcherUtils_highlightTrailingWhitespace: typeof highlightTrailingWhitespace;
declare const jestMatcherUtils_INVERTED_COLOR: typeof INVERTED_COLOR;
declare const jestMatcherUtils_matcherErrorMessage: typeof matcherErrorMessage;
declare const jestMatcherUtils_matcherHint: typeof matcherHint;
type jestMatcherUtils_MatcherHintOptions = MatcherHintOptions;
declare const jestMatcherUtils_pluralize: typeof pluralize;
declare const jestMatcherUtils_printDiffOrStringify: typeof printDiffOrStringify;
declare const jestMatcherUtils_printExpected: typeof printExpected;
declare const jestMatcherUtils_printReceived: typeof printReceived;
declare const jestMatcherUtils_printWithType: typeof printWithType;
declare const jestMatcherUtils_RECEIVED_COLOR: typeof RECEIVED_COLOR;
declare const jestMatcherUtils_replaceMatchedToAsymmetricMatcher: typeof replaceMatchedToAsymmetricMatcher;
declare const jestMatcherUtils_stringify: typeof stringify;
declare const jestMatcherUtils_SUGGEST_TO_CONTAIN_EQUAL: typeof SUGGEST_TO_CONTAIN_EQUAL;
declare namespace jestMatcherUtils {
  export {
    jestMatcherUtils_BOLD_WEIGHT as BOLD_WEIGHT,
    jestMatcherUtils_diff as diff,
    jestMatcherUtils_DiffOptions as DiffOptions,
    jestMatcherUtils_DIM_COLOR as DIM_COLOR,
    jestMatcherUtils_ensureActualIsNumber as ensureActualIsNumber,
    jestMatcherUtils_ensureExpectedIsNonNegativeInteger as ensureExpectedIsNonNegativeInteger,
    jestMatcherUtils_ensureExpectedIsNumber as ensureExpectedIsNumber,
    jestMatcherUtils_ensureNoExpected as ensureNoExpected,
    jestMatcherUtils_ensureNumbers as ensureNumbers,
    jestMatcherUtils_EXPECTED_COLOR as EXPECTED_COLOR,
    jestMatcherUtils_getLabelPrinter as getLabelPrinter,
    jestMatcherUtils_highlightTrailingWhitespace as highlightTrailingWhitespace,
    jestMatcherUtils_INVERTED_COLOR as INVERTED_COLOR,
    jestMatcherUtils_matcherErrorMessage as matcherErrorMessage,
    jestMatcherUtils_matcherHint as matcherHint,
    jestMatcherUtils_MatcherHintOptions as MatcherHintOptions,
    jestMatcherUtils_pluralize as pluralize,
    jestMatcherUtils_printDiffOrStringify as printDiffOrStringify,
    jestMatcherUtils_printExpected as printExpected,
    jestMatcherUtils_printReceived as printReceived,
    jestMatcherUtils_printWithType as printWithType,
    jestMatcherUtils_RECEIVED_COLOR as RECEIVED_COLOR,
    jestMatcherUtils_replaceMatchedToAsymmetricMatcher as replaceMatchedToAsymmetricMatcher,
    jestMatcherUtils_stringify as stringify,
    jestMatcherUtils_SUGGEST_TO_CONTAIN_EQUAL as SUGGEST_TO_CONTAIN_EQUAL,
  };
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


declare type AsymmetricMatcher_2 = {
  asymmetricMatch(other: unknown): boolean;
  toString(): string;
  getExpectedType?(): string;
  toAsymmetricMatcher?(): string;
};

declare interface AsymmetricMatchers {
  any(sample: unknown): AsymmetricMatcher_2;
  anything(): AsymmetricMatcher_2;
  arrayContaining(sample: Array<unknown>): AsymmetricMatcher_2;
  closeTo(sample: number, precision?: number): AsymmetricMatcher_2;
  objectContaining(sample: Record<string, unknown>): AsymmetricMatcher_2;
  stringContaining(sample: string): AsymmetricMatcher_2;
  stringMatching(sample: string | RegExp): AsymmetricMatcher_2;
}

declare type AsyncExpectationResult = Promise<SyncExpectationResult>;

declare interface BaseExpect {
  assertions(numberOfAssertions: number): void;
  addEqualityTesters(testers: Array<Tester>): void;
  extend(matchers: MatchersObject): void;
  extractExpectedAssertionsErrors(): ExpectedAssertionsErrors;
  getState(): MatcherState;
  hasAssertions(): void;
  setState(state: Partial<MatcherState>): void;
}

declare type Expect = {
  <T = unknown>(actual: T): Matchers<void, T> &
    Inverse<Matchers<void, T>> &
    PromiseMatchers<T>;
} & BaseExpect &
  AsymmetricMatchers &
  Inverse<Omit<AsymmetricMatchers, 'any' | 'anything'>>;

declare const expect: Expect;


declare type ExpectationResult =
  | SyncExpectationResult
  | AsyncExpectationResult;

declare type ExpectedAssertionsErrors = Array<{
  actual: string | number;
  error: Error;
  expected: string;
}>;

declare type Inverse<Matchers> = {
  /**
   * Inverse next matcher. If you know how to test something, `.not` lets you test its opposite.
   */
  not: Matchers;
};

declare type MatcherContext = MatcherUtils & Readonly<MatcherState>;

declare interface Matchers<R extends void | Promise<void>, T = unknown> {
  /**
   * Ensures the last call to a mock function was provided specific args.
   */
  lastCalledWith(...expected: Array<unknown>): R;
  /**
   * Ensure that the last call to a mock function has returned a specified value.
   */
  lastReturnedWith(expected?: unknown): R;
  /**
   * Ensure that a mock function is called with specific arguments on an Nth call.
   */
  nthCalledWith(nth: number, ...expected: Array<unknown>): R;
  /**
   * Ensure that the nth call to a mock function has returned a specified value.
   */
  nthReturnedWith(nth: number, expected?: unknown): R;
  /**
   * Checks that a value is what you expect. It calls `Object.is` to compare values.
   * Don't use `toBe` with floating-point numbers.
   */
  toBe(expected: unknown): R;
  /**
   * Ensures that a mock function is called.
   */
  toBeCalled(): R;
  /**
   * Ensures that a mock function is called an exact number of times.
   */
  toBeCalledTimes(expected: number): R;
  /**
   * Ensure that a mock function is called with specific arguments.
   */
  toBeCalledWith(...expected: Array<unknown>): R;
  /**
   * Using exact equality with floating point numbers is a bad idea.
   * Rounding means that intuitive things fail.
   * The default for `precision` is 2.
   */
  toBeCloseTo(expected: number, precision?: number): R;
  /**
   * Ensure that a variable is not undefined.
   */
  toBeDefined(): R;
  /**
   * When you don't care what a value is, you just want to
   * ensure a value is false in a boolean context.
   */
  toBeFalsy(): R;
  /**
   * For comparing floating point numbers.
   */
  toBeGreaterThan(expected: number | bigint): R;
  /**
   * For comparing floating point numbers.
   */
  toBeGreaterThanOrEqual(expected: number | bigint): R;
  /**
   * Ensure that an object is an instance of a class.
   * This matcher uses `instanceof` underneath.
   */
  toBeInstanceOf(expected: unknown): R;
  /**
   * For comparing floating point numbers.
   */
  toBeLessThan(expected: number | bigint): R;
  /**
   * For comparing floating point numbers.
   */
  toBeLessThanOrEqual(expected: number | bigint): R;
  /**
   * Used to check that a variable is NaN.
   */
  toBeNaN(): R;
  /**
   * This is the same as `.toBe(null)` but the error messages are a bit nicer.
   * So use `.toBeNull()` when you want to check that something is null.
   */
  toBeNull(): R;
  /**
   * Use when you don't care what a value is, you just want to ensure a value
   * is true in a boolean context. In JavaScript, there are six falsy values:
   * `false`, `0`, `''`, `null`, `undefined`, and `NaN`. Everything else is truthy.
   */
  toBeTruthy(): R;
  /**
   * Used to check that a variable is undefined.
   */
  toBeUndefined(): R;
  /**
   * Used when you want to check that an item is in a list.
   * For testing the items in the list, this uses `===`, a strict equality check.
   */
  toContain(expected: unknown): R;
  /**
   * Used when you want to check that an item is in a list.
   * For testing the items in the list, this  matcher recursively checks the
   * equality of all fields, rather than checking for object identity.
   */
  toContainEqual(expected: unknown): R;
  /**
   * Used when you want to check that two objects have the same value.
   * This matcher recursively checks the equality of all fields, rather than checking for object identity.
   */
  toEqual(expected: unknown): R;
  /**
   * Ensures that a mock function is called.
   */
  toHaveBeenCalled(): R;
  /**
   * Ensures that a mock function is called an exact number of times.
   */
  toHaveBeenCalledTimes(expected: number): R;
  /**
   * Ensure that a mock function is called with specific arguments.
   */
  toHaveBeenCalledWith(...expected: Array<unknown>): R;
  /**
   * Ensure that a mock function is called with specific arguments on an Nth call.
   */
  toHaveBeenNthCalledWith(nth: number, ...expected: Array<unknown>): R;
  /**
   * If you have a mock function, you can use `.toHaveBeenLastCalledWith`
   * to test what arguments it was last called with.
   */
  toHaveBeenLastCalledWith(...expected: Array<unknown>): R;
  /**
   * Use to test the specific value that a mock function last returned.
   * If the last call to the mock function threw an error, then this matcher will fail
   * no matter what value you provided as the expected return value.
   */
  toHaveLastReturnedWith(expected?: unknown): R;
  /**
   * Used to check that an object has a `.length` property
   * and it is set to a certain numeric value.
   */
  toHaveLength(expected: number): R;
  /**
   * Use to test the specific value that a mock function returned for the nth call.
   * If the nth call to the mock function threw an error, then this matcher will fail
   * no matter what value you provided as the expected return value.
   */
  toHaveNthReturnedWith(nth: number, expected?: unknown): R;
  /**
   * Use to check if property at provided reference keyPath exists for an object.
   * For checking deeply nested properties in an object you may use dot notation or an array containing
   * the keyPath for deep references.
   *
   * Optionally, you can provide a value to check if it's equal to the value present at keyPath
   * on the target object. This matcher uses 'deep equality' (like `toEqual()`) and recursively checks
   * the equality of all fields.
   *
   * @example
   *
   * expect(houseForSale).toHaveProperty('kitchen.area', 20);
   */
  toHaveProperty(
    expectedPath: string | Array<string>,
    expectedValue?: unknown,
  ): R;
  /**
   * Use to test that the mock function successfully returned (i.e., did not throw an error) at least one time
   */
  toHaveReturned(): R;
  /**
   * Use to ensure that a mock function returned successfully (i.e., did not throw an error) an exact number of times.
   * Any calls to the mock function that throw an error are not counted toward the number of times the function returned.
   */
  toHaveReturnedTimes(expected: number): R;
  /**
   * Use to ensure that a mock function returned a specific value.
   */
  toHaveReturnedWith(expected?: unknown): R;
  /**
   * Check that a string matches a regular expression.
   */
  toMatch(expected: string | RegExp): R;
  /**
   * Used to check that a JavaScript object matches a subset of the properties of an object
   */
  toMatchObject(
    expected: Record<string, unknown> | Array<Record<string, unknown>>,
  ): R;
  /**
   * Ensure that a mock function has returned (as opposed to thrown) at least once.
   */
  toReturn(): R;
  /**
   * Ensure that a mock function has returned (as opposed to thrown) a specified number of times.
   */
  toReturnTimes(expected: number): R;
  /**
   * Ensure that a mock function has returned a specified value at least once.
   */
  toReturnWith(expected?: unknown): R;
  /**
   * Use to test that objects have the same types as well as structure.
   */
  toStrictEqual(expected: unknown): R;
  /**
   * Used to test that a function throws when it is called.
   */
  toThrow(expected?: unknown): R;
  /**
   * If you want to test that a specific error is thrown inside a function.
   */
  toThrowError(expected?: unknown): R;
}

declare type MatchersObject = {
  [name: string]: RawMatcherFn;
};

declare interface MatcherState {
  assertionCalls: number;
  currentConcurrentTestName?: AsyncLocalStorage<string>;
  currentTestName?: string;
  error?: Error;
  expand?: boolean;
  expectedAssertionsNumber: number | null;
  expectedAssertionsNumberError?: Error;
  isExpectingAssertions: boolean;
  isExpectingAssertionsError?: Error;
  isNot?: boolean;
  numPassingAsserts: number;
  promise?: string;
  suppressedErrors: Array<Error>;
  testPath?: string;
}

declare interface MatcherUtils {
  customTesters: Array<Tester>;
  dontThrow(): void;
  equals: EqualsFunction;
  utils: typeof jestMatcherUtils & {
    iterableEquality: Tester;
    subsetEquality: Tester;
  };
}

declare type PromiseMatchers<T = unknown> = {
  /**
   * Unwraps the reason of a rejected promise so any other matcher can be chained.
   * If the promise is fulfilled the assertion fails.
   */
  rejects: Matchers<Promise<void>, T> & Inverse<Matchers<Promise<void>, T>>;
  /**
   * Unwraps the value of a fulfilled promise so any other matcher can be chained.
   * If the promise is rejected the assertion fails.
   */
  resolves: Matchers<Promise<void>, T> & Inverse<Matchers<Promise<void>, T>>;
};

declare type RawMatcherFn<Context extends MatcherContext = MatcherContext> = {
  (this: Context, actual: any, ...expected: Array<any>): ExpectationResult;
};

declare type SyncExpectationResult = {
  pass: boolean;
  message(): string;
};

export { Context, Describe, Test, TestSuite, describe, expect, test, testSuite };
