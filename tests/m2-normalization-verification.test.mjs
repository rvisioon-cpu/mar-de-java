#!/usr/bin/env node
/**
 * tests/m2-normalization-verification.test.mjs
 * 
 * Comprehensive test harness for Milestone 2:
 * 1. Unit tests for matcher, classifier, and natural sorting
 * 2. End-to-end synthetic pipeline execution (processTypologies -> verifyDist)
 * 3. Media format validation (WebP dimensions, H.264 codec, faststart atom)
 * 4. Duplex gallery consolidation (501.1 + 501.2 -> 501, 502.1 + 502.2 -> 502)
 * 5. Negative adversarial defect detection (0-byte, wrong codec, wrong count, rogue files)
 * 6. CLI invocation exit code verification
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import assert from 'assert';
import sharp from 'sharp';

import {
  processTypologies,
  classifyBaseView,
  classifyTransition,
  naturalSort,
  VIEW_TYPOLOGIES,
  GALLERY_CONFIG,
  CANONICAL_TRANSITIONS,
} from '../scripts/process-typologies.mjs';

import {
  verifyDist,
  isWebpBuffer,
  isMp4Buffer,
  isMp4Faststart,
  validateWebpImage,
  validateMp4Video,
} from '../scripts/verify-dist.mjs';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

function logSection(title) {
  console.log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}`);
}

function logPass(msg) {
  console.log(`  ${colors.green}✓ PASS:${colors.reset} ${msg}`);
}

// ----------------------------------------------------------------------
// 1. UNIT TESTS: Classification & Sorting
// ----------------------------------------------------------------------
logSection('1. Unit Tests: Classification & Natural Sorting');

// Base view classification
const baseViewCases = [
  { input: 'Entregable sin amoblar.jpg', expected: 'unfurnished' },
  { input: 'Entregable.png', expected: 'unfurnished' },
  { input: 'Sin amoblar.jpeg', expected: 'unfurnished' },
  { input: 'Desamoblado.jpg', expected: 'unfurnished' },
  { input: 'Vacio.jpg', expected: 'unfurnished' },
  { input: 'Vacío.png', expected: 'unfurnished' },
  { input: 'unfurnished.webp', expected: 'unfurnished' },
  { input: 'Amoblado.jpg', expected: 'furnished' },
  { input: 'Amoblada.png', expected: 'furnished' },
  { input: 'Decorado.jpg', expected: 'furnished' },
  { input: 'Piloto.jpg', expected: 'furnished' },
  { input: 'furnished.webp', expected: 'furnished' },
  { input: 'CAD.jpg', expected: 'plans' },
  { input: 'Medidas.png', expected: 'plans' },
  { input: 'Plano CAD.jpg', expected: 'plans' },
  { input: 'Plantas.png', expected: 'plans' },
  { input: 'plans.webp', expected: 'plans' },
  { input: 'A_a_E.mp4', expected: null },
  { input: 'Amoblado a Entregable.mp4', expected: null },
  { input: 'random_document.pdf', expected: null },
];

for (const tc of baseViewCases) {
  const result = classifyBaseView(tc.input);
  assert.strictEqual(result, tc.expected, `classifyBaseView("${tc.input}") failed: expected ${tc.expected}, got ${result}`);
}
logPass('Base view classifier correctly matches 20 test patterns');

// Transition classification
const transitionCases = [
  { input: 'A_a_E.mp4', expected: 'furnished_to_unfurnished' },
  { input: 'E_a_A.mp4', expected: 'unfurnished_to_furnished' },
  { input: 'A_a_CAD.mp4', expected: 'furnished_to_plans' },
  { input: 'CAD_a_A.mp4', expected: 'plans_to_furnished' },
  { input: 'E_a_CAD.mp4', expected: 'unfurnished_to_plans' },
  { input: 'CAD_a_E.mp4', expected: 'plans_to_unfurnished' },
  { input: '101_A_a_E.mp4', expected: 'furnished_to_unfurnished' },
  { input: 'transicion_E_a_A.mp4', expected: 'unfurnished_to_furnished' },
  { input: 'video_CAD_a_A.mp4', expected: 'plans_to_furnished' },
  { input: 'Amoblado a Entregable.mp4', expected: 'furnished_to_unfurnished' },
  { input: 'Sin Amoblar a Amoblado.mp4', expected: 'unfurnished_to_furnished' },
  { input: 'Amoblado a Medidas.mp4', expected: 'furnished_to_plans' },
  { input: 'Plano a Amoblado.mp4', expected: 'plans_to_furnished' },
  { input: 'Entregable a CAD.mov', expected: 'unfurnished_to_plans' },
  { input: 'CAD a Sin Amoblar.avi', expected: 'plans_to_unfurnished' },
  { input: 'furnished_to_unfurnished.mp4', expected: 'furnished_to_unfurnished' },
  { input: 'plans_to_furnished.mp4', expected: 'plans_to_furnished' },
  { input: 'not_a_transition.jpg', expected: null },
];

for (const tc of transitionCases) {
  const result = classifyTransition(tc.input);
  assert.strictEqual(result, tc.expected, `classifyTransition("${tc.input}") failed: expected ${tc.expected}, got ${result}`);
}
logPass('Transition video classifier correctly matches 18 test patterns');

// Natural sorting
const unsorted = ['10.jpg', '2.jpg', '1.jpg', '20.jpg', '11.jpg', '12.jpg', '3.jpg'];
const sorted = naturalSort(unsorted);
assert.deepStrictEqual(sorted, ['1.jpg', '2.jpg', '3.jpg', '10.jpg', '11.jpg', '12.jpg', '20.jpg']);
logPass('Natural numeric sort properly orders 1, 2, 3, 10, 11, 12, 20');

// ----------------------------------------------------------------------
// 2. SYNTHETIC FIXTURE GENERATION
// ----------------------------------------------------------------------
logSection('2. Synthetic Fixture Generation & Pipeline Execution');

const tempBase = path.join(os.tmpdir(), `m2_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
const testRawDir = path.join(tempBase, 'raw_assets');
const testDistDir = path.join(tempBase, 'dist_assets');

fs.mkdirSync(testRawDir, { recursive: true });

console.log(`Generating synthetic raw assets fixture at ${testRawDir}...`);

// Generate sample base images (red, green, blue)
const imgFurnished = await sharp({
  create: { width: 400, height: 300, channels: 3, background: { r: 220, g: 100, b: 50 } }
}).jpeg().toBuffer();

const imgUnfurnished = await sharp({
  create: { width: 400, height: 300, channels: 3, background: { r: 80, g: 180, b: 80 } }
}).png().toBuffer();

const imgPlans = await sharp({
  create: { width: 400, height: 300, channels: 3, background: { r: 50, g: 100, b: 220 } }
}).jpeg().toBuffer();

// Generate short 0.1s MP4 video fixture with ffmpeg
const sampleVideoPath = path.join(tempBase, 'sample_source.mp4');
execFileSync('ffmpeg', [
  '-y',
  '-f', 'lavfi',
  '-i', 'color=c=orange:s=320x240:d=0.2',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-an',
  sampleVideoPath,
], { stdio: 'pipe' });
const sampleVideoBuffer = fs.readFileSync(sampleVideoPath);

// Create 8 view typologies with base views and transitions
for (const typoId of VIEW_TYPOLOGIES) {
  const typoDir = path.join(testRawDir, typoId);
  fs.mkdirSync(typoDir, { recursive: true });

  // Base views with diverse naming
  fs.writeFileSync(path.join(typoDir, 'Amoblado.jpg'), imgFurnished);
  fs.writeFileSync(path.join(typoDir, 'Entregable sin amoblar.png'), imgUnfurnished);
  fs.writeFileSync(path.join(typoDir, 'CAD.jpg'), imgPlans);

  // Transitions folder
  const transDir = path.join(typoDir, 'transiciones');
  fs.mkdirSync(transDir, { recursive: true });

  fs.writeFileSync(path.join(transDir, 'A_a_E.mp4'), sampleVideoBuffer);
  fs.writeFileSync(path.join(transDir, 'E_a_A.mp4'), sampleVideoBuffer);
  fs.writeFileSync(path.join(transDir, 'A_a_CAD.mp4'), sampleVideoBuffer);
  fs.writeFileSync(path.join(transDir, 'CAD_a_A.mp4'), sampleVideoBuffer);
  fs.writeFileSync(path.join(transDir, 'E_a_CAD.mp4'), sampleVideoBuffer);
  fs.writeFileSync(path.join(transDir, 'CAD_a_E.mp4'), sampleVideoBuffer);
}

// Create gallery folders
// Flat 101: 11 photos (scrambled filenames to test natural sort)
const gal101Dir = path.join(testRawDir, '101', 'Galeria');
fs.mkdirSync(gal101Dir, { recursive: true });
for (const n of [11, 1, 10, 2, 9, 3, 8, 4, 7, 5, 6]) {
  fs.writeFileSync(path.join(gal101Dir, `${n}.jpg`), imgFurnished);
}

// Flat 102: 12 photos
const gal102Dir = path.join(testRawDir, '102', 'Galeria');
fs.mkdirSync(gal102Dir, { recursive: true });
for (let i = 1; i <= 12; i++) {
  fs.writeFileSync(path.join(gal102Dir, `${i}.jpg`), imgFurnished);
}

// Flat x01: 9 photos
const galX01Dir = path.join(testRawDir, 'x01', 'Galeria');
fs.mkdirSync(galX01Dir, { recursive: true });
for (let i = 1; i <= 9; i++) {
  fs.writeFileSync(path.join(galX01Dir, `${i}.jpg`), imgFurnished);
}

// Flat x02: 10 photos
const galX02Dir = path.join(testRawDir, 'x02', 'Galeria');
fs.mkdirSync(galX02Dir, { recursive: true });
for (let i = 1; i <= 10; i++) {
  fs.writeFileSync(path.join(galX02Dir, `${i}.jpg`), imgFurnished);
}

// Duplex 501: Split into 501.1 (7 photos) and 501.2 (8 photos) to test consolidation (15 total)
const gal501_1Dir = path.join(testRawDir, '501.1', 'Galeria');
fs.mkdirSync(gal501_1Dir, { recursive: true });
for (let i = 1; i <= 7; i++) {
  const buf = await sharp({ create: { width: 300, height: 200, channels: 3, background: { r: i * 20, g: 50, b: 50 } } }).jpeg().toBuffer();
  fs.writeFileSync(path.join(gal501_1Dir, `${i}.jpg`), buf);
}

const gal501_2Dir = path.join(testRawDir, '501.2', 'Galeria');
fs.mkdirSync(gal501_2Dir, { recursive: true });
for (let i = 8; i <= 15; i++) {
  const buf = await sharp({ create: { width: 300, height: 200, channels: 3, background: { r: 50, g: i * 15, b: 50 } } }).jpeg().toBuffer();
  fs.writeFileSync(path.join(gal501_2Dir, `${i}.jpg`), buf);
}

// Duplex 502: Staged as shared root raw_assets/502/Galeria (15 photos) with scrambled numbers
const gal502Dir = path.join(testRawDir, '502', 'Galeria');
fs.mkdirSync(gal502Dir, { recursive: true });
for (const n of [15, 1, 14, 2, 13, 3, 12, 4, 11, 5, 10, 6, 9, 7, 8]) {
  const buf = await sharp({ create: { width: 300, height: 200, channels: 3, background: { r: 50, g: 50, b: n * 15 } } }).jpeg().toBuffer();
  fs.writeFileSync(path.join(gal502Dir, `${n}.jpg`), buf);
}

logPass('Synthetic staging fixture successfully created with all 144 raw inputs');

// ----------------------------------------------------------------------
// 3. EXECUTE NORMALIZATION PIPELINE
// ----------------------------------------------------------------------
logSection('3. Execute processTypologies() on Synthetic Fixture');

const processReport = await processTypologies({
  inputDir: testRawDir,
  outputDir: testDistDir,
  force: true,
  concurrency: 4,
  verbose: false,
});

assert.strictEqual(processReport.success, true, 'processTypologies reported failure');
assert.strictEqual(processReport.totalAssetsOutput, 144, `Total output assets mismatch: ${processReport.totalAssetsOutput}`);
assert.strictEqual(processReport.baseViews.converted, 24, `Base views mismatch: ${processReport.baseViews.converted}`);
assert.strictEqual(processReport.transitions.transcoded, 48, `Transitions mismatch: ${processReport.transitions.transcoded}`);
assert.strictEqual(processReport.galleries.converted, 72, `Galleries mismatch: ${processReport.galleries.converted}`);
assert.strictEqual(processReport.errors.length, 0, `Errors during processing: ${processReport.errors.join(', ')}`);

logPass(`Pipeline completed in ${(processReport.elapsedMs / 1000).toFixed(2)}s with 144/144 assets created`);

// ----------------------------------------------------------------------
// 4. VERIFY DISTRIBUTION DIRECTORY
// ----------------------------------------------------------------------
logSection('4. Execute verifyDist() on Processed Distribution');

const distReport = await verifyDist(testDistDir);

assert.strictEqual(distReport.valid, true, `verifyDist failed: ${distReport.errors.join('; ')}`);
assert.strictEqual(distReport.stats.totalAssetsFound, 144, `Total assets found: ${distReport.stats.totalAssetsFound}`);
assert.strictEqual(distReport.stats.totalBaseViews, 24, `Total base views: ${distReport.stats.totalBaseViews}`);
assert.strictEqual(distReport.stats.totalTransitions, 48, `Total transitions: ${distReport.stats.totalTransitions}`);
assert.strictEqual(distReport.stats.totalGalleryImages, 72, `Total gallery images: ${distReport.stats.totalGalleryImages}`);
assert.strictEqual(distReport.unexpectedFiles.length, 0, `Unexpected files found: ${distReport.unexpectedFiles.join(', ')}`);
assert.strictEqual(distReport.errors.length, 0, `Errors: ${distReport.errors.join(', ')}`);

logPass('verifyDist() verified all 144 assets with 0 errors');

// Verify duplex consolidation structure specifically
const detailsRoot = path.join(testDistDir, 'plants', 'details');
assert.strictEqual(fs.existsSync(path.join(detailsRoot, '501', 'gallery')), true, '501/gallery must exist');
assert.strictEqual(fs.readdirSync(path.join(detailsRoot, '501', 'gallery')).length, 15, '501/gallery must have 15 files');
assert.strictEqual(fs.existsSync(path.join(detailsRoot, '501.1', 'gallery')), false, '501.1/gallery must NOT exist');
assert.strictEqual(fs.existsSync(path.join(detailsRoot, '501.2', 'gallery')), false, '501.2/gallery must NOT exist');

assert.strictEqual(fs.existsSync(path.join(detailsRoot, '502', 'gallery')), true, '502/gallery must exist');
assert.strictEqual(fs.readdirSync(path.join(detailsRoot, '502', 'gallery')).length, 15, '502/gallery must have 15 files');
assert.strictEqual(fs.existsSync(path.join(detailsRoot, '502.1', 'gallery')), false, '502.1/gallery must NOT exist');
assert.strictEqual(fs.existsSync(path.join(detailsRoot, '502.2', 'gallery')), false, '502.2/gallery must NOT exist');

logPass('Duplex galleries strictly consolidated under 501/gallery and 502/gallery (no sub-galleries in 501.1/501.2/502.1/502.2)');

// Verify natural sort sequential numbering
for (let i = 1; i <= 15; i++) {
  assert.strictEqual(fs.existsSync(path.join(detailsRoot, '501', 'gallery', `${i}.webp`)), true, `501/gallery/${i}.webp must exist`);
  assert.strictEqual(fs.existsSync(path.join(detailsRoot, '502', 'gallery', `${i}.webp`)), true, `502/gallery/${i}.webp must exist`);
}
for (let i = 1; i <= 11; i++) {
  assert.strictEqual(fs.existsSync(path.join(detailsRoot, '101', 'gallery', `${i}.webp`)), true, `101/gallery/${i}.webp must exist`);
}
logPass('Gallery files strictly follow 1-based sequential integers: 1.webp .. N.webp');

// Verify deep video format properties (faststart & h264)
const sampleOutputVideo = path.join(detailsRoot, '101', 'transitions', 'furnished_to_unfurnished.mp4');
const vRes = validateMp4Video(sampleOutputVideo);
assert.strictEqual(vRes.valid, true, `validateMp4Video failed: ${vRes.error}`);
assert.strictEqual(vRes.codec, 'h264', `Video codec is ${vRes.codec}`);
assert.strictEqual(vRes.faststart, true, 'Video faststart is true');
logPass('Sample MP4 video has valid H.264 video codec and verified faststart moov atom');

// ----------------------------------------------------------------------
// 5. ADVERSARIAL / DEFECT DETECTION TESTS
// ----------------------------------------------------------------------
logSection('5. Adversarial Defect Detection Verification');

// Test 5.1: 0-byte file detection
const testCorruptDir = path.join(tempBase, 'corrupt_test');
fs.cpSync(testDistDir, testCorruptDir, { recursive: true });
const targetFile = path.join(testCorruptDir, 'plants', 'details', '101', 'furnished.webp');
fs.writeFileSync(targetFile, Buffer.alloc(0)); // Make 0 bytes

const corruptReport = await verifyDist(testCorruptDir);
assert.strictEqual(corruptReport.valid, false, 'verifyDist must fail on 0-byte file');
assert.ok(corruptReport.errors.some(e => e.includes('0 bytes')), 'verifyDist must mention 0 bytes error');
logPass('Adversarial: Successfully detected 0-byte file defect');

// Test 5.2: Missing file detection
fs.unlinkSync(targetFile);
const missingReport = await verifyDist(testCorruptDir);
assert.strictEqual(missingReport.valid, false, 'verifyDist must fail on missing base view');
assert.ok(missingReport.errors.some(e => e.includes('does not exist') || e.includes('Missing')), 'verifyDist must mention missing file');
logPass('Adversarial: Successfully detected missing base view defect');

// Test 5.3: Rogue extra file detection
fs.cpSync(testDistDir, testCorruptDir, { recursive: true });
const rogueFile = path.join(testCorruptDir, 'plants', 'details', 'rogue_file.txt');
fs.writeFileSync(rogueFile, 'illegal');
const rogueReport = await verifyDist(testCorruptDir);
assert.strictEqual(rogueReport.valid, false, 'verifyDist must fail on rogue/unexpected file');
assert.ok(rogueReport.errors.some(e => e.includes('unexpected/rogue')), 'verifyDist must report unexpected file');
logPass('Adversarial: Successfully detected rogue extra file');

// Test 5.4: Illegal duplex sub-gallery detection
fs.cpSync(testDistDir, testCorruptDir, { recursive: true });
const illegalGalDir = path.join(testCorruptDir, 'plants', 'details', '501.1', 'gallery');
fs.mkdirSync(illegalGalDir, { recursive: true });
fs.writeFileSync(path.join(illegalGalDir, '1.webp'), imgFurnished);
const illegalReport = await verifyDist(testCorruptDir);
assert.strictEqual(illegalReport.valid, false, 'verifyDist must fail if 501.1/gallery exists');
assert.ok(illegalReport.errors.some(e => e.includes('Illegal gallery directory found')), 'verifyDist must report illegal gallery');
logPass('Adversarial: Successfully detected illegal duplex sub-gallery in 501.1/gallery');

// Test 5.5: Non-H.264 video detection
fs.cpSync(testDistDir, testCorruptDir, { recursive: true });
const nonH264Video = path.join(testCorruptDir, 'plants', 'details', '101', 'transitions', 'furnished_to_unfurnished.mp4');
// Encode as MPEG-4 instead of libx264
execFileSync('ffmpeg', [
  '-y',
  '-f', 'lavfi',
  '-i', 'color=c=black:s=160x120:d=0.1',
  '-c:v', 'mpeg4',
  '-movflags', '+faststart',
  nonH264Video
], { stdio: 'pipe' });

const codecReport = await verifyDist(testCorruptDir);
assert.strictEqual(codecReport.valid, false, 'verifyDist must fail when video is not H.264');
assert.ok(codecReport.errors.some(e => e.includes('codec is') || e.includes('h264')), 'verifyDist must report codec mismatch');
logPass('Adversarial: Successfully detected non-H.264 video codec defect');

// ----------------------------------------------------------------------
// 6. CLI INVOCATION TESTS
// ----------------------------------------------------------------------
logSection('6. CLI Invocation Exit Code Verification');

const testCliDist = path.join(tempBase, 'cli_dist');

// Test CLI process-typologies.mjs
execFileSync('node', [
  'scripts/process-typologies.mjs',
  '--input', testRawDir,
  '--output', testCliDist,
  '--force',
], { stdio: 'pipe' });
logPass('CLI execution: process-typologies.mjs exited code 0');

// Test CLI verify-dist.mjs on passing directory
execFileSync('node', [
  'scripts/verify-dist.mjs',
  '--dir', testCliDist,
], { stdio: 'pipe' });
logPass('CLI execution: verify-dist.mjs exited code 0 on valid assets');

// Test CLI verify-dist.mjs on failing directory (should exit 1)
let failedExitedOne = false;
try {
  execFileSync('node', [
    'scripts/verify-dist.mjs',
    '--dir', testCorruptDir,
  ], { stdio: 'pipe' });
} catch (err) {
  if (err.status === 1) {
    failedExitedOne = true;
  }
}
assert.strictEqual(failedExitedOne, true, 'verify-dist.mjs must exit code 1 on defect');
logPass('CLI execution: verify-dist.mjs exited code 1 on defective directory');

// ----------------------------------------------------------------------
// CLEANUP
// ----------------------------------------------------------------------
fs.rmSync(tempBase, { recursive: true, force: true });
logPass('Temporary test fixtures cleaned up');

console.log(`\n${colors.bold}${colors.green}ALL TESTS PASSED WITH 100% PRECISION!${colors.reset}\n`);
