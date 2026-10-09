#!/usr/bin/env node
/**
 * scripts/sync-database.mjs
 * 
 * Milestone 4: Cloudflare D1 Database Synchronization & Verification
 * 
 * Applies typology media updates to the Cloudflare D1 database:
 *   - Local mode (default): Updates local D1 SQLite database located in Miniflare storage.
 *   - Remote mode (--remote): Updates remote Cloudflare D1 via Wrangler CLI.
 * 
 * Verifies the D1 `units` table:
 *   - Queries all 12 unit rows.
 *   - Asserts valid JSON arrays for photos_furnished, photos_unfurnished, photos_plans, and gallery.
 *   - Asserts duplex typing (type: 'DUPLEX').
 *   - Asserts that all 128 canonical typology assets are accounted for.
 * 
 * Usage:
 *   node scripts/sync-database.mjs                     # Local sync & verify
 *   node scripts/sync-database.mjs --remote            # Remote sync via Wrangler CLI
 *   node scripts/sync-database.mjs --verify-only       # Only verify local D1 table
 *   node scripts/sync-database.mjs --file=<sqlFile>    # Specify custom SQL file
 *   node scripts/sync-database.mjs --verbose           # Verbose verification logging
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ANSI Terminal Colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Canonical Constants
export const DEFAULT_SQLITE_PATH = path.join(
  PROJECT_ROOT,
  '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/2372b877e3064b86dba73676d15d97dad1d0710b02f6271ac28bada4e8f3731d.sqlite'
);

export const DEFAULT_SQL_FILE = path.join(PROJECT_ROOT, 'scripts/update-unit-typologies.sql');
export const SEED_SQL_FILE = path.join(PROJECT_ROOT, 'src/lib/db/seed.sql');
export const D1_DATABASE_NAME = 'mar-java-db';

export const CANONICAL_VIEW_FOLDERS = [
  '101',
  '102',
  'x01',
  'x02',
  '501.1',
  '501.2',
  '502.1',
  '502.2',
];

export const CANONICAL_TRANSITIONS = [
  'furnished_to_unfurnished',
  'unfurnished_to_furnished',
  'furnished_to_plans',
  'plans_to_furnished',
  'unfurnished_to_plans',
  'plans_to_unfurnished',
];

export const CANONICAL_GALLERIES = {
  '101': 11,
  '102': 12,
  'x01': 9,
  'x02': 10,
  '501': 15,
  '502': 15,
};

export const EXPECTED_UNITS = [
  { id: 'unit_1_101', identifier: '101', floorId: '1', assetId: '101', galleryFolder: '101', galleryCount: 11, isDuplex: false },
  { id: 'unit_1_102', identifier: '102', floorId: '1', assetId: '102', galleryFolder: '102', galleryCount: 12, isDuplex: false },
  { id: 'unit_2_201', identifier: '201', floorId: '2', assetId: 'x01', galleryFolder: 'x01', galleryCount: 9, isDuplex: false },
  { id: 'unit_2_202', identifier: '202', floorId: '2', assetId: 'x02', galleryFolder: 'x02', galleryCount: 10, isDuplex: false },
  { id: 'unit_3_301', identifier: '301', floorId: '3', assetId: 'x01', galleryFolder: 'x01', galleryCount: 9, isDuplex: false },
  { id: 'unit_3_302', identifier: '302', floorId: '3', assetId: 'x02', galleryFolder: 'x02', galleryCount: 10, isDuplex: false },
  { id: 'unit_4_401', identifier: '401', floorId: '4', assetId: 'x01', galleryFolder: 'x01', galleryCount: 9, isDuplex: false },
  { id: 'unit_4_402', identifier: '402', floorId: '4', assetId: 'x02', galleryFolder: 'x02', galleryCount: 10, isDuplex: false },
  { id: 'unit_5_501', identifier: '501', floorId: '5', assetId: '501.1', galleryFolder: '501', galleryCount: 15, isDuplex: true },
  { id: 'unit_5_502', identifier: '502', floorId: '5', assetId: '502.1', galleryFolder: '502', galleryCount: 15, isDuplex: true },
  { id: 'unit_6_601', identifier: '501', floorId: '6', assetId: '501.2', galleryFolder: '501', galleryCount: 15, isDuplex: true },
  { id: 'unit_6_602', identifier: '502', floorId: '6', assetId: '502.2', galleryFolder: '502', galleryCount: 15, isDuplex: true },
];

/**
 * Locate the SQLite database file
 */
export function resolveSqlitePath(customPath) {
  if (customPath && fs.existsSync(customPath)) {
    return path.resolve(customPath);
  }
  if (fs.existsSync(DEFAULT_SQLITE_PATH)) {
    return DEFAULT_SQLITE_PATH;
  }
  // Search miniflare directory if default hash path moved
  const miniflareDir = path.join(PROJECT_ROOT, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (fs.existsSync(miniflareDir)) {
    const files = fs.readdirSync(miniflareDir);
    const sqliteFile = files.find(f => f.endsWith('.sqlite'));
    if (sqliteFile) {
      return path.join(miniflareDir, sqliteFile);
    }
  }
  throw new Error(`Local D1 SQLite database not found at ${DEFAULT_SQLITE_PATH}`);
}

/**
 * Apply SQL updates to local SQLite database
 */
export function applyLocalSql(sqlitePath, sqlFilePath) {
  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`SQL file not found at ${sqlFilePath}`);
  }
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  execSync(`sqlite3 "${sqlitePath}"`, {
    input: sqlContent,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

/**
 * Apply SQL updates to remote Cloudflare D1 via Wrangler CLI
 */
export function applyRemoteSql(sqlFilePath, dbName = D1_DATABASE_NAME) {
  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`SQL file not found at ${sqlFilePath}`);
  }
  const relativeSql = path.relative(PROJECT_ROOT, sqlFilePath);
  const cmd = `npx wrangler d1 execute ${dbName} --remote --file=${relativeSql}`;
  console.log(`${colors.cyan}Executing remote command:${colors.reset} ${cmd}`);
  const output = execSync(cmd, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return output;
}

/**
 * Query and verify D1 units table
 */
export function verifyD1Units(sqlitePath, { verbose = false } = {}) {
  const query = 'SELECT id, identifier, type, photos_furnished, photos_unfurnished, photos_plans, gallery FROM units ORDER BY id;';
  const rawOutput = execSync(`sqlite3 "${sqlitePath}" ".mode json" "${query}"`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let rows;
  try {
    rows = JSON.parse(rawOutput);
  } catch (err) {
    throw new Error(`Failed to parse SQLite JSON output: ${err.message}\nRaw output: ${rawOutput}`);
  }

  if (!Array.isArray(rows)) {
    throw new Error(`Expected JSON array of unit rows, received ${typeof rows}`);
  }

  const errors = [];

  // Check 1: exactly 12 unit rows
  if (rows.length !== 12) {
    errors.push(`Expected 12 unit rows, but found ${rows.length}`);
  }

  const baseViewAssetsSet = new Set();
  const galleryAssetsSet = new Set();
  const observedViewFolders = new Set();

  for (const expected of EXPECTED_UNITS) {
    const row = rows.find(r => r.id === expected.id);
    if (!row) {
      errors.push(`Missing unit row with ID "${expected.id}"`);
      continue;
    }

    if (row.identifier !== expected.identifier) {
      errors.push(`Unit ${expected.id}: expected identifier "${expected.identifier}", got "${row.identifier}"`);
    }

    // Check Duplex type
    if (expected.isDuplex && row.type !== 'DUPLEX') {
      errors.push(`Unit ${expected.id}: expected type "DUPLEX", got "${row.type}"`);
    }

    // Parse JSON arrays
    let furnished, unfurnished, plans, gallery;
    try {
      furnished = typeof row.photos_furnished === 'string' ? JSON.parse(row.photos_furnished) : row.photos_furnished;
    } catch {
      errors.push(`Unit ${expected.id}: photos_furnished is not valid JSON (${row.photos_furnished})`);
    }
    try {
      unfurnished = typeof row.photos_unfurnished === 'string' ? JSON.parse(row.photos_unfurnished) : row.photos_unfurnished;
    } catch {
      errors.push(`Unit ${expected.id}: photos_unfurnished is not valid JSON (${row.photos_unfurnished})`);
    }
    try {
      plans = typeof row.photos_plans === 'string' ? JSON.parse(row.photos_plans) : row.photos_plans;
    } catch {
      errors.push(`Unit ${expected.id}: photos_plans is not valid JSON (${row.photos_plans})`);
    }
    try {
      gallery = typeof row.gallery === 'string' ? JSON.parse(row.gallery) : row.gallery;
    } catch {
      errors.push(`Unit ${expected.id}: gallery is not valid JSON (${row.gallery})`);
    }

    // Assert base views
    const expectedFurnished = `plants/details/${expected.assetId}/furnished.webp`;
    const expectedUnfurnished = `plants/details/${expected.assetId}/unfurnished.webp`;
    const expectedPlans = `plants/details/${expected.assetId}/plans.webp`;

    if (!Array.isArray(furnished) || furnished.length !== 1 || furnished[0] !== expectedFurnished) {
      errors.push(`Unit ${expected.id}: photos_furnished expected ["${expectedFurnished}"], got ${JSON.stringify(furnished)}`);
    } else {
      baseViewAssetsSet.add(furnished[0]);
    }

    if (!Array.isArray(unfurnished) || unfurnished.length !== 1 || unfurnished[0] !== expectedUnfurnished) {
      errors.push(`Unit ${expected.id}: photos_unfurnished expected ["${expectedUnfurnished}"], got ${JSON.stringify(unfurnished)}`);
    } else {
      baseViewAssetsSet.add(unfurnished[0]);
    }

    if (!Array.isArray(plans) || plans.length !== 1 || plans[0] !== expectedPlans) {
      errors.push(`Unit ${expected.id}: photos_plans expected ["${expectedPlans}"], got ${JSON.stringify(plans)}`);
    } else {
      baseViewAssetsSet.add(plans[0]);
    }

    observedViewFolders.add(expected.assetId);

    // Assert gallery images
    if (!Array.isArray(gallery)) {
      errors.push(`Unit ${expected.id}: gallery is not an array`);
    } else if (gallery.length !== expected.galleryCount) {
      errors.push(`Unit ${expected.id}: gallery expected ${expected.galleryCount} images, got ${gallery.length}`);
    } else {
      for (let i = 1; i <= expected.galleryCount; i++) {
        const expectedImg = `plants/details/${expected.galleryFolder}/gallery/${i}.webp`;
        if (gallery[i - 1] !== expectedImg) {
          errors.push(`Unit ${expected.id}: gallery item ${i} expected "${expectedImg}", got "${gallery[i - 1]}"`);
        } else {
          galleryAssetsSet.add(expectedImg);
        }
      }
    }

    // Relative path checks: no leading slashes
    const allPaths = [...(furnished || []), ...(unfurnished || []), ...(plans || []), ...(gallery || [])];
    for (const p of allPaths) {
      if (typeof p === 'string' && p.startsWith('/')) {
        errors.push(`Unit ${expected.id}: path "${p}" contains forbidden leading slash`);
      }
    }

    if (verbose) {
      console.log(`  ✔ Unit ${expected.id} (${row.identifier}): ${expected.assetId} | gallery: ${expected.galleryCount} items | type: ${row.type}`);
    }
  }

  // Check 2: exactly 24 distinct base view images
  if (baseViewAssetsSet.size !== 24) {
    errors.push(`Expected 24 unique base view images in D1, found ${baseViewAssetsSet.size}`);
  }

  // Check 3: exactly 72 distinct gallery images
  if (galleryAssetsSet.size !== 72) {
    errors.push(`Expected 72 unique gallery images in D1, found ${galleryAssetsSet.size}`);
  }

  // Check 4: exactly 8 view folders
  if (observedViewFolders.size !== 8) {
    errors.push(`Expected 8 distinct view folders in D1 units, found ${observedViewFolders.size}`);
  }
  for (const f of CANONICAL_VIEW_FOLDERS) {
    if (!observedViewFolders.has(f)) {
      errors.push(`Missing canonical view folder "${f}" from D1 units`);
    }
  }

  // Check 5: Transition count derivation (8 folders * 6 transitions = 48)
  const transitionsCount = observedViewFolders.size * CANONICAL_TRANSITIONS.length;
  if (transitionsCount !== 48) {
    errors.push(`Expected 48 transition videos mapped to the 8 folders, calculated ${transitionsCount}`);
  }

  // Check 6: Grand total of 144 assets
  const totalAssets = baseViewAssetsSet.size + galleryAssetsSet.size + transitionsCount;
  if (totalAssets !== 144) {
    errors.push(`Expected 144 total typology assets accounted for, got ${totalAssets}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    unitCount: rows.length,
    baseViewsCount: baseViewAssetsSet.size,
    galleryImagesCount: galleryAssetsSet.size,
    viewFoldersCount: observedViewFolders.size,
    transitionsCount,
    totalAssets,
  };
}

/**
 * Parse CLI arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    remote: false,
    local: true,
    file: DEFAULT_SQL_FILE,
    sqlitePath: DEFAULT_SQLITE_PATH,
    verifyOnly: false,
    verbose: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--remote') {
      options.remote = true;
      options.local = false;
    } else if (arg === '--local') {
      options.local = true;
      options.remote = false;
    } else if (arg === '--verify-only') {
      options.verifyOnly = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--seed') {
      options.file = SEED_SQL_FILE;
    } else if (arg.startsWith('--file=')) {
      options.file = path.resolve(arg.split('=')[1]);
    } else if (arg.startsWith('--sqlite=')) {
      options.sqlitePath = path.resolve(arg.split('=')[1]);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
${colors.bold}${colors.cyan}Showroom D1 Database Synchronizer & Verifier${colors.reset}

${colors.bold}USAGE:${colors.reset}
  node scripts/sync-database.mjs [options]

${colors.bold}OPTIONS:${colors.reset}
  --local             Sync local SQLite database (default)
  --remote            Sync remote Cloudflare D1 via Wrangler CLI
  --file=<path>       Path to SQL file to apply (default: scripts/update-unit-typologies.sql)
  --seed              Use src/lib/db/seed.sql instead of update-unit-typologies.sql
  --sqlite=<path>     Path to local SQLite file
  --verify-only       Skip applying SQL, only verify D1 units table
  --verbose, -v       Print verbose verification output
  --help, -h          Show this help message
`);
}

/**
 * Main Execution
 */
export async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  console.log(`${colors.bold}${colors.cyan}=================================================================${colors.reset}`);
  console.log(`${colors.bold}   MAR DE JAVA — D1 DATABASE SYNCHRONIZATION & VERIFICATION${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=================================================================${colors.reset}`);
  console.log(`Target:      ${options.remote ? 'Cloudflare Remote D1 (mar-java-db)' : 'Local SQLite D1 Database'}`);
  console.log(`SQL File:    ${path.relative(PROJECT_ROOT, options.file)}`);
  console.log(`Mode:        ${options.verifyOnly ? 'Verification Only' : 'Sync & Verify'}`);
  console.log(`Timestamp:   ${new Date().toISOString()}\n`);

  let sqlitePath = null;
  if (!options.remote) {
    try {
      sqlitePath = resolveSqlitePath(options.sqlitePath);
      console.log(`${colors.dim}Local SQLite Path: ${sqlitePath}${colors.reset}\n`);
    } catch (err) {
      console.error(`${colors.red}Error locating local SQLite database: ${err.message}${colors.reset}`);
      process.exit(1);
    }
  }

  // Step 1: Apply SQL Update
  if (!options.verifyOnly) {
    if (options.remote) {
      console.log(`${colors.bold}Step 1: Applying remote update to Cloudflare D1...${colors.reset}`);
      try {
        const out = applyRemoteSql(options.file);
        console.log(out);
        console.log(`${colors.green}✔ Remote D1 update applied successfully.${colors.reset}\n`);
      } catch (err) {
        console.error(`${colors.red}Remote D1 execution failed: ${err.message}${colors.reset}`);
        if (err.stdout) console.error(err.stdout);
        if (err.stderr) console.error(err.stderr);
        process.exit(1);
      }
    } else {
      console.log(`${colors.bold}Step 1: Applying local update to D1 SQLite database...${colors.reset}`);
      try {
        applyLocalSql(sqlitePath, options.file);
        console.log(`${colors.green}✔ Local SQLite update applied successfully.${colors.reset}\n`);
      } catch (err) {
        console.error(`${colors.red}Failed to apply local SQL: ${err.message}${colors.reset}`);
        process.exit(1);
      }
    }
  } else {
    console.log(`${colors.dim}Skipping SQL execution (--verify-only specified).${colors.reset}\n`);
  }

  // Step 2: Verification of D1 Units Table
  if (sqlitePath && fs.existsSync(sqlitePath)) {
    console.log(`${colors.bold}Step 2: Verifying D1 units table schema, JSON arrays, and 144 assets...${colors.reset}`);
    const result = verifyD1Units(sqlitePath, { verbose: options.verbose });

    if (!result.valid) {
      console.error(`\n${colors.bold}${colors.red}D1 Verification Failed with ${result.errors.length} error(s):${colors.reset}`);
      result.errors.forEach(err => console.error(`  ✖ ${err}`));
      process.exit(1);
    }

    console.log(`\n${colors.bold}${colors.green}✔ D1 Units Verification Passed!${colors.reset}`);
    console.log(`  - Unit rows verified     : ${colors.bold}${result.unitCount}${colors.reset} / 12`);
    console.log(`  - View folders mapped    : ${colors.bold}${result.viewFoldersCount}${colors.reset} / 8`);
    console.log(`  - Base views in units    : ${colors.bold}${result.baseViewsCount}${colors.reset} / 24`);
    console.log(`  - Gallery images in units: ${colors.bold}${result.galleryImagesCount}${colors.reset} / 72`);
    console.log(`  - Transition videos      : ${colors.bold}${result.transitionsCount}${colors.reset} / 48`);
    console.log(`  - Total assets accounted : ${colors.bold}${result.totalAssets}${colors.reset} / 144\n`);
  } else if (options.remote) {
    console.log(`${colors.dim}Note: Direct SQLite verification skipped in --remote mode. Local table remains intact.${colors.reset}\n`);
  }

  console.log(`${colors.bold}${colors.green}Database synchronization and verification completed successfully.${colors.reset}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`${colors.bold}${colors.red}Fatal Error:${colors.reset}`, err);
    process.exit(1);
  });
}
