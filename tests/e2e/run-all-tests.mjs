#!/usr/bin/env node
/**
 * Master E2E Test Suite Runner
 * Residencial Mar de Java Showroom
 *
 * Usage:
 *   node tests/e2e/run-all-tests.mjs           # Run all 4 tiers
 *   node tests/e2e/run-all-tests.mjs --tier=1  # Run only Tier 1
 *   node tests/e2e/run-all-tests.mjs --verbose # Detailed test logging
 */

import { runSuites, clearSuites } from './helpers/assertion.mjs';
import { registerTier1Tests } from './tier1-feature-coverage.test.mjs';
import { registerTier2Tests } from './tier2-boundary-cases.test.mjs';
import { registerTier3Tests } from './tier3-cross-feature.test.mjs';
import { registerTier4Tests } from './tier4-scenarios.test.mjs';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tier: null,
    verbose: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg.startsWith('--tier=')) {
      options.tier = parseInt(arg.split('=')[1], 10);
    } else if (arg === '-t' && args[args.indexOf(arg) + 1]) {
      options.tier = parseInt(args[args.indexOf(arg) + 1], 10);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
${colors.bold}${colors.cyan}Showroom Typologies Media & Ingestion Pipeline — E2E Test Runner${colors.reset}

${colors.bold}USAGE:${colors.reset}
  node tests/e2e/run-all-tests.mjs [options]

${colors.bold}OPTIONS:${colors.reset}
  --tier=<1|2|3|4>   Run tests only for the specified tier:
                       1: Tier 1 - Feature Coverage (8 folders, 3 base views, transitions, galleries)
                       2: Tier 2 - Boundary & Corner Cases (empty fields, invalid IDs, malformed JSON)
                       3: Tier 3 - Cross-Feature Interactions (floors.ts ↔ manifest ↔ seed.sql ↔ D1 ↔ proxy)
                       4: Tier 4 - Real-World Scenarios (apartment cycling, range streaming, duplex switching)
  --verbose, -v      Print verbose individual test execution details
  --help, -h         Show this help message
`);
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  console.log(`${colors.bold}${colors.cyan}=================================================================${colors.reset}`);
  console.log(`${colors.bold}   MAR DE JAVA SHOWROOM — E2E TEST SUITE RUNNER${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=================================================================${colors.reset}`);
  console.log(`Target:      Opaque-box E2E Verification`);
  console.log(`Environment: Node ${process.version}`);
  console.log(`Mode:        ${options.tier ? `Tier ${options.tier} Only` : 'Full 4-Tier Test Suite'}`);
  console.log(`Timestamp:   ${new Date().toISOString()}`);

  clearSuites();

  const runAll = options.tier === null;

  if (runAll || options.tier === 1) {
    registerTier1Tests();
  }
  if (runAll || options.tier === 2) {
    registerTier2Tests();
  }
  if (runAll || options.tier === 3) {
    registerTier3Tests();
  }
  if (runAll || options.tier === 4) {
    registerTier4Tests();
  }

  const results = await runSuites({ verbose: options.verbose });

  if (results.failed > 0) {
    console.error(`${colors.bold}${colors.red}FAILED: ${results.failed} tests failed.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.bold}${colors.green}SUCCESS: All ${results.passed} tests passed successfully!${colors.reset}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`${colors.bold}${colors.red}FATAL ERROR during test execution:${colors.reset}`, err);
  process.exit(1);
});
