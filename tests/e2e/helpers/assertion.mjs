/**
 * Zero-dependency E2E Test Assertion Framework & Runner Utility
 * Residencial Mar de Java Showroom
 */

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

class TestSuiteContext {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.startTime = 0;
    this.duration = 0;
  }
}

let activeSuite = null;
const allSuites = [];

export function describe(suiteName, fn) {
  const previousSuite = activeSuite;
  const suite = new TestSuiteContext(suiteName);
  allSuites.push(suite);
  activeSuite = suite;

  try {
    fn();
  } finally {
    activeSuite = previousSuite;
  }
}

export function it(testName, fn) {
  if (!activeSuite) {
    throw new Error(`Test "${testName}" must be inside a describe block`);
  }
  activeSuite.tests.push({ name: testName, fn, status: 'pending', error: null, duration: 0 });
}

export const test = it;

export function expect(actual) {
  return {
    toBe(expected, message = '') {
      if (actual !== expected) {
        throw new Error(message || `Expected ${JSON.stringify(expected)}, but received ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected, message = '') {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(message || `Expected deep equality:\n  Expected: ${b}\n  Received: ${a}`);
      }
    },
    toBeTruthy(message = '') {
      if (!actual) {
        throw new Error(message || `Expected value to be truthy, got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy(message = '') {
      if (actual) {
        throw new Error(message || `Expected value to be falsy, got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected, message = '') {
      if (!(actual > expected)) {
        throw new Error(message || `Expected ${actual} > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected, message = '') {
      if (!(actual >= expected)) {
        throw new Error(message || `Expected ${actual} >= ${expected}`);
      }
    },
    toBeLessThan(expected, message = '') {
      if (!(actual < expected)) {
        throw new Error(message || `Expected ${actual} < ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected, message = '') {
      if (!(actual <= expected)) {
        throw new Error(message || `Expected ${actual} <= ${expected}`);
      }
    },
    toContain(expected, message = '') {
      if (typeof actual === 'string' || Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(message || `Expected container to include ${JSON.stringify(expected)}`);
        }
      } else {
        throw new Error(`toContain called on non-container type: ${typeof actual}`);
      }
    },
    toMatch(regex, message = '') {
      if (!regex.test(String(actual))) {
        throw new Error(message || `Expected ${JSON.stringify(actual)} to match pattern ${regex}`);
      }
    },
    toThrow(expectedErrorPattern = null) {
      if (typeof actual !== 'function') {
        throw new Error('toThrow requires a function');
      }
      let threw = false;
      let caughtError = null;
      try {
        actual();
      } catch (err) {
        threw = true;
        caughtError = err;
      }
      if (!threw) {
        throw new Error('Expected function to throw, but it did not throw');
      }
      if (expectedErrorPattern) {
        const msg = caughtError?.message || String(caughtError);
        if (expectedErrorPattern instanceof RegExp) {
          if (!expectedErrorPattern.test(msg)) {
            throw new Error(`Expected error matching ${expectedErrorPattern}, got "${msg}"`);
          }
        } else if (!msg.includes(expectedErrorPattern)) {
          throw new Error(`Expected error containing "${expectedErrorPattern}", got "${msg}"`);
        }
      }
    },
    toBeDefined(message = '') {
      if (actual === undefined) {
        throw new Error(message || 'Expected value to be defined');
      }
    },
    toBeNull(message = '') {
      if (actual !== null) {
        throw new Error(message || `Expected null, got ${JSON.stringify(actual)}`);
      }
    },
    toBeCloseTo(expected, delta = 0.001) {
      if (Math.abs(actual - expected) > delta) {
        throw new Error(`Expected ${actual} to be within ${delta} of ${expected}`);
      }
    }
  };
}

export async function runSuites({ verbose = false } = {}) {
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const failures = [];

  const startTime = Date.now();

  for (const suite of allSuites) {
    console.log(`\n${colors.bold}${colors.cyan}● ${suite.name}${colors.reset}`);
    suite.startTime = Date.now();

    for (const t of suite.tests) {
      totalTests++;
      const t0 = Date.now();
      try {
        if (t.fn.constructor.name === 'AsyncFunction') {
          await t.fn();
        } else {
          t.fn();
        }
        t.status = 'passed';
        t.duration = Date.now() - t0;
        suite.passed++;
        totalPassed++;
        if (verbose) {
          console.log(`  ${colors.green}✔${colors.reset} ${t.name} ${colors.gray}(${t.duration}ms)${colors.reset}`);
        } else {
          process.stdout.write(`${colors.green}✔${colors.reset} `);
        }
      } catch (err) {
        t.status = 'failed';
        t.duration = Date.now() - t0;
        t.error = err;
        suite.failed++;
        totalFailed++;
        failures.push({ suite: suite.name, test: t.name, error: err });
        if (verbose) {
          console.log(`  ${colors.red}✖ ${t.name} (${t.duration}ms)${colors.reset}`);
          console.log(`    ${colors.red}${err.message}${colors.reset}`);
        } else {
          process.stdout.write(`${colors.red}✖${colors.reset} `);
        }
      }
    }
    if (!verbose) {
      console.log(` ${colors.gray}(${suite.passed}/${suite.tests.length} passed)${colors.reset}`);
    }
    suite.duration = Date.now() - suite.startTime;
  }

  const totalDuration = Date.now() - startTime;

  console.log(`\n${colors.bold}─────────────────────────────────────────────────────────────────${colors.reset}`);
  console.log(`${colors.bold}Test Summary${colors.reset}`);
  console.log(`  Suites:   ${allSuites.length}`);
  console.log(`  Total:    ${totalTests}`);
  console.log(`  Passed:   ${colors.green}${totalPassed}${colors.reset}`);
  console.log(`  Failed:   ${totalFailed > 0 ? colors.red + totalFailed + colors.reset : '0'}`);
  console.log(`  Duration: ${totalDuration}ms`);

  if (failures.length > 0) {
    console.log(`\n${colors.bold}${colors.red}Failures (${failures.length}):${colors.reset}`);
    failures.forEach((f, idx) => {
      console.log(`\n  ${idx + 1}) [${f.suite}] ${f.test}`);
      console.log(`     ${colors.red}${f.error.stack || f.error.message}${colors.reset}`);
    });
  }

  console.log(`${colors.bold}─────────────────────────────────────────────────────────────────${colors.reset}\n`);

  return {
    total: totalTests,
    passed: totalPassed,
    failed: totalFailed,
    duration: totalDuration,
    failures,
  };
}

export function clearSuites() {
  allSuites.length = 0;
  activeSuite = null;
}
