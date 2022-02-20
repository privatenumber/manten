export { default as expect } from 'expect';

let FORCE_COLOR, NODE_DISABLE_COLORS, NO_COLOR, TERM, isTTY=true;
if (typeof process !== 'undefined') {
	({ FORCE_COLOR, NODE_DISABLE_COLORS, NO_COLOR, TERM } = process.env);
	isTTY = process.stdout && process.stdout.isTTY;
}

const $ = {
	enabled: !NODE_DISABLE_COLORS && NO_COLOR == null && TERM !== 'dumb' && (
		FORCE_COLOR != null && FORCE_COLOR !== '0' || isTTY
	)
};

function init(x, y) {
	let rgx = new RegExp(`\\x1b\\[${y}m`, 'g');
	let open = `\x1b[${x}m`, close = `\x1b[${y}m`;

	return function (txt) {
		if (!$.enabled || txt == null) return txt;
		return open + (!!~(''+txt).indexOf(close) ? txt.replace(rgx, close + open) : txt) + close;
	};
}
const red = init(31, 39);
const green = init(32, 39);

const successIcon = green("\u2714");
const failureIcon = red("\u2716");
function createTest(prefix, pendingTests) {
  return async function test(title, testFunction) {
    if (prefix) {
      title = `${prefix} ${title}`;
    }
    const testRunning = (async () => {
      try {
        await testFunction();
        console.log(successIcon, title);
      } catch (error) {
        console.error(failureIcon, title);
        if ("matcherResult" in error && error.constructor.name === "JestAssertionError") {
          delete error.matcherResult;
        }
        console.error(error);
        process.exitCode = 1;
      }
    })();
    if (pendingTests) {
      pendingTests.push(testRunning);
    }
    await testRunning;
  };
}

async function waitAllPromises(promises) {
  while (promises.length > 0) {
    const currentPromises = promises.splice(0);
    await Promise.all(currentPromises);
  }
}
function createDescribe(prefix, pendingTests) {
  return async function describe(description, callback) {
    if (prefix) {
      description = `${prefix} ${description}`;
    }
    const childTests = [];
    try {
      const inProgress = (async () => {
        const context = {
          test: createTest(`${description} \u203A`, childTests),
          describe: createDescribe(`${description} \u203A`, childTests),
          runTestSuite: (testSuite, ...args) => {
            const runningTestSuite = (async () => {
              let maybeTestSuiteModule = await testSuite;
              if ("default" in maybeTestSuiteModule) {
                maybeTestSuiteModule = maybeTestSuiteModule.default;
              }
              return maybeTestSuiteModule.apply(context, args);
            })();
            childTests.push(runningTestSuite);
            return runningTestSuite;
          }
        };
        await callback(context);
        await waitAllPromises(childTests);
      })();
      if (pendingTests) {
        pendingTests.push(inProgress);
      }
      await inProgress;
    } catch (error) {
      console.error(error);
    }
  };
}

const test = createTest();
const describe = createDescribe();

const defaultContext = {
  describe,
  test,
  runTestSuite: async (testSuiteImport, ...args) => {
    let testSuiteModule = await testSuiteImport;
    if ("default" in testSuiteModule) {
      testSuiteModule = testSuiteModule.default;
    }
    return testSuiteModule.apply(defaultContext, args);
  }
};
function testSuite(callback) {
  return function(...callbackArgs) {
    return callback(this || defaultContext, ...callbackArgs);
  };
}

export { describe, test, testSuite };
