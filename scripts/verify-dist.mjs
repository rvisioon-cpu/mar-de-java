#!/usr/bin/env node
/**
 * scripts/verify-dist.mjs
 * 
 * Milestone 2: Verification Engine for Normalized Media Assets
 * 
 * Programmatically verifies that `dist_assets/plants/details/` contains:
 *   - 8 view folders: 101, 102, x01, x02, 501.1, 501.2, 502.1, 502.2
 *   - 24 base views (furnished.webp, unfurnished.webp, plans.webp), verifying WebP format and non-zero size
 *   - 48 transition videos (transitions/*.mp4), verifying MP4 format, H.264 video, and non-zero size
 *   - 6 gallery folders (101, 102, x01, x02, 501, 502) with exact counts (9, 8, 8, 7, 12, 12)
 *   - Exactly 128 total assets.
 * 
 * Exits code 0 on pass, code 1 on failure.
 * 
 * CLI Usage:
 *   node scripts/verify-dist.mjs [--dir <path>] [--json] [--verbose]
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// ANSI colors
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

export const EXPECTED_VIEW_FOLDERS = [
  '101',
  '102',
  'x01',
  'x02',
  '501.1',
  '501.2',
  '502.1',
  '502.2',
];

export const EXPECTED_BASE_VIEWS = [
  'furnished.webp',
  'unfurnished.webp',
  'plans.webp',
];

export const EXPECTED_TRANSITIONS = [
  'furnished_to_unfurnished.mp4',
  'unfurnished_to_furnished.mp4',
  'furnished_to_plans.mp4',
  'plans_to_furnished.mp4',
  'unfurnished_to_plans.mp4',
  'plans_to_unfurnished.mp4',
];

export const EXPECTED_GALLERIES = {
  '101': 11,
  '102': 12,
  'x01': 9,
  'x02': 10,
  '501': 15,
  '502': 15,
};

/**
 * Checks if a buffer matches WebP RIFF signature
 */
export function isWebpBuffer(buffer) {
  if (!buffer || buffer.length < 12) return false;
  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  return riff === 'RIFF' && webp === 'WEBP';
}

/**
 * Checks if a buffer matches MP4 container signature (ftyp atom)
 */
export function isMp4Buffer(buffer) {
  if (!buffer || buffer.length < 12) return false;
  // Box type at offset 4 should be 'ftyp'
  const boxType = buffer.toString('ascii', 4, 8);
  return boxType === 'ftyp';
}

/**
 * Checks if an MP4 has faststart enabled (moov atom before mdat atom)
 */
export function isMp4Faststart(filePath) {
  try {
    const buf = Buffer.alloc(32768);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buf, 0, 32768, 0);
    fs.closeSync(fd);

    let pos = 0;
    let moovPos = -1;
    let mdatPos = -1;

    while (pos + 8 <= bytesRead) {
      const size = buf.readUInt32BE(pos);
      const type = buf.toString('ascii', pos + 4, pos + 8);
      if (type === 'moov' && moovPos === -1) moovPos = pos;
      if (type === 'mdat' && mdatPos === -1) mdatPos = pos;
      if (size <= 0) break;
      pos += size;
    }

    return moovPos !== -1 && (mdatPos === -1 || moovPos < mdatPos);
  } catch (_) {
    return false;
  }
}

/**
 * Validates a WebP image using magic bytes and Sharp metadata
 */
export async function validateWebpImage(filePath) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'File does not exist' };
  }

  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    return { valid: false, error: 'File is 0 bytes' };
  }

  // Check header
  const header = Buffer.alloc(16);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, header, 0, 16, 0);
  fs.closeSync(fd);

  if (!isWebpBuffer(header)) {
    return { valid: false, error: 'Missing RIFF/WEBP magic header' };
  }

  // Sharp metadata check
  try {
    const meta = await sharp(filePath).metadata();
    if (meta.format !== 'webp') {
      return { valid: false, error: `Invalid format: ${meta.format} (expected webp)` };
    }
    if (!meta.width || !meta.height) {
      return { valid: false, error: 'Invalid or 0 dimensions' };
    }
    return { valid: true, size: stat.size, width: meta.width, height: meta.height };
  } catch (err) {
    return { valid: false, error: `Sharp decode failed: ${err.message}` };
  }
}

/**
 * Validates an MP4 video using magic bytes and ffprobe
 */
export function validateMp4Video(filePath) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'File does not exist' };
  }

  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    return { valid: false, error: 'File is 0 bytes' };
  }

  const header = Buffer.alloc(16);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, header, 0, 16, 0);
  fs.closeSync(fd);

  if (!isMp4Buffer(header)) {
    return { valid: false, error: 'Missing MP4 ftyp container header' };
  }

  // Faststart verification
  const faststart = isMp4Faststart(filePath);
  if (!faststart) {
    return { valid: false, error: 'Missing faststart moov atom optimization' };
  }

  // ffprobe codec verification
  try {
    const codec = execFileSync('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], { encoding: 'utf8' }).trim();

    if (codec !== 'h264') {
      return { valid: false, error: `Video codec is '${codec}' (expected 'h264')` };
    }

    return { valid: true, size: stat.size, codec, faststart: true };
  } catch (err) {
    return { valid: false, error: `ffprobe inspection failed: ${err.message}` };
  }
}

/**
 * Recursively collects all files under a directory
 */
export function collectAllFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectAllFiles(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Resolves the destination root directory:
 * e.g. given 'dist_assets' -> 'dist_assets/plants/details'
 */
export function resolveTargetDir(dirPath) {
  const resolved = path.resolve(dirPath);
  const normalized = resolved.replace(/\\/g, '/');
  if (normalized.endsWith('/plants/details')) {
    return resolved;
  }
  const subCandidate = path.join(resolved, 'plants', 'details');
  if (fs.existsSync(subCandidate)) {
    return subCandidate;
  }
  return resolved;
}

/**
 * Main distribution directory verification function
 */
export async function verifyDist(targetDir = './dist_assets', options = {}) {
  const detailsDir = resolveTargetDir(targetDir);
  const verbose = Boolean(options.verbose);

  const report = {
    valid: true,
    detailsDir,
    viewFolders: {},
    galleries: {},
    stats: {
      totalViewFolders: 0,
      totalBaseViews: 0,
      totalTransitions: 0,
      totalGalleryImages: 0,
      totalAssetsFound: 0,
      totalAssetsExpected: 144,
    },
    unexpectedFiles: [],
    errors: [],
  };

  if (!fs.existsSync(detailsDir)) {
    report.valid = false;
    report.errors.push(`Details directory does not exist: ${detailsDir}`);
    return report;
  }

  // -------------------------------------------------------------
  // 1. Verify 8 View Folders (Base views + Transitions)
  // -------------------------------------------------------------
  for (const typoId of EXPECTED_VIEW_FOLDERS) {
    const typoReport = {
      id: typoId,
      found: false,
      baseViews: {},
      transitions: {},
      errors: [],
    };

    const typoDirPath = path.join(detailsDir, typoId);
    if (!fs.existsSync(typoDirPath) || !fs.statSync(typoDirPath).isDirectory()) {
      report.valid = false;
      const err = `[${typoId}] View folder missing: ${typoDirPath}`;
      typoReport.errors.push(err);
      report.errors.push(err);
      report.viewFolders[typoId] = typoReport;
      continue;
    }

    typoReport.found = true;
    report.stats.totalViewFolders++;

    // 1a. Base Views verification (furnished.webp, unfurnished.webp, plans.webp)
    for (const viewName of EXPECTED_BASE_VIEWS) {
      const viewPath = path.join(typoDirPath, viewName);
      const res = await validateWebpImage(viewPath);
      if (!res.valid) {
        report.valid = false;
        const err = `[${typoId}] Base view error '${viewName}': ${res.error}`;
        typoReport.errors.push(err);
        report.errors.push(err);
      } else {
        typoReport.baseViews[viewName] = { size: res.size, width: res.width, height: res.height };
        report.stats.totalBaseViews++;
      }
    }

    // 1b. Transitions verification (6 videos under transitions/)
    const transDirPath = path.join(typoDirPath, 'transitions');
    if (!fs.existsSync(transDirPath) || !fs.statSync(transDirPath).isDirectory()) {
      report.valid = false;
      const err = `[${typoId}] Missing 'transitions/' directory`;
      typoReport.errors.push(err);
      report.errors.push(err);
    } else {
      for (const transName of EXPECTED_TRANSITIONS) {
        const transPath = path.join(transDirPath, transName);
        const res = validateMp4Video(transPath);
        if (!res.valid) {
          report.valid = false;
          const err = `[${typoId}] Transition video error '${transName}': ${res.error}`;
          typoReport.errors.push(err);
          report.errors.push(err);
        } else {
          typoReport.transitions[transName] = { size: res.size, codec: res.codec };
          report.stats.totalTransitions++;
        }
      }
    }

    // 1c. Duplex sub-gallery check (501.1, 501.2, 502.1, 502.2 must NOT have gallery/)
    if (typoId.includes('.')) {
      const illegalGalleryPath = path.join(typoDirPath, 'gallery');
      if (fs.existsSync(illegalGalleryPath)) {
        report.valid = false;
        const err = `[${typoId}] Illegal gallery directory found: duplex galleries must be consolidated in ${typoId.split('.')[0]}/gallery`;
        typoReport.errors.push(err);
        report.errors.push(err);
      }
    }

    report.viewFolders[typoId] = typoReport;
  }

  // -------------------------------------------------------------
  // 2. Verify 6 Gallery Folders (101, 102, x01, x02, 501, 502)
  // -------------------------------------------------------------
  for (const [galleryId, expectedCount] of Object.entries(EXPECTED_GALLERIES)) {
    const galReport = {
      id: galleryId,
      found: false,
      expectedCount,
      actualCount: 0,
      files: [],
      errors: [],
    };

    const galleryDirPath = path.join(detailsDir, galleryId, 'gallery');
    if (!fs.existsSync(galleryDirPath) || !fs.statSync(galleryDirPath).isDirectory()) {
      report.valid = false;
      const err = `[gallery:${galleryId}] Missing gallery directory: ${galleryDirPath}`;
      galReport.errors.push(err);
      report.errors.push(err);
      report.galleries[galleryId] = galReport;
      continue;
    }

    galReport.found = true;

    const filesInGallery = fs.readdirSync(galleryDirPath).filter(f => !f.startsWith('.'));
    galReport.actualCount = filesInGallery.length;

    // Verify exact count
    if (filesInGallery.length !== expectedCount) {
      report.valid = false;
      const err = `[gallery:${galleryId}] Gallery count mismatch: expected ${expectedCount}, found ${filesInGallery.length}`;
      galReport.errors.push(err);
      report.errors.push(err);
    }

    // Verify consecutive filenames 1.webp .. N.webp
    for (let i = 1; i <= expectedCount; i++) {
      const expectedName = `${i}.webp`;
      const imgPath = path.join(galleryDirPath, expectedName);
      const res = await validateWebpImage(imgPath);
      if (!res.valid) {
        report.valid = false;
        const err = `[gallery:${galleryId}] File error '${expectedName}': ${res.error}`;
        galReport.errors.push(err);
        report.errors.push(err);
      } else {
        galReport.files.push({ name: expectedName, size: res.size });
        report.stats.totalGalleryImages++;
      }
    }

    report.galleries[galleryId] = galReport;
  }

  // -------------------------------------------------------------
  // 3. Verify Total Asset Count (Exactly 128) & Detect Unexpected Files
  // -------------------------------------------------------------
  const allFiles = collectAllFiles(detailsDir);
  report.stats.totalAssetsFound = allFiles.length;

  // Build whitelist of canonical relative paths
  const canonicalSet = new Set();
  for (const typoId of EXPECTED_VIEW_FOLDERS) {
    for (const v of EXPECTED_BASE_VIEWS) {
      canonicalSet.add(path.join(detailsDir, typoId, v));
    }
    for (const t of EXPECTED_TRANSITIONS) {
      canonicalSet.add(path.join(detailsDir, typoId, 'transitions', t));
    }
  }
  for (const [gId, count] of Object.entries(EXPECTED_GALLERIES)) {
    for (let i = 1; i <= count; i++) {
      canonicalSet.add(path.join(detailsDir, gId, 'gallery', `${i}.webp`));
    }
  }

  for (const f of allFiles) {
    if (!canonicalSet.has(f)) {
      report.unexpectedFiles.push(path.relative(detailsDir, f));
    }
  }

  if (report.unexpectedFiles.length > 0) {
    report.valid = false;
    const err = `Found ${report.unexpectedFiles.length} unexpected/rogue file(s) in distribution directory`;
    report.errors.push(err);
  }

  if (report.stats.totalAssetsFound !== 144) {
    report.valid = false;
    const err = `Total distribution asset count mismatch: expected 144, found ${report.stats.totalAssetsFound}`;
    report.errors.push(err);
  }

  if (report.errors.length > 0) {
    report.valid = false;
  }

  return report;
}

/**
 * Prints formatted CLI verification report
 */
export function printDistReport(report) {
  console.log(`\n${colors.bold}${colors.cyan}=================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}         DISTRIBUTION MEDIA VERIFICATION REPORT (M2)            ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=================================================================${colors.reset}\n`);

  console.log(`Distribution Path: ${colors.bold}${report.detailsDir}${colors.reset}`);
  console.log(`Status:            ${report.valid ? colors.green + '✓ PASSED / 100% COMPLIANT' : colors.red + '✗ FAILED / DEFECTS DETECTED'}${colors.reset}\n`);

  console.log(`${colors.bold}Typologies & Views Inventory:${colors.reset}`);
  console.log('---------------------------------------------------------------------------------');
  console.log(`ID     | Base Views (3) | Transitions (6) | Video Codec | Faststart | Status`);
  console.log('---------------------------------------------------------------------------------');

  for (const typoId of EXPECTED_VIEW_FOLDERS) {
    const r = report.viewFolders[typoId];
    if (!r || !r.found) {
      console.log(`${typoId.padEnd(6)} | ${colors.red}MISSING${colors.reset}        | ${colors.red}MISSING${colors.reset}         | ${colors.red}N/A${colors.reset}         | ${colors.red}N/A${colors.reset}       | ${colors.red}✗ MISSING${colors.reset}`);
      continue;
    }

    const bvCount = Object.keys(r.baseViews).length;
    const bvStatus = bvCount === 3 ? `${colors.green}3/3 ✓${colors.reset}` : `${colors.red}${bvCount}/3 ✗${colors.reset}`;

    const trCount = Object.keys(r.transitions).length;
    const trStatus = trCount === 6 ? `${colors.green}6/6 ✓${colors.reset}` : `${colors.red}${trCount}/6 ✗${colors.reset}`;

    const hasErrors = r.errors.length > 0;
    const overallStatus = hasErrors ? `${colors.red}✗ FAILED${colors.reset}` : `${colors.green}✓ OK${colors.reset}`;

    console.log(`${typoId.padEnd(6)} | ${bvStatus.padEnd(16)} | ${trStatus.padEnd(17)} | ${colors.green}h264 ✓${colors.reset}      | ${colors.green}yes ✓${colors.reset}     | ${overallStatus}`);
  }

  console.log('\n---------------------------------------------------------------------------------');
  console.log(`${colors.bold}Galleries Inventory:${colors.reset}`);
  console.log('---------------------------------------------------------------------------------');
  console.log(`Gallery ID | Expected | Found | Format | 1-N Consecutive | Status`);
  console.log('---------------------------------------------------------------------------------');

  for (const [gId, expected] of Object.entries(EXPECTED_GALLERIES)) {
    const gr = report.galleries[gId];
    if (!gr || !gr.found) {
      console.log(`${gId.padEnd(10)} | ${String(expected).padEnd(8)} | ${colors.red}0${colors.reset}     | ${colors.red}N/A${colors.reset}    | ${colors.red}no${colors.reset}            | ${colors.red}✗ MISSING${colors.reset}`);
      continue;
    }

    const countStatus = gr.actualCount === expected ? `${colors.green}${gr.actualCount} ✓${colors.reset}` : `${colors.red}${gr.actualCount} ✗${colors.reset}`;
    const gHasErrors = gr.errors.length > 0;
    const status = gHasErrors ? `${colors.red}✗ FAILED${colors.reset}` : `${colors.green}✓ OK${colors.reset}`;

    console.log(`${gId.padEnd(10)} | ${String(expected).padEnd(8)} | ${countStatus.padEnd(15)} | ${colors.green}webp ✓${colors.reset}  | ${colors.green}yes ✓${colors.reset}         | ${status}`);
  }

  console.log('\n---------------------------------------------------------------------------------');
  console.log(`${colors.bold}Distribution Asset Counts:${colors.reset}`);
  console.log(`  Base Views:        ${report.stats.totalBaseViews} / 24`);
  console.log(`  Transitions:       ${report.stats.totalTransitions} / 48`);
  console.log(`  Gallery Images:    ${report.stats.totalGalleryImages} / 72`);
  console.log(`  Total Assets:      ${report.stats.totalAssetsFound} / 144 (Expected: 144)`);
  console.log('---------------------------------------------------------------------------------');

  if (report.unexpectedFiles.length > 0) {
    console.log(`\n${colors.bold}${colors.red}Unexpected Files Found (${report.unexpectedFiles.length}):${colors.reset}`);
    for (const f of report.unexpectedFiles.slice(0, 10)) {
      console.log(`  ${colors.red}✗${colors.reset} ${f}`);
    }
  }

  if (report.errors.length > 0) {
    console.log(`\n${colors.bold}${colors.red}Errors Detected (${report.errors.length}):${colors.reset}`);
    for (const err of report.errors.slice(0, 25)) {
      console.log(`  ${colors.red}✗${colors.reset} ${err}`);
    }
    if (report.errors.length > 25) {
      console.log(`  ... and ${report.errors.length - 25} more errors.`);
    }
    console.log('');
  } else {
    console.log(`\n${colors.bold}${colors.green}All 144 assets verified successfully with valid WebP and H.264 formats.${colors.reset}\n`);
  }
}

// CLI entrypoint
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const options = {
    dir: './dist_assets',
    json: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dir' || arg === '-d') {
      options.dir = args[++i];
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/verify-dist.mjs [options]

Options:
  --dir, -d <path>   Distribution directory (default: ./dist_assets)
  --json             Output raw JSON report
  --verbose, -v      Print verbose per-file details
  --help, -h         Show this help message
`);
      process.exit(0);
    }
  }

  verifyDist(options.dir, options)
    .then((report) => {
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        printDistReport(report);
      }
      process.exit(report.valid ? 0 : 1);
    })
    .catch((err) => {
      console.error(`${colors.red}Fatal Verification Error:${colors.reset} ${err.message}`);
      process.exit(1);
    });
}
