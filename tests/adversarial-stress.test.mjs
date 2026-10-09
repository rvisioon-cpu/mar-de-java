#!/usr/bin/env node
/**
 * tests/adversarial-stress.test.mjs
 * 
 * Empirical Adversarial Test Harness & Stress Suite
 * Residencial Mar de Java Showroom
 * 
 * Adversarial Testing Scope:
 * 1. scripts/verify-staging.mjs (Missing, 0-byte, invalid transitions, gallery count defects)
 * 2. scripts/verify-dist.mjs (Missing, 0-byte, bad magic, non-H264 codec, non-faststart, rogue files, illegal duplex galleries, out-of-order galleries)
 * 3. scripts/verify-r2.mjs (404, 500, MIME mismatch, 0-byte payload, network timeout)
 * 4. scripts/sync-database.mjs / D1 units (Malformed JSON, leading slashes, missing units, type mismatch, wrong gallery indices)
 * 5. Master E2E runner (tests/e2e/run-all-tests.mjs) & Typecheck
 * 
 * Every defect scenario asserts that the tool strictly detects the defect and fails (exit code 1).
 * Genuine valid scenarios assert that the tool strictly succeeds (exit code 0).
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import assert from 'assert';
import { execFileSync, spawnSync } from 'child_process';
import sharp from 'sharp';

import { verifyStaging, EXPECTED_TYPOLOGIES, REQUIRED_TRANSITIONS } from '../scripts/verify-staging.mjs';
import {
  verifyDist,
  EXPECTED_VIEW_FOLDERS,
  EXPECTED_BASE_VIEWS,
  EXPECTED_TRANSITIONS,
  EXPECTED_GALLERIES,
  validateWebpImage,
  validateMp4Video,
  isMp4Faststart,
} from '../scripts/verify-dist.mjs';
import {
  getCanonicalVerifyList,
  verifyAssetUrl,
  verifyAllAssets,
  createMockFetch,
  DEFAULT_BASE_URL,
} from '../scripts/verify-r2.mjs';
import { verifyD1Units, resolveSqlitePath, DEFAULT_SQLITE_PATH } from '../scripts/sync-database.mjs';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
};

let totalAsserts = 0;
let passedAsserts = 0;
let failedAsserts = 0;

function logHeader(title) {
  console.log(`\n${colors.bold}${colors.cyan}=================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=================================================================${colors.reset}`);
}

function logTest(desc) {
  process.stdout.write(`  Testing: ${desc}... `);
}

function pass(detail = '') {
  totalAsserts++;
  passedAsserts++;
  console.log(`${colors.green}✓ PASS${colors.reset}${detail ? ` ${colors.dim}(${detail})${colors.reset}` : ''}`);
}

function fail(detail) {
  totalAsserts++;
  failedAsserts++;
  console.log(`${colors.red}✗ FAIL${colors.reset}: ${detail}`);
}

// ----------------------------------------------------------------------
// FIXTURE ASSET GENERATORS
// ----------------------------------------------------------------------

const tempWorkspace = path.join(os.tmpdir(), `adversarial_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
fs.mkdirSync(tempWorkspace, { recursive: true });

console.log(`${colors.dim}Temporary adversarial workspace: ${tempWorkspace}${colors.reset}`);

// 1. Valid WebP Image Buffer
const validWebpBuffer = await sharp({
  create: { width: 320, height: 240, channels: 3, background: { r: 60, g: 120, b: 200 } }
}).webp({ quality: 85 }).toBuffer();

// 2. Valid JPEG Image Buffer (for staging raw inputs)
const validJpegBuffer = await sharp({
  create: { width: 320, height: 240, channels: 3, background: { r: 200, g: 100, b: 50 } }
}).jpeg({ quality: 85 }).toBuffer();

// 3. Valid PNG Image Buffer (for staging raw inputs)
const validPngBuffer = await sharp({
  create: { width: 320, height: 240, channels: 3, background: { r: 50, g: 180, b: 50 } }
}).png().toBuffer();

// 4. Valid H.264 Faststart MP4 Video Buffer
const validVideoPath = path.join(tempWorkspace, 'valid_h264_faststart.mp4');
execFileSync('ffmpeg', [
  '-y',
  '-f', 'lavfi',
  '-i', 'color=c=navy:s=320x240:d=0.2',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  '-an',
  validVideoPath,
], { stdio: 'pipe' });
const validVideoBuffer = fs.readFileSync(validVideoPath);

// 5. Non-Faststart MP4 (moov atom placed after mdat)
const nonFaststartVideoPath = path.join(tempWorkspace, 'non_faststart.mp4');
execFileSync('ffmpeg', [
  '-y',
  '-f', 'lavfi',
  '-i', 'color=c=navy:s=320x240:d=0.2',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  // Do NOT pass -movflags +faststart
  '-an',
  nonFaststartVideoPath,
], { stdio: 'pipe' });
const nonFaststartVideoBuffer = fs.readFileSync(nonFaststartVideoPath);

// 6. Non-H264 Codec MP4 (mpeg4 video stream)
const nonH264VideoPath = path.join(tempWorkspace, 'non_h264.mp4');
execFileSync('ffmpeg', [
  '-y',
  '-f', 'lavfi',
  '-i', 'color=c=navy:s=320x240:d=0.2',
  '-c:v', 'mpeg4',
  '-movflags', '+faststart',
  '-an',
  nonH264VideoPath,
], { stdio: 'pipe' });
const nonH264VideoBuffer = fs.readFileSync(nonH264VideoPath);

/**
 * Creates a fully valid raw_assets staging fixture (128 assets)
 */
function createValidStagingFixture(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });

  const viewFolders = ['101', '102', 'x01', 'x02', '501.1', '501.2', '502.1', '502.2'];
  for (const typo of viewFolders) {
    const typoDir = path.join(dirPath, typo);
    fs.mkdirSync(typoDir, { recursive: true });

    // 3 Base views with realistic names
    fs.writeFileSync(path.join(typoDir, 'Amoblado.jpg'), validJpegBuffer);
    fs.writeFileSync(path.join(typoDir, 'Entregable sin amoblar.png'), validPngBuffer);
    fs.writeFileSync(path.join(typoDir, 'CAD.jpg'), validJpegBuffer);

    // 6 Canonical transitions under transiciones/
    const transDir = path.join(typoDir, 'transiciones');
    fs.mkdirSync(transDir, { recursive: true });
    fs.writeFileSync(path.join(transDir, 'A_a_E.mp4'), validVideoBuffer);
    fs.writeFileSync(path.join(transDir, 'E_a_A.mp4'), validVideoBuffer);
    fs.writeFileSync(path.join(transDir, 'A_a_CAD.mp4'), validVideoBuffer);
    fs.writeFileSync(path.join(transDir, 'CAD_a_A.mp4'), validVideoBuffer);
    fs.writeFileSync(path.join(transDir, 'E_a_CAD.mp4'), validVideoBuffer);
    fs.writeFileSync(path.join(transDir, 'CAD_a_E.mp4'), validVideoBuffer);
  }

  // Galleries: 101: 11, 102: 12, x01: 9, x02: 10, 501: 15, 502: 15
  const galConfigs = [
    { folder: '101/Galeria', count: 11 },
    { folder: '102/Galeria', count: 12 },
    { folder: 'x01/Galeria', count: 9 },
    { folder: 'x02/Galeria', count: 10 },
    { folder: '501.1/Galeria', count: 15 },
    { folder: '502.1/Galeria', count: 15 },
  ];

  for (const gc of galConfigs) {
    const galDir = path.join(dirPath, gc.folder);
    fs.mkdirSync(galDir, { recursive: true });
    for (let i = 1; i <= gc.count; i++) {
      fs.writeFileSync(path.join(galDir, `${i}.jpg`), validJpegBuffer);
    }
  }
}

/**
 * Creates a fully valid dist_assets distribution fixture (144 assets)
 */
function createValidDistFixture(dirPath) {
  const detailsDir = path.join(dirPath, 'plants', 'details');
  fs.mkdirSync(detailsDir, { recursive: true });

  const viewFolders = ['101', '102', 'x01', 'x02', '501.1', '501.2', '502.1', '502.2'];
  for (const typo of viewFolders) {
    const typoDir = path.join(detailsDir, typo);
    fs.mkdirSync(typoDir, { recursive: true });

    // 3 Base views
    fs.writeFileSync(path.join(typoDir, 'furnished.webp'), validWebpBuffer);
    fs.writeFileSync(path.join(typoDir, 'unfurnished.webp'), validWebpBuffer);
    fs.writeFileSync(path.join(typoDir, 'plans.webp'), validWebpBuffer);

    // 6 Transitions
    const transDir = path.join(typoDir, 'transitions');
    fs.mkdirSync(transDir, { recursive: true });
    for (const t of EXPECTED_TRANSITIONS) {
      fs.writeFileSync(path.join(transDir, t), validVideoBuffer);
    }
  }

  // 6 Galleries: 101 (11), 102 (12), x01 (9), x02 (10), 501 (15), 502 (15)
  for (const [gId, count] of Object.entries(EXPECTED_GALLERIES)) {
    const galDir = path.join(detailsDir, gId, 'gallery');
    fs.mkdirSync(galDir, { recursive: true });
    for (let i = 1; i <= count; i++) {
      fs.writeFileSync(path.join(galDir, `${i}.webp`), validWebpBuffer);
    }
  }
}

// ======================================================================
// SECTION 1: ADVERSARIAL STRESS-TESTING OF verify-staging.mjs
// ======================================================================
logHeader('SECTION 1: ADVERSARIAL STRESS-TESTING OF scripts/verify-staging.mjs');

// 1.1 Genuine valid staging fixture
{
  logTest('1.1 Genuine valid staging fixture passes with valid: true');
  const validStagingDir = path.join(tempWorkspace, 'staging_valid');
  createValidStagingFixture(validStagingDir);
  const rep = verifyStaging(validStagingDir);
  assert.strictEqual(rep.valid, true);
  assert.strictEqual(rep.errors.length, 0);
  assert.strictEqual(rep.stats.totalAssetsFound, 144);
  pass('144/144 staged assets recognized');

  logTest('1.1 CLI execution on valid staging exits with code 0');
  const cliRes = spawnSync('node', ['scripts/verify-staging.mjs', '--dir', validStagingDir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 0);
  pass('Exited with status 0');
}

// 1.2 Missing typology folder
{
  logTest('1.2 Defect: Missing typology folder (delete x02/)');
  const dir = path.join(tempWorkspace, 'staging_missing_folder');
  createValidStagingFixture(dir);
  fs.rmSync(path.join(dir, 'x02'), { recursive: true, force: true });
  const rep = verifyStaging(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('x02')));
  const cliRes = spawnSync('node', ['scripts/verify-staging.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught missing typology and exited 1');
}

// 1.3 Missing base view
{
  logTest('1.3 Defect: Missing base view (delete 101/Amoblado.jpg)');
  const dir = path.join(tempWorkspace, 'staging_missing_base_view');
  createValidStagingFixture(dir);
  fs.unlinkSync(path.join(dir, '101', 'Amoblado.jpg'));
  const rep = verifyStaging(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('Missing base view')));
  const cliRes = spawnSync('node', ['scripts/verify-staging.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught missing base view and exited 1');
}

// 1.4 0-byte base view
{
  logTest('1.4 Defect: 0-byte corrupt base view (101/Amoblado.jpg truncated to 0B)');
  const dir = path.join(tempWorkspace, 'staging_zero_byte_base_view');
  createValidStagingFixture(dir);
  fs.writeFileSync(path.join(dir, '101', 'Amoblado.jpg'), Buffer.alloc(0));
  const rep = verifyStaging(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('0-byte') || e.includes('0 bytes')));
  const cliRes = spawnSync('node', ['scripts/verify-staging.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught 0-byte base view defect and exited 1');
}

// 1.5 Missing transitions folder
{
  logTest('1.5 Defect: Missing transiciones/ directory in 501.1');
  const dir = path.join(tempWorkspace, 'staging_missing_trans_dir');
  createValidStagingFixture(dir);
  fs.rmSync(path.join(dir, '501.1', 'transiciones'), { recursive: true, force: true });
  const rep = verifyStaging(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('transiciones')));
  const cliRes = spawnSync('node', ['scripts/verify-staging.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught missing transiciones/ dir and exited 1');
}

// 1.6 Missing required transition video
{
  logTest('1.6 Defect: Missing transition video (delete 102/transiciones/CAD_a_E.mp4)');
  const dir = path.join(tempWorkspace, 'staging_missing_trans_file');
  createValidStagingFixture(dir);
  fs.unlinkSync(path.join(dir, '102', 'transiciones', 'CAD_a_E.mp4'));
  const rep = verifyStaging(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('CAD_a_E')));
  const cliRes = spawnSync('node', ['scripts/verify-staging.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught missing transition and exited 1');
}

// 1.7 0-byte transition video
{
  logTest('1.7 Defect: 0-byte corrupt transition video');
  const dir = path.join(tempWorkspace, 'staging_zero_byte_trans');
  createValidStagingFixture(dir);
  fs.writeFileSync(path.join(dir, 'x01', 'transiciones', 'A_a_CAD.mp4'), Buffer.alloc(0));
  const rep = verifyStaging(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('0-byte transition') || e.includes('0 bytes')));
  const cliRes = spawnSync('node', ['scripts/verify-staging.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught 0-byte transition video and exited 1');
}

// 1.8 Invalid transition name
{
  logTest('1.8 Defect: Invalid transition name (renamed A_a_E.mp4 to A_a_BALCON.mp4)');
  const dir = path.join(tempWorkspace, 'staging_invalid_trans_name');
  createValidStagingFixture(dir);
  fs.renameSync(
    path.join(dir, '101', 'transiciones', 'A_a_E.mp4'),
    path.join(dir, '101', 'transiciones', 'A_a_BALCON.mp4')
  );
  const rep = verifyStaging(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('Missing transition: A_a_E')));
  const cliRes = spawnSync('node', ['scripts/verify-staging.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Rejected unmapped transition name and exited 1');
}

// 1.9 0-byte gallery image
{
  logTest('1.9 Defect: 0-byte corrupt gallery image in 101/Galeria/3.jpg');
  const dir = path.join(tempWorkspace, 'staging_zero_byte_gal');
  createValidStagingFixture(dir);
  fs.writeFileSync(path.join(dir, '101', 'Galeria', '3.jpg'), Buffer.alloc(0));
  const rep = verifyStaging(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('0-byte gallery image') || e.includes('0 bytes')));
  const cliRes = spawnSync('node', ['scripts/verify-staging.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught 0-byte gallery defect and exited 1');
}

// 1.10 Gallery count mismatch (underflow)
{
  logTest('1.10 Defect: Gallery count underflow (101 has 10 images instead of 11)');
  const dir = path.join(tempWorkspace, 'staging_gal_underflow');
  createValidStagingFixture(dir);
  fs.unlinkSync(path.join(dir, '101', 'Galeria', '11.jpg'));
  const rep = verifyStaging(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('Gallery count mismatch')));
  const cliRes = spawnSync('node', ['scripts/verify-staging.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught gallery underflow and exited 1');
}

// 1.11 Gallery count mismatch (overflow)
{
  logTest('1.11 Defect: Gallery count overflow (101 has 12 images instead of 11)');
  const dir = path.join(tempWorkspace, 'staging_gal_overflow');
  createValidStagingFixture(dir);
  fs.writeFileSync(path.join(dir, '101', 'Galeria', '12.jpg'), validJpegBuffer);
  const rep = verifyStaging(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('Gallery count mismatch')));
  const cliRes = spawnSync('node', ['scripts/verify-staging.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught gallery overflow and exited 1');
}


// ======================================================================
// SECTION 2: ADVERSARIAL STRESS-TESTING OF verify-dist.mjs
// ======================================================================
logHeader('SECTION 2: ADVERSARIAL STRESS-TESTING OF scripts/verify-dist.mjs');

// 2.1 Genuine valid distribution fixture
{
  logTest('2.1 Genuine valid distribution fixture passes with valid: true');
  const validDistDir = path.join(tempWorkspace, 'dist_valid');
  createValidDistFixture(validDistDir);
  const rep = await verifyDist(validDistDir);
  assert.strictEqual(rep.valid, true);
  assert.strictEqual(rep.errors.length, 0);
  assert.strictEqual(rep.unexpectedFiles.length, 0);
  assert.strictEqual(rep.stats.totalAssetsFound, 144);
  pass('144/144 distribution assets verified');

  logTest('2.1 CLI execution on valid distribution exits with code 0');
  const cliRes = spawnSync('node', ['scripts/verify-dist.mjs', '--dir', validDistDir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 0);
  pass('Exited with status 0');
}

// 2.2 Missing view folder
{
  logTest('2.2 Defect: Missing typology view folder (delete 502.2)');
  const dir = path.join(tempWorkspace, 'dist_missing_folder');
  createValidDistFixture(dir);
  fs.rmSync(path.join(dir, 'plants', 'details', '502.2'), { recursive: true, force: true });
  const rep = await verifyDist(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('502.2')));
  const cliRes = spawnSync('node', ['scripts/verify-dist.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught missing view folder and exited 1');
}

// 2.3 0-byte base view
{
  logTest('2.3 Defect: 0-byte base view (plants/details/101/furnished.webp)');
  const dir = path.join(tempWorkspace, 'dist_zero_byte_base');
  createValidDistFixture(dir);
  fs.writeFileSync(path.join(dir, 'plants', 'details', '101', 'furnished.webp'), Buffer.alloc(0));
  const rep = await verifyDist(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('0 bytes')));
  const cliRes = spawnSync('node', ['scripts/verify-dist.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught 0-byte base view and exited 1');
}

// 2.4 Corrupted WebP magic bytes
{
  logTest('2.4 Defect: Corrupted WebP header (not RIFF/WEBP signature)');
  const dir = path.join(tempWorkspace, 'dist_bad_webp_magic');
  createValidDistFixture(dir);
  fs.writeFileSync(path.join(dir, 'plants', 'details', 'x01', 'plans.webp'), Buffer.from('FAKE_WEBP_HEADER_CORRUPTED'));
  const rep = await verifyDist(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('magic header') || e.includes('Sharp decode failed')));
  const cliRes = spawnSync('node', ['scripts/verify-dist.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught invalid WebP magic header and exited 1');
}

// 2.5 Fake WebP (valid PNG renamed to .webp)
{
  logTest('2.5 Defect: Fake WebP (valid PNG image renamed to .webp)');
  const dir = path.join(tempWorkspace, 'dist_fake_webp');
  createValidDistFixture(dir);
  fs.writeFileSync(path.join(dir, 'plants', 'details', '102', 'unfurnished.webp'), validPngBuffer);
  const rep = await verifyDist(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('magic header') || e.includes('expected webp')));
  const cliRes = spawnSync('node', ['scripts/verify-dist.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught disguised PNG file and exited 1');
}

// 2.6 Corrupted MP4 container header
{
  logTest('2.6 Defect: Corrupted MP4 container (no ftyp box)');
  const dir = path.join(tempWorkspace, 'dist_bad_mp4_box');
  createValidDistFixture(dir);
  fs.writeFileSync(
    path.join(dir, 'plants', 'details', '101', 'transitions', 'furnished_to_unfurnished.mp4'),
    Buffer.from('CORRUPT_NOT_AN_MP4_HEADER')
  );
  const rep = await verifyDist(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('ftyp container header')));
  const cliRes = spawnSync('node', ['scripts/verify-dist.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught corrupted MP4 header and exited 1');
}

// 2.7 Non-faststart MP4 (moov atom placed after mdat atom)
{
  logTest('2.7 Defect: MP4 without faststart optimization (moov after mdat)');
  const dir = path.join(tempWorkspace, 'dist_non_faststart');
  createValidDistFixture(dir);
  fs.writeFileSync(
    path.join(dir, 'plants', 'details', '101', 'transitions', 'furnished_to_plans.mp4'),
    nonFaststartVideoBuffer
  );
  const rep = await verifyDist(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('faststart moov atom')));
  const cliRes = spawnSync('node', ['scripts/verify-dist.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught non-faststart atom ordering defect and exited 1');
}

// 2.8 Non-H.264 video codec (mpeg4 video)
{
  logTest('2.8 Defect: Video encoded with non-H.264 codec (mpeg4)');
  const dir = path.join(tempWorkspace, 'dist_non_h264');
  createValidDistFixture(dir);
  fs.writeFileSync(
    path.join(dir, 'plants', 'details', 'x02', 'transitions', 'plans_to_furnished.mp4'),
    nonH264VideoBuffer
  );
  const rep = await verifyDist(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes("codec is 'mpeg4'")));
  const cliRes = spawnSync('node', ['scripts/verify-dist.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught non-H.264 video codec and exited 1');
}

// 2.9 Rogue extra file in root distribution
{
  logTest('2.9 Defect: Rogue extra file in plants/details/unauthorized.txt');
  const dir = path.join(tempWorkspace, 'dist_rogue_root');
  createValidDistFixture(dir);
  fs.writeFileSync(path.join(dir, 'plants', 'details', 'unauthorized.txt'), 'rogue content');
  const rep = await verifyDist(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.unexpectedFiles.includes('unauthorized.txt'));
  assert.ok(rep.errors.some(e => e.includes('unexpected/rogue')));
  const cliRes = spawnSync('node', ['scripts/verify-dist.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Detected rogue extra file and exited 1');
}

// 2.10 Rogue extra video in transitions directory
{
  logTest('2.10 Defect: Rogue extra transition video (transitions/extra_360.mp4)');
  const dir = path.join(tempWorkspace, 'dist_rogue_trans');
  createValidDistFixture(dir);
  fs.writeFileSync(
    path.join(dir, 'plants', 'details', '101', 'transitions', 'extra_360.mp4'),
    validVideoBuffer
  );
  const rep = await verifyDist(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.unexpectedFiles.some(f => f.includes('extra_360.mp4')));
  assert.ok(rep.errors.some(e => e.includes('Total distribution asset count mismatch')));
  const cliRes = spawnSync('node', ['scripts/verify-dist.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught rogue transition and total count mismatch');
}

// 2.11 Illegal duplex sub-gallery under 501.1/gallery/
{
  logTest('2.11 Defect: Illegal duplex sub-gallery under 501.1/gallery/');
  const dir = path.join(tempWorkspace, 'dist_illegal_sub_gallery');
  createValidDistFixture(dir);
  const illegalDir = path.join(dir, 'plants', 'details', '501.1', 'gallery');
  fs.mkdirSync(illegalDir, { recursive: true });
  fs.writeFileSync(path.join(illegalDir, '1.webp'), validWebpBuffer);
  const rep = await verifyDist(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('Illegal gallery directory found')));
  const cliRes = spawnSync('node', ['scripts/verify-dist.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Strictly prohibited duplex sub-gallery and exited 1');
}

// 2.12 Out-of-order and gapped gallery files
{
  logTest('2.12 Defect: Gapped gallery files (101/gallery has 1.webp, 2.webp, 4.webp, missing 3.webp, plus 12.webp)');
  const dir = path.join(tempWorkspace, 'dist_gapped_gallery');
  createValidDistFixture(dir);
  const galDir = path.join(dir, 'plants', 'details', '101', 'gallery');
  fs.unlinkSync(path.join(galDir, '3.webp')); // Delete 3.webp
  fs.writeFileSync(path.join(galDir, '12.webp'), validWebpBuffer); // Add rogue 12.webp
  const rep = await verifyDist(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes("File error '3.webp': File does not exist")));
  assert.ok(rep.unexpectedFiles.some(f => f.includes('12.webp')));
  const cliRes = spawnSync('node', ['scripts/verify-dist.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Caught gapped 3.webp and rogue 12.webp');
}

// 2.13 Non-consecutive gallery index (e.g. 0.webp)
{
  logTest('2.13 Defect: Non-consecutive 0-index gallery file (101/gallery/0.webp)');
  const dir = path.join(tempWorkspace, 'dist_zero_index_gallery');
  createValidDistFixture(dir);
  fs.writeFileSync(path.join(dir, 'plants', 'details', '101', 'gallery', '0.webp'), validWebpBuffer);
  const rep = await verifyDist(dir);
  assert.strictEqual(rep.valid, false);
  assert.ok(rep.errors.some(e => e.includes('Gallery count mismatch')));
  assert.ok(rep.unexpectedFiles.some(f => f.includes('0.webp')));
  const cliRes = spawnSync('node', ['scripts/verify-dist.mjs', '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 1);
  pass('Rejected 0-index gallery item and exited 1');
}


// ======================================================================
// SECTION 3: ADVERSARIAL STRESS-TESTING OF verify-r2.mjs
// ======================================================================
logHeader('SECTION 3: ADVERSARIAL STRESS-TESTING OF scripts/verify-r2.mjs');

// 3.1 Genuine valid mock CDN pass
{
  logTest('3.1 Genuine valid mock CDN pass for all 144 canonical URLs');
  const mockFetch = createMockFetch(DEFAULT_BASE_URL);
  const rep = await verifyAllAssets({ fetchFn: mockFetch, baseUrl: DEFAULT_BASE_URL, concurrency: 8 });
  assert.strictEqual(rep.success, true);
  assert.strictEqual(rep.total, 144);
  assert.strictEqual(rep.passed, 144);
  assert.strictEqual(rep.failed, 0);
  pass('144/144 URLs passed with 0 defects');

  logTest('3.1 CLI invocation with --mock exits code 0');
  const cliRes = spawnSync('node', ['scripts/verify-r2.mjs', '--mock'], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 0);
  pass('Exited with status 0');
}

// 3.2 HTTP 404 Defect
{
  logTest('3.2 Defect: CDN returns HTTP 404 Not Found on base view');
  const targetKey = 'plants/details/101/furnished.webp';
  const customFetch = async (url) => {
    if (url.includes(targetKey)) {
      return new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain', 'content-length': '9' } });
    }
    return new Response(new Uint8Array(32), {
      status: 200,
      headers: { 'content-type': url.endsWith('.mp4') ? 'video/mp4' : 'image/webp', 'content-length': '5000' }
    });
  };
  const rep = await verifyAllAssets({ fetchFn: customFetch, baseUrl: DEFAULT_BASE_URL });
  assert.strictEqual(rep.success, false);
  assert.strictEqual(rep.failed, 1);
  const failedItem = rep.results.find(r => !r.pass);
  assert.strictEqual(failedItem.key, targetKey);
  assert.ok(failedItem.error.includes('Status HTTP 404'));
  pass('Caught HTTP 404 defect and reported exact key');
}

// 3.3 HTTP 500 Defect
{
  logTest('3.3 Defect: CDN returns HTTP 500 Internal Server Error on transition');
  const targetKey = 'plants/details/501.1/transitions/furnished_to_unfurnished.mp4';
  const customFetch = async (url) => {
    if (url.includes(targetKey)) {
      return new Response('Internal Server Error', { status: 500, headers: { 'content-type': 'text/plain', 'content-length': '21' } });
    }
    return new Response(new Uint8Array(32), {
      status: 200,
      headers: { 'content-type': url.endsWith('.mp4') ? 'video/mp4' : 'image/webp', 'content-length': '5000' }
    });
  };
  const rep = await verifyAllAssets({ fetchFn: customFetch, baseUrl: DEFAULT_BASE_URL, retries: 0 });
  assert.strictEqual(rep.success, false);
  assert.strictEqual(rep.failed, 1);
  const failedItem = rep.results.find(r => !r.pass);
  assert.strictEqual(failedItem.key, targetKey);
  assert.ok(failedItem.error.includes('Status HTTP 500'));
  pass('Caught HTTP 500 defect and reported exact key');
}

// 3.4 MIME type mismatch on WebP image (e.g. image/jpeg)
{
  logTest('3.4 Defect: MIME mismatch on WebP image (returns image/jpeg instead of image/webp)');
  const targetKey = 'plants/details/102/plans.webp';
  const customFetch = async (url) => {
    if (url.includes(targetKey)) {
      return new Response(new Uint8Array(32), {
        status: 200,
        headers: { 'content-type': 'image/jpeg', 'content-length': '5000' }
      });
    }
    return new Response(new Uint8Array(32), {
      status: 200,
      headers: { 'content-type': url.endsWith('.mp4') ? 'video/mp4' : 'image/webp', 'content-length': '5000' }
    });
  };
  const rep = await verifyAllAssets({ fetchFn: customFetch, baseUrl: DEFAULT_BASE_URL, retries: 0 });
  assert.strictEqual(rep.success, false);
  assert.strictEqual(rep.failed, 1);
  const failedItem = rep.results.find(r => !r.pass);
  assert.ok(failedItem.error.includes("MIME mismatch: expected 'image/webp', got 'image/jpeg'"));
  pass('Caught MIME mismatch on image');
}

// 3.5 MIME type mismatch on MP4 video (e.g. video/quicktime)
{
  logTest('3.5 Defect: MIME mismatch on transition MP4 (returns video/quicktime instead of video/mp4)');
  const targetKey = 'plants/details/x01/transitions/plans_to_unfurnished.mp4';
  const customFetch = async (url) => {
    if (url.includes(targetKey)) {
      return new Response(new Uint8Array(32), {
        status: 200,
        headers: { 'content-type': 'video/quicktime', 'content-length': '5000' }
      });
    }
    return new Response(new Uint8Array(32), {
      status: 200,
      headers: { 'content-type': url.endsWith('.mp4') ? 'video/mp4' : 'image/webp', 'content-length': '5000' }
    });
  };
  const rep = await verifyAllAssets({ fetchFn: customFetch, baseUrl: DEFAULT_BASE_URL, retries: 0 });
  assert.strictEqual(rep.success, false);
  assert.strictEqual(rep.failed, 1);
  const failedItem = rep.results.find(r => !r.pass);
  assert.ok(failedItem.error.includes("MIME mismatch: expected 'video/mp4', got 'video/quicktime'"));
  pass('Caught MIME mismatch on video');
}

// 3.6 0-byte Content-Length
{
  logTest('3.6 Defect: HTTP 200 with 0-byte Content-Length');
  const targetKey = 'plants/details/501/gallery/1.webp';
  const customFetch = async (url) => {
    if (url.includes(targetKey)) {
      return new Response('', {
        status: 200,
        headers: { 'content-type': 'image/webp', 'content-length': '0' }
      });
    }
    return new Response(new Uint8Array(32), {
      status: 200,
      headers: { 'content-type': url.endsWith('.mp4') ? 'video/mp4' : 'image/webp', 'content-length': '5000' }
    });
  };
  const rep = await verifyAllAssets({ fetchFn: customFetch, baseUrl: DEFAULT_BASE_URL, retries: 0 });
  assert.strictEqual(rep.success, false);
  assert.strictEqual(rep.failed, 1);
  const failedItem = rep.results.find(r => !r.pass);
  assert.ok(failedItem.error.includes('Content-Length is 0 (must be > 0)'));
  pass('Caught 0-byte Content-Length defect');
}

// 3.7 Timeout simulation
{
  logTest('3.7 Defect: Network timeout / aborted request');
  const targetKey = 'plants/details/502/gallery/15.webp';
  const customFetch = async (url, init) => {
    if (url.includes(targetKey)) {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    }
    return new Response(new Uint8Array(32), {
      status: 200,
      headers: { 'content-type': url.endsWith('.mp4') ? 'video/mp4' : 'image/webp', 'content-length': '5000' }
    });
  };
  const rep = await verifyAllAssets({ fetchFn: customFetch, baseUrl: DEFAULT_BASE_URL, retries: 0 });
  assert.strictEqual(rep.success, false);
  assert.strictEqual(rep.failed, 1);
  const failedItem = rep.results.find(r => !r.pass);
  assert.ok(failedItem.error.includes('Timeout after'));
  pass('Caught timeout failure');
}


// ======================================================================
// SECTION 4: ADVERSARIAL STRESS-TESTING OF D1 DATABASE INTEGRITY
// ======================================================================
logHeader('SECTION 4: ADVERSARIAL STRESS-TESTING OF D1 DATABASE & sync-database.mjs');

const sqliteDbPath = resolveSqlitePath();

// 4.1 Genuine valid D1 SQLite database verification
{
  logTest('4.1 Genuine valid D1 SQLite database passes verification (12 rows, 144 assets)');
  const res = verifyD1Units(sqliteDbPath);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.errors.length, 0);
  assert.strictEqual(res.unitCount, 12);
  assert.strictEqual(res.baseViewsCount, 24);
  assert.strictEqual(res.galleryImagesCount, 72);
  assert.strictEqual(res.viewFoldersCount, 8);
  assert.strictEqual(res.transitionsCount, 48);
  assert.strictEqual(res.totalAssets, 144);
  pass('12 units and 144 assets verified in SQLite');

  logTest('4.1 CLI verify-only mode exits with code 0');
  const cliRes = spawnSync('node', ['scripts/sync-database.mjs', '--verify-only'], { encoding: 'utf8' });
  assert.strictEqual(cliRes.status, 0);
  pass('Exited with status 0');
}

// 4.2 Malformed JSON in photos_furnished
{
  logTest('4.2 Defect: Malformed JSON array in D1 units photos_furnished');
  const tempDb = path.join(tempWorkspace, 'd1_malformed_json.sqlite');
  fs.copyFileSync(sqliteDbPath, tempDb);

  // Corrupt unit_1_101 photos_furnished
  execFileSync('sqlite3', [tempDb, `UPDATE units SET photos_furnished = '{"invalid_json' WHERE id = 'unit_1_101';`]);

  const res = verifyD1Units(tempDb);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('photos_furnished is not valid JSON')));
  pass('Caught malformed JSON array in D1');
}

// 4.3 Forbidden leading slash in asset path
{
  logTest('4.3 Defect: Forbidden leading slash in unit path (/plants/details/...)');
  const tempDb = path.join(tempWorkspace, 'd1_leading_slash.sqlite');
  fs.copyFileSync(sqliteDbPath, tempDb);

  // Inject leading slash
  execFileSync('sqlite3', [tempDb, `UPDATE units SET photos_furnished = '["/plants/details/101/furnished.webp"]' WHERE id = 'unit_1_101';`]);

  const res = verifyD1Units(tempDb);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('forbidden leading slash') || e.includes('expected')));
  pass('Caught forbidden leading slash in D1 unit path');
}

// 4.4 Missing unit row (11 rows instead of 12)
{
  logTest('4.4 Defect: Missing unit row in D1 units table');
  const tempDb = path.join(tempWorkspace, 'd1_missing_unit.sqlite');
  fs.copyFileSync(sqliteDbPath, tempDb);

  execFileSync('sqlite3', [tempDb, `DELETE FROM units WHERE id = 'unit_1_102';`]);

  const res = verifyD1Units(tempDb);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('Expected 12 unit rows') || e.includes('Missing unit row')));
  pass('Caught missing unit row in D1');
}

// 4.5 Non-duplex type on duplex unit (501 has type = 'APARTMENT')
{
  logTest('4.5 Defect: Duplex unit 501 wrongly typed as APARTMENT');
  const tempDb = path.join(tempWorkspace, 'd1_wrong_duplex_type.sqlite');
  fs.copyFileSync(sqliteDbPath, tempDb);

  execFileSync('sqlite3', [tempDb, `UPDATE units SET type = 'APARTMENT' WHERE id = 'unit_5_501';`]);

  const res = verifyD1Units(tempDb);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('expected type "DUPLEX", got "APARTMENT"')));
  pass('Enforced DUPLEX type requirement on duplex units');
}

// 4.6 Out-of-order / wrong gallery index in JSON
{
  logTest('4.6 Defect: Out-of-order gallery index in D1 gallery JSON array');
  const tempDb = path.join(tempWorkspace, 'd1_wrong_gal_index.sqlite');
  fs.copyFileSync(sqliteDbPath, tempDb);

  // Modify unit_1_101 gallery item 2 to point to 5.webp
  const badGal = [
    'plants/details/101/gallery/1.webp',
    'plants/details/101/gallery/5.webp', // Wrong! Should be 2.webp
    'plants/details/101/gallery/3.webp',
    'plants/details/101/gallery/4.webp',
    'plants/details/101/gallery/5.webp',
    'plants/details/101/gallery/6.webp',
    'plants/details/101/gallery/7.webp',
    'plants/details/101/gallery/8.webp',
    'plants/details/101/gallery/9.webp',
    'plants/details/101/gallery/10.webp',
    'plants/details/101/gallery/11.webp',
  ];
  execFileSync('sqlite3', [tempDb, `UPDATE units SET gallery = '${JSON.stringify(badGal)}' WHERE id = 'unit_1_101';`]);

  const res = verifyD1Units(tempDb);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('gallery item 2 expected "plants/details/101/gallery/2.webp"')));
  pass('Caught out-of-order gallery array entry in D1');
}

// 4.7 Gallery count mismatch in D1 JSON array
{
  logTest('4.7 Defect: Gallery count mismatch in D1 (101 has 10 items instead of 11)');
  const tempDb = path.join(tempWorkspace, 'd1_gal_count_mismatch.sqlite');
  fs.copyFileSync(sqliteDbPath, tempDb);

  const truncatedGal = [
    'plants/details/101/gallery/1.webp',
    'plants/details/101/gallery/2.webp',
    'plants/details/101/gallery/3.webp',
    'plants/details/101/gallery/4.webp',
    'plants/details/101/gallery/5.webp',
    'plants/details/101/gallery/6.webp',
    'plants/details/101/gallery/7.webp',
    'plants/details/101/gallery/8.webp',
    'plants/details/101/gallery/9.webp',
    'plants/details/101/gallery/10.webp',
  ];
  execFileSync('sqlite3', [tempDb, `UPDATE units SET gallery = '${JSON.stringify(truncatedGal)}' WHERE id = 'unit_1_101';`]);

  const res = verifyD1Units(tempDb);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('gallery expected 11 images, got 10')));
  pass('Caught gallery item count mismatch in D1');
}


// ======================================================================
// SECTION 5: MASTER E2E RUNNER & REGRESSION VERIFICATION
// ======================================================================
logHeader('SECTION 5: MASTER E2E RUNNER & REGRESSION VERIFICATION');

// 5.1 Run Master E2E runner (tests/e2e/run-all-tests.mjs)
{
  logTest('5.1 Master E2E test suite (run-all-tests.mjs) execution');
  const e2eRes = spawnSync('node', ['tests/e2e/run-all-tests.mjs'], { encoding: 'utf8' });
  assert.strictEqual(e2eRes.status, 0, `Master E2E suite failed with status ${e2eRes.status}:\n${e2eRes.stderr || e2eRes.stdout}`);
  assert.ok(e2eRes.stdout.includes('SUCCESS: All 93 tests passed successfully!'));
  pass('All 4 tiers (93/93 tests) passed successfully');
}

// 5.2 TypeScript strict compilation check
{
  logTest('5.2 TypeScript strict check (npx tsc --noEmit)');
  const tscRes = spawnSync('npx', ['tsc', '--noEmit'], { encoding: 'utf8' });
  assert.strictEqual(tscRes.status, 0, `tsc failed with status ${tscRes.status}:\n${tscRes.stderr || tscRes.stdout}`);
  pass('0 TypeScript diagnostic errors');
}

// 5.3 Cleanup temporary test fixtures
try {
  fs.rmSync(tempWorkspace, { recursive: true, force: true });
} catch (_) {}

// ======================================================================
// FINAL SUMMARY
// ======================================================================
console.log(`\n${colors.bold}${colors.cyan}=================================================================${colors.reset}`);
console.log(`${colors.bold}ADVERSARIAL STRESS SUITE SUMMARY:${colors.reset}`);
console.log(`  Total Checks Executed : ${colors.bold}${totalAsserts}${colors.reset}`);
console.log(`  Passed Checks         : ${colors.green}${colors.bold}${passedAsserts}${colors.reset}`);
console.log(`  Failed Checks         : ${failedAsserts > 0 ? `${colors.red}${colors.bold}${failedAsserts}${colors.reset}` : '0'}`);
console.log(`${colors.bold}${colors.cyan}=================================================================${colors.reset}\n`);

if (failedAsserts > 0) {
  console.error(`${colors.red}${colors.bold}ADVERSARIAL SUITE FAILED WITH ${failedAsserts} DEFECT(S)!${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`${colors.green}${colors.bold}ALL ADVERSARIAL STRESS TESTS PASSED WITH 100% PRECISION!${colors.reset}\n`);
  process.exit(0);
}
