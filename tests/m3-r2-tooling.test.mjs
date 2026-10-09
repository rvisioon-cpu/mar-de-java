#!/usr/bin/env node
/**
 * tests/m3-r2-tooling.test.mjs
 * 
 * Comprehensive Verification & Test Harness for Milestone 3 Tooling:
 *   - scripts/upload-r2.mjs
 *   - scripts/verify-r2.mjs
 * 
 * Covers:
 *   1. Canonical Asset Registry & MIME Resolution (144 assets, keys, contracts)
 *   2. Distribution Directory Scanner & Rogue File Detection
 *   3. upload-r2.mjs in --dry-run mode against synthetic fixture
 *   4. verify-r2.mjs against Mock HTTP CDN Server (144/144 URLs HTTP 200)
 *   5. verify-r2.mjs Adversarial Defect Handling (404, wrong MIME, 0-byte, 500)
 *   6. CLI Invocations and Exit Code Verification
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import assert from 'assert';
import { execFileSync, execFile } from 'child_process';
import { promisify } from 'util';

import {
  getCanonicalAssets,
  getMimeType,
  scanAssets,
  uploadAssets,
  detectUploadMethod,
  parseArgs as parseUploadArgs,
  DEFAULT_BUCKET,
} from '../scripts/upload-r2.mjs';

import {
  getCanonicalVerifyList,
  matchesContentType,
  verifyAssetUrl,
  verifyAllAssets,
  parseArgs as parseVerifyArgs,
  DEFAULT_BASE_URL,
} from '../scripts/verify-r2.mjs';

const execFileAsync = promisify(execFile);

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
// 1. UNIT TESTS: Canonical Asset Registry & MIME Resolution
// ----------------------------------------------------------------------
logSection('1. Canonical Asset Registry & MIME Resolution');

const canonicalAssets = getCanonicalAssets();
assert.strictEqual(canonicalAssets.length, 144, `Expected exactly 144 canonical assets, got ${canonicalAssets.length}`);

// Check breakdowns
const baseViews = canonicalAssets.filter(a => a.type === 'base_view');
const transitions = canonicalAssets.filter(a => a.type === 'transition');
const galleries = canonicalAssets.filter(a => a.type === 'gallery');

assert.strictEqual(baseViews.length, 24, `Expected 24 base views (8 x 3), got ${baseViews.length}`);
assert.strictEqual(transitions.length, 48, `Expected 48 transitions (8 x 6), got ${transitions.length}`);
assert.strictEqual(galleries.length, 72, `Expected 72 gallery items (11+12+9+10+15+15), got ${galleries.length}`);

// Check storage key prefixes
for (const a of canonicalAssets) {
  assert.ok(a.key.startsWith('plants/details/'), `Key must start with plants/details/: ${a.key}`);
  if (a.key.endsWith('.webp')) {
    assert.strictEqual(a.expectedContentType, 'image/webp', `Expected image/webp for ${a.key}`);
    assert.strictEqual(getMimeType(a.key), 'image/webp');
  } else if (a.key.endsWith('.mp4')) {
    assert.strictEqual(a.expectedContentType, 'video/mp4', `Expected video/mp4 for ${a.key}`);
    assert.strictEqual(getMimeType(a.key), 'video/mp4');
  }
}
logPass('Canonical asset registry correctly specifies 144 assets with exact keys and MIME contracts');

// Test matchesContentType helper
assert.strictEqual(matchesContentType('image/webp', 'image/webp'), true);
assert.strictEqual(matchesContentType('image/webp; charset=utf-8', 'image/webp'), true);
assert.strictEqual(matchesContentType('IMAGE/WEBP', 'image/webp'), true);
assert.strictEqual(matchesContentType('video/mp4', 'video/mp4'), true);
assert.strictEqual(matchesContentType('text/html', 'image/webp'), false);
assert.strictEqual(matchesContentType(null, 'image/webp'), false);
logPass('matchesContentType correctly evaluates MIME patterns including parameters');

// ----------------------------------------------------------------------
// 2. SYNTHETIC FIXTURE GENERATION & SCANNER VALIDATION
// ----------------------------------------------------------------------
logSection('2. Synthetic Distribution Fixture & Scanner Validation');

const tempDir = path.join(os.tmpdir(), `m3_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
const detailsDir = path.join(tempDir, 'plants', 'details');
fs.mkdirSync(detailsDir, { recursive: true });

// Create all 144 synthetic normalized files
const dummyWebp = Buffer.from('RIFF\x14\x00\x00\x00WEBPVP8 \x08\x00\x00\x00\x30\x01\x00\x9d\x01\x2a\x01\x00\x01\x00');
const dummyMp4 = Buffer.from('\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom\x00\x00\x00\x08free\x00\x00\x00\x08mdat');

for (const asset of canonicalAssets) {
  const filePath = path.join(detailsDir, asset.relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, asset.expectedContentType === 'image/webp' ? dummyWebp : dummyMp4);
}

logPass(`Synthetic distribution created at ${detailsDir} containing 144 files`);

// Test scanner on valid directory
const scanResult = scanAssets(tempDir);
assert.strictEqual(scanResult.validAssets.length, 144, `Expected 144 valid assets, got ${scanResult.validAssets.length}`);
assert.strictEqual(scanResult.missingAssets.length, 0, `Expected 0 missing assets, got ${scanResult.missingAssets.length}`);
assert.strictEqual(scanResult.extraFiles.length, 0, `Expected 0 extra files, got ${scanResult.extraFiles.length}`);
logPass('scanAssets accurately discovered all 144 assets with 0 missing and 0 extra');

// Test scanner on defective directory (missing file + rogue extra file)
const missingKeyRel = '101/furnished.webp';
const missingFile = path.join(detailsDir, missingKeyRel);
fs.unlinkSync(missingFile);
const rogueFile = path.join(detailsDir, '101', 'rogue_extra.txt');
fs.writeFileSync(rogueFile, 'rogue');

const defectiveScan = scanAssets(tempDir);
assert.strictEqual(defectiveScan.validAssets.length, 143);
assert.strictEqual(defectiveScan.missingAssets.length, 1);
assert.strictEqual(defectiveScan.missingAssets[0].relPath, missingKeyRel);
assert.strictEqual(defectiveScan.extraFiles.length, 1);
assert.strictEqual(defectiveScan.extraFiles[0], '101/rogue_extra.txt');
logPass('scanAssets correctly detected missing file and rogue extra file in defective directory');

// Restore missing file and remove rogue
fs.writeFileSync(missingFile, dummyWebp);
fs.unlinkSync(rogueFile);

// ----------------------------------------------------------------------
// 3. EXECUTE uploadAssets() IN DRY-RUN MODE
// ----------------------------------------------------------------------
logSection('3. uploadAssets() in --dry-run Mode');

const uploadReport = await uploadAssets({
  dir: tempDir,
  dryRun: true,
  concurrency: 8,
  verbose: false,
});

assert.strictEqual(uploadReport.success, true, 'Dry-run upload must succeed');
assert.strictEqual(uploadReport.totalAssets, 144, 'Must process all 144 assets');
assert.strictEqual(uploadReport.uploaded, 144, 'All 144 assets must report simulated upload');
assert.strictEqual(uploadReport.failed, 0, '0 assets failed');
assert.strictEqual(uploadReport.missing.length, 0, '0 assets missing');
assert.strictEqual(uploadReport.method, 'dry-run');

// Verify every result object
for (const res of uploadReport.results) {
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.dryRun, true);
  assert.ok(res.sha256, 'Must compute SHA-256 in dry-run');
  assert.ok(res.key.startsWith('plants/details/'));
  assert.ok(res.size > 0);
}
logPass('uploadAssets() dry-run validated 144/144 assets, calculated SHA256 hashes and key mappings');

// ----------------------------------------------------------------------
// 4. HTTP VERIFICATION ENGINE WITH CUSTOM FETCH & RESPONSE VALIDATION
// ----------------------------------------------------------------------
logSection('4. verify-r2.mjs against Mock CDN Responses (144/144 URLs)');

// Create realistic response handler serving genuine Response objects for all 144 assets
const mockBaseUrl = 'https://pub-969e43023d6b439997d1d0718f6cf14e.r2.dev';
const mockFetch = async (url, init = {}) => {
  const cleanUrl = url.split('?')[0];
  const urlPath = cleanUrl.replace(/^https?:\/\/[^/]+\//, '');
  const asset = canonicalAssets.find(a => a.key === urlPath);

  if (!asset) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain', 'content-length': '9' },
    });
  }

  const isWebp = asset.expectedContentType === 'image/webp';
  const body = isWebp ? dummyWebp : dummyMp4;

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': asset.expectedContentType,
      'content-length': String(body.length),
      'accept-ranges': 'bytes',
      'server': 'Cloudflare-R2',
    },
  });
};

const verifyReport = await verifyAllAssets({
  baseUrl: mockBaseUrl,
  fetchFn: mockFetch,
  concurrency: 16,
  retries: 1,
  timeout: 5000,
});

assert.strictEqual(verifyReport.success, true, 'Mock CDN verification must pass 100%');
assert.strictEqual(verifyReport.total, 144);
assert.strictEqual(verifyReport.passed, 144);
assert.strictEqual(verifyReport.failed, 0);

// Spot-check individual results
for (const r of verifyReport.results) {
  assert.strictEqual(r.pass, true);
  assert.strictEqual(r.statusCode, 200);
  assert.strictEqual(r.actualContentType, r.expectedContentType);
  assert.ok(r.contentLength > 0);
  assert.strictEqual(r.error, null);
}
logPass('verifyAllAssets() successfully verified 144/144 URLs (HTTP 200, matching MIME, Content-Length > 0)');

// Test with GET mode
const verifyGetReport = await verifyAllAssets({
  baseUrl: mockBaseUrl,
  fetchFn: mockFetch,
  concurrency: 16,
  get: true,
  retries: 0,
});
assert.strictEqual(verifyGetReport.success, true);
assert.strictEqual(verifyGetReport.passed, 144);
logPass('verifyAllAssets() in --get mode successfully validated 144/144 URLs');

// ----------------------------------------------------------------------
// 5. ADVERSARIAL DEFECT DETECTION TESTS
// ----------------------------------------------------------------------
logSection('5. verify-r2.mjs Adversarial Defect Handling');

// Setup a defective mock fetch simulating specific real-world defects
const defectiveFetch = async (url, init = {}) => {
  const cleanUrl = url.split('?')[0];
  const urlPath = cleanUrl.replace(/^https?:\/\/[^/]+\//, '');

  if (urlPath === 'plants/details/101/furnished.webp') {
    // Defect 1: HTTP 404 Not Found
    return new Response('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/html' },
    });
  } else if (urlPath === 'plants/details/102/unfurnished.webp') {
    // Defect 2: Wrong Content-Type
    return new Response('<html>html content</html>', {
      status: 200,
      headers: { 'content-type': 'text/html', 'content-length': '100' },
    });
  } else if (urlPath === 'plants/details/x01/plans.webp') {
    // Defect 3: Content-Length 0
    return new Response('', {
      status: 200,
      headers: { 'content-type': 'image/webp', 'content-length': '0' },
    });
  } else if (urlPath === 'plants/details/501.1/transitions/furnished_to_unfurnished.mp4') {
    // Defect 4: HTTP 500 Server Error
    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'content-type': 'text/plain' },
    });
  } else {
    // Default valid
    return new Response(dummyWebp, {
      status: 200,
      headers: { 'content-type': 'image/webp', 'content-length': String(dummyWebp.length) },
    });
  }
};

const advReport = await verifyAllAssets({
  baseUrl: mockBaseUrl,
  fetchFn: defectiveFetch,
  concurrency: 16,
  retries: 0,
});

assert.strictEqual(advReport.success, false, 'Defective CDN verification must fail');
assert.ok(advReport.failed >= 4, `Expected at least 4 failures, got ${advReport.failed}`);

// Validate that specific defects were captured
const defect1 = advReport.results.find(r => r.key === 'plants/details/101/furnished.webp');
assert.strictEqual(defect1.pass, false);
assert.ok(defect1.error.includes('HTTP 404'));

const defect2 = advReport.results.find(r => r.key === 'plants/details/102/unfurnished.webp');
assert.strictEqual(defect2.pass, false);
assert.ok(defect2.error.includes('MIME mismatch'));

const defect3 = advReport.results.find(r => r.key === 'plants/details/x01/plans.webp');
assert.strictEqual(defect3.pass, false);
assert.ok(defect3.error.includes('Content-Length is 0'));

const defect4 = advReport.results.find(r => r.key === 'plants/details/501.1/transitions/furnished_to_unfurnished.mp4');
assert.strictEqual(defect4.pass, false);
assert.ok(defect4.error.includes('HTTP 500'));

logPass('Adversarial: Successfully detected HTTP 404, MIME mismatch, 0-byte, and HTTP 500 defects');

// ----------------------------------------------------------------------
// 6. CLI INVOCATIONS AND EXIT CODE VERIFICATION
// ----------------------------------------------------------------------
logSection('6. CLI Invocations and Exit Code Verification');

// Test upload-r2.mjs --help
const uploadHelp = execFileSync('node', ['scripts/upload-r2.mjs', '--help'], { encoding: 'utf8' });
assert.ok(uploadHelp.includes('Cloudflare R2 Showroom Asset Upload Tool'));
logPass('CLI: node scripts/upload-r2.mjs --help returned exit code 0');

// Test verify-r2.mjs --help
const verifyHelp = execFileSync('node', ['scripts/verify-r2.mjs', '--help'], { encoding: 'utf8' });
assert.ok(verifyHelp.includes('Cloudflare R2 Public CDN Verification Tool'));
logPass('CLI: node scripts/verify-r2.mjs --help returned exit code 0');

// Test CLI upload-r2.mjs --dry-run --json
const { stdout: uploadCliJson } = await execFileAsync('node', [
  'scripts/upload-r2.mjs',
  '--dir', tempDir,
  '--dry-run',
  '--json',
], { maxBuffer: 10 * 1024 * 1024 });

const uploadJsonObj = JSON.parse(uploadCliJson);
assert.strictEqual(uploadJsonObj.success, true);
assert.strictEqual(uploadJsonObj.totalAssets, 144);
assert.strictEqual(uploadJsonObj.uploaded, 144);
logPass('CLI: node scripts/upload-r2.mjs --dry-run --json exited code 0 with 144 processed assets');

// Test CLI verify-r2.mjs --mock --json
const { stdout: verifyCliJson } = await execFileAsync('node', [
  'scripts/verify-r2.mjs',
  '--mock',
  '--json',
], { maxBuffer: 10 * 1024 * 1024 });

const verifyJsonObj = JSON.parse(verifyCliJson);
assert.strictEqual(verifyJsonObj.success, true);
assert.strictEqual(verifyJsonObj.total, 144);
assert.strictEqual(verifyJsonObj.passed, 144);
assert.strictEqual(verifyJsonObj.failed, 0);
logPass('CLI: node scripts/verify-r2.mjs --mock --json exited code 0 with 144 passed assets');

// Test CLI verify-r2.mjs error exit code on live unuploaded/blocked domain
try {
  await execFileAsync('node', ['scripts/verify-r2.mjs', '--timeout', '1000', '--retries', '0']);
  assert.fail('Should have failed with exit code 1');
} catch (err) {
  assert.strictEqual(err.code, 1, `Expected exit code 1 on verification failure, got ${err.code}`);
}
logPass('CLI: node scripts/verify-r2.mjs correctly exited with code 1 when assets fail/are inaccessible');

// Clean up temporary directory
fs.rmSync(tempDir, { recursive: true, force: true });
logPass('Temporary test fixtures cleanly removed');

console.log(`\n${colors.bold}${colors.green}ALL MILESTONE 3 TESTS PASSED WITH 100% PRECISION!${colors.reset}\n`);
