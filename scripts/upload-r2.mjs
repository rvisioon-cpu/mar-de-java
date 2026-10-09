#!/usr/bin/env node
/**
 * scripts/upload-r2.mjs
 * 
 * Milestone 3: Cloudflare R2 Upload Tooling
 * 
 * Scans normalized showroom assets (default: `dist_assets/plants/details/` or `--dir <path>`)
 * for all 144 normalized assets and uploads them to Cloudflare R2 bucket `mar-java-showroom`
 * under storage keys matching `plants/details/{assetId}/...`.
 * 
 * Supports:
 *   - Upload engines:
 *       1. Wrangler R2 CLI (`npx wrangler r2 object put mar-java-showroom/<key> --file=<path> --content-type=<mime>`)
 *       2. Cloudflare API / AWS S3 SDK (SigV4 HTTP PUT) if credentials exist
 *   - Automatic Content-Type assignment (`image/webp` for .webp, `video/mp4` for .mp4)
 *   - CLI flags:
 *       --dry-run       Simulate scan and key mapping without transferring files
 *       --dir <path>    Source directory (default: dist_assets/plants/details or dist_assets)
 *       --bucket <name> Target R2 bucket (default: mar-java-showroom)
 *       --concurrency <n> Parallel upload workers (default: 4)
 *       --force         Force re-upload even if objects exist
 *       --method <m>    Upload method: 'auto', 'wrangler', 's3', 'api' (default: 'auto')
 *       --verbose       Detailed per-asset progress output
 *       --json          Machine-readable JSON output
 *       --help          Display usage instructions
 * 
 * Exits code 0 on success/dry-run, code 1 on failure.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

// ANSI terminal colors
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

export const DEFAULT_BUCKET = 'mar-java-showroom';
export const DEFAULT_PREFIX = 'plants/details';

export const CANONICAL_TYPOLOGIES = [
  '101',
  '102',
  'x01',
  'x02',
  '501.1',
  '501.2',
  '502.1',
  '502.2',
];

export const CANONICAL_BASE_VIEWS = [
  'furnished.webp',
  'unfurnished.webp',
  'plans.webp',
];

export const CANONICAL_TRANSITIONS = [
  'furnished_to_unfurnished.mp4',
  'unfurnished_to_furnished.mp4',
  'furnished_to_plans.mp4',
  'plans_to_furnished.mp4',
  'unfurnished_to_plans.mp4',
  'plans_to_unfurnished.mp4',
];

export const CANONICAL_GALLERIES = {
  '101': 11,
  '102': 12,
  'x01': 9,
  'x02': 10,
  '501': 15,
  '502': 15,
};

/**
 * Maps a file extension to its canonical MIME Content-Type header.
 * @param {string} filePath 
 * @returns {string} MIME type
 */
export function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.webp':
      return 'image/webp';
    case '.mp4':
      return 'video/mp4';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Returns the exact list of 144 canonical asset definitions required by the project.
 * @returns {Array<{ key: string, relPath: string, type: string, assetId: string, expectedContentType: string }>}
 */
export function getCanonicalAssets() {
  const assets = [];

  // 1. Base views (8 typologies * 3 views = 24 assets)
  for (const typo of CANONICAL_TYPOLOGIES) {
    for (const view of CANONICAL_BASE_VIEWS) {
      const relPath = `${typo}/${view}`;
      assets.push({
        key: `${DEFAULT_PREFIX}/${relPath}`,
        relPath,
        type: 'base_view',
        assetId: typo,
        expectedContentType: 'image/webp',
      });
    }
  }

  // 2. Transitions (8 typologies * 6 transitions = 48 assets)
  for (const typo of CANONICAL_TYPOLOGIES) {
    for (const trans of CANONICAL_TRANSITIONS) {
      const relPath = `${typo}/transitions/${trans}`;
      assets.push({
        key: `${DEFAULT_PREFIX}/${relPath}`,
        relPath,
        type: 'transition',
        assetId: typo,
        expectedContentType: 'video/mp4',
      });
    }
  }

  // 3. Galleries (6 gallery folders = 72 assets)
  for (const [folder, count] of Object.entries(CANONICAL_GALLERIES)) {
    for (let i = 1; i <= count; i++) {
      const relPath = `${folder}/gallery/${i}.webp`;
      assets.push({
        key: `${DEFAULT_PREFIX}/${relPath}`,
        relPath,
        type: 'gallery',
        assetId: folder,
        expectedContentType: 'image/webp',
      });
    }
  }

  return assets;
}

/**
 * Loads key-value pairs from an .env file into process.env if not already set.
 * @param {string} envPath 
 */
export function loadEnv(envPath) {
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch (_) {
      // Ignore env read errors
    }
  }
}

/**
 * Resolves the root distribution directory containing normalized showroom media.
 * Supports pointing to `dist_assets/plants/details` or `dist_assets` or custom path.
 * @param {string} inputDir 
 * @returns {{ resolvedDir: string, detailsDir: string }}
 */
export function resolveSourceDirectory(inputDir) {
  const candidate = path.resolve(process.cwd(), inputDir);
  if (!fs.existsSync(candidate)) {
    return { resolvedDir: candidate, detailsDir: candidate };
  }

  // Check if candidate contains plants/details/
  const nested = path.join(candidate, 'plants', 'details');
  if (fs.existsSync(nested) && fs.statSync(nested).isDirectory()) {
    return { resolvedDir: candidate, detailsDir: nested };
  }

  // Check if candidate contains details/
  const nestedDetails = path.join(candidate, 'details');
  if (fs.existsSync(nestedDetails) && fs.statSync(nestedDetails).isDirectory()) {
    return { resolvedDir: candidate, detailsDir: nestedDetails };
  }

  // Otherwise candidate is directly the details directory
  return { resolvedDir: candidate, detailsDir: candidate };
}

/**
 * Scans the distribution directory and matches files against canonical R2 keys.
 * @param {string} sourceDir 
 * @returns {{
 *   validAssets: Array<{ key: string, filePath: string, size: number, mimeType: string, type: string, assetId: string }>,
 *   missingAssets: Array<{ key: string, expectedContentType: string }>,
 *   extraFiles: Array<string>,
 *   totalCanonical: number
 * }}
 */
export function scanAssets(sourceDir) {
  const { detailsDir } = resolveSourceDirectory(sourceDir);
  const canonical = getCanonicalAssets();
  const validAssets = [];
  const missingAssets = [];

  for (const item of canonical) {
    const fullPath = path.join(detailsDir, item.relPath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      validAssets.push({
        key: item.key,
        relPath: item.relPath,
        filePath: fullPath,
        size: stats.size,
        mimeType: item.expectedContentType,
        type: item.type,
        assetId: item.assetId,
      });
    } else {
      missingAssets.push(item);
    }
  }

  // Detect extra/rogue files inside details directory
  const extraFiles = [];
  function walk(currentDir, relToDetails = '') {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const subRel = relToDetails ? `${relToDetails}/${entry.name}` : entry.name;
      const full = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(full, subRel);
      } else if (entry.isFile()) {
        const canonicalMatch = canonical.find(c => c.relPath === subRel);
        if (!canonicalMatch) {
          extraFiles.push(subRel);
        }
      }
    }
  }
  walk(detailsDir);

  return {
    validAssets,
    missingAssets,
    extraFiles,
    totalCanonical: canonical.length,
  };
}

/**
 * Helper to execute tasks with a concurrency ceiling.
 * @template T, R
 * @param {T[]} items 
 * @param {(item: T, index: number) => Promise<R>} worker 
 * @param {number} concurrency 
 * @returns {Promise<R[]>}
 */
export async function runConcurrent(items, worker, concurrency = 4) {
  const results = new Array(items.length);
  let nextIdx = 0;
  const poolSize = Math.max(1, Math.min(concurrency, items.length));

  const runners = Array.from({ length: poolSize }, async () => {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      results[idx] = await worker(items[idx], idx);
    }
  });

  await Promise.all(runners);
  return results;
}

/**
 * Uploads an object via Wrangler CLI (`npx wrangler r2 object put`).
 * Preserves HOME and user credentials from active environment while suppressing file logging.
 * @param {object} asset 
 * @param {object} options 
 * @returns {Promise<{ success: boolean, output?: string, error?: string }>}
 */
export async function uploadWithWrangler(asset, options = {}) {
  const bucket = options.bucket || DEFAULT_BUCKET;
  const targetPath = `${bucket}/${asset.key}`;
  const args = [
    'wrangler',
    'r2',
    'object',
    'put',
    targetPath,
    `--file=${asset.filePath}`,
    `--content-type=${asset.mimeType}`,
    '--remote',
  ];

  if (options.force) {
    args.push('-y');
  }

  const customEnv = {
    ...process.env,
    ...(process.env.HOME ? { HOME: process.env.HOME } : {}),
    ...(process.env.XDG_CONFIG_HOME ? { XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME } : {}),
    WRANGLER_LOG: 'none',
  };

  try {
    const { stdout, stderr } = await execFileAsync('npx', args, {
      env: customEnv,
      cwd: process.cwd(),
      timeout: options.timeout || 30000,
    });
    return { success: true, output: (stdout + stderr).trim() };
  } catch (err) {
    return {
      success: false,
      error: err.stderr || err.stdout || err.message,
    };
  }
}

/**
 * Signs and uploads an object to Cloudflare R2 via standard AWS SigV4 REST PUT.
 * Requires R2_ACCESS_KEY_ID (or AWS_ACCESS_KEY_ID), R2_SECRET_ACCESS_KEY (or AWS_SECRET_ACCESS_KEY),
 * and CLOUDFLARE_ACCOUNT_ID in process.env.
 * @param {object} asset 
 * @param {object} options 
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function uploadWithS3(asset, options = {}) {
  const accessKey = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const bucket = options.bucket || DEFAULT_BUCKET;

  if (!accessKey || !secretKey || !accountId) {
    throw new Error('Missing S3 credentials: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, or CLOUDFLARE_ACCOUNT_ID');
  }

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const fileBuffer = fs.readFileSync(asset.filePath);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  const region = 'auto';
  const service = 's3';

  const payloadHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const uriPath = `/${bucket}/${asset.key.split('/').map(encodeURIComponent).join('/')}`;

  const canonicalHeaders = [
    `content-length:${fileBuffer.length}`,
    `content-type:${asset.mimeType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n';

  const signedHeaders = 'content-length;content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'PUT',
    uriPath,
    '', // query
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  // Compute SigV4 signing key
  const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve) => {
    const req = https.request({
      hostname: host,
      port: 443,
      path: uriPath,
      method: 'PUT',
      headers: {
        'Host': host,
        'Content-Type': asset.mimeType,
        'Content-Length': fileBuffer.length,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authorizationHeader,
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `HTTP ${res.statusCode}: ${body || res.statusMessage}` });
        }
      });
    });

    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.write(fileBuffer);
    req.end();
  });
}

/**
 * Uploads an object via Cloudflare REST API.
 * Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in process.env.
 * @param {object} asset 
 * @param {object} options 
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function uploadWithApi(asset, options = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const bucket = options.bucket || DEFAULT_BUCKET;

  if (!token || !accountId) {
    throw new Error('Missing Cloudflare API credentials: CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID');
  }

  const fileBuffer = fs.readFileSync(asset.filePath);
  const uriPath = `/client/v4/accounts/${accountId}/r2/buckets/${bucket}/objects/${asset.key.split('/').map(encodeURIComponent).join('/')}`;

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.cloudflare.com',
      port: 443,
      path: uriPath,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': asset.mimeType,
        'Content-Length': fileBuffer.length,
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `HTTP ${res.statusCode}: ${body || res.statusMessage}` });
        }
      });
    });

    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.write(fileBuffer);
    req.end();
  });
}

/**
 * Determines the best upload method based on available environment credentials.
 * @param {string} requestedMethod 
 * @returns {'dry-run' | 's3' | 'api' | 'wrangler'}
 */
export function detectUploadMethod(requestedMethod) {
  if (requestedMethod && requestedMethod !== 'auto') {
    return requestedMethod;
  }
  if ((process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) &&
      (process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY) &&
      process.env.CLOUDFLARE_ACCOUNT_ID) {
    return 's3';
  }
  if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
    return 'api';
  }
  return 'wrangler';
}

/**
 * Main coordinator function to upload or dry-run all assets.
 * @param {object} options 
 * @returns {Promise<{
 *   success: boolean,
 *   totalAssets: number,
 *   uploaded: number,
 *   failed: number,
 *   durationMs: number,
 *   results: Array<object>,
 *   missing: Array<object>,
 *   extra: Array<string>
 * }>}
 */
export async function uploadAssets(options = {}) {
  const startTime = Date.now();
  const sourceDir = options.dir || 'dist_assets/plants/details';
  const bucket = options.bucket || DEFAULT_BUCKET;
  const concurrency = parseInt(options.concurrency, 10) || 4;
  const isDryRun = !!options.dryRun;
  const isVerbose = !!options.verbose;
  const method = isDryRun ? 'dry-run' : detectUploadMethod(options.method);

  // Scan source directory
  const scan = scanAssets(sourceDir);

  if (scan.validAssets.length === 0) {
    return {
      success: false,
      totalAssets: 0,
      uploaded: 0,
      failed: 0,
      durationMs: Date.now() - startTime,
      results: [],
      missing: scan.missingAssets,
      extra: scan.extraFiles,
      error: `No valid normalized assets found in ${sourceDir}. Expected 144 assets.`,
    };
  }

  const results = [];
  let uploadedCount = 0;
  let failedCount = 0;

  await runConcurrent(scan.validAssets, async (asset, idx) => {
    const itemStart = Date.now();
    let res;

    if (isDryRun) {
      // In dry-run mode, simulate hashing and verify local readability
      const fileBytes = fs.readFileSync(asset.filePath);
      const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex').substring(0, 12);
      res = {
        success: true,
        dryRun: true,
        sha256,
        latencyMs: Date.now() - itemStart,
      };
    } else {
      if (method === 's3') {
        res = await uploadWithS3(asset, { ...options, bucket });
      } else if (method === 'api') {
        res = await uploadWithApi(asset, { ...options, bucket });
      } else {
        res = await uploadWithWrangler(asset, { ...options, bucket });
      }
      res.latencyMs = Date.now() - itemStart;
    }

    const itemResult = {
      ...asset,
      ...res,
    };
    results.push(itemResult);

    if (res.success) {
      uploadedCount++;
    } else {
      failedCount++;
    }

    if (isVerbose) {
      const statusIcon = res.success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
      const sizeKb = (asset.size / 1024).toFixed(1);
      const tag = isDryRun ? '[DRY-RUN]' : `[${method.toUpperCase()}]`;
      console.log(`  ${statusIcon} ${tag} [${idx + 1}/${scan.validAssets.length}] ${asset.key} (${asset.mimeType}, ${sizeKb} KB) ${res.latencyMs}ms`);
      if (!res.success && res.error) {
        console.log(`      ${colors.red}Error:${colors.reset} ${res.error}`);
      }
    }
  }, concurrency);

  const durationMs = Date.now() - startTime;
  const overallSuccess = failedCount === 0 && scan.missingAssets.length === 0;

  return {
    success: overallSuccess,
    method,
    dryRun: isDryRun,
    totalAssets: scan.validAssets.length,
    uploaded: uploadedCount,
    failed: failedCount,
    durationMs,
    results,
    missing: scan.missingAssets,
    extra: scan.extraFiles,
  };
}

/**
 * Parses CLI command line arguments into an options dictionary.
 * @param {string[]} args 
 * @returns {object}
 */
export function parseArgs(args) {
  const options = {
    dir: 'dist_assets/plants/details',
    bucket: DEFAULT_BUCKET,
    concurrency: 4,
    dryRun: false,
    force: false,
    verbose: false,
    method: 'auto',
    json: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run' || arg === '-n') {
      options.dryRun = true;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--dir' || arg === '-d') {
      options.dir = args[++i];
    } else if (arg === '--bucket' || arg === '-b') {
      options.bucket = args[++i];
    } else if (arg === '--concurrency' || arg === '-c') {
      options.concurrency = parseInt(args[++i], 10) || 4;
    } else if (arg === '--method' || arg === '-m') {
      options.method = args[++i];
    }
  }

  return options;
}

export function printHelp() {
  console.log(`
${colors.bold}${colors.cyan}Cloudflare R2 Showroom Asset Upload Tool${colors.reset}

${colors.bold}USAGE:${colors.reset}
  node scripts/upload-r2.mjs [OPTIONS]

${colors.bold}OPTIONS:${colors.reset}
  --dir, -d <path>         Source directory (default: dist_assets/plants/details)
  --bucket, -b <name>      Target R2 bucket (default: mar-java-showroom)
  --concurrency, -c <n>    Parallel uploads (default: 4)
  --dry-run, -n            Simulate key mapping and MIME types without network transfer
  --force, -f              Overwrite existing objects
  --method, -m <engine>    Upload engine: 'auto', 'wrangler', 's3', 'api' (default: 'auto')
  --verbose, -v            Print detailed progress for each individual asset
  --json                   Output structured JSON results
  --help, -h               Display this help message

${colors.bold}EXAMPLES:${colors.reset}
  node scripts/upload-r2.mjs --dry-run --verbose
  node scripts/upload-r2.mjs --dir dist_assets --concurrency 8
  node scripts/upload-r2.mjs --method wrangler --force
`);
}

// Direct CLI execution guard
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  loadEnv(path.resolve(process.cwd(), '.env'));
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  (async () => {
    if (!options.json) {
      console.log(`\n${colors.bold}${colors.cyan}=== Cloudflare R2 Upload Tool ===${colors.reset}`);
      console.log(`  Source Directory : ${colors.yellow}${options.dir}${colors.reset}`);
      console.log(`  Target Bucket    : ${colors.yellow}${options.bucket}${colors.reset}`);
      console.log(`  Concurrency      : ${options.concurrency}`);
      console.log(`  Dry Run Mode     : ${options.dryRun ? `${colors.green}YES${colors.reset}` : 'NO'}`);
      console.log(`  Upload Method    : ${options.dryRun ? 'dry-run' : detectUploadMethod(options.method)}`);
      console.log('--------------------------------------------------');
    }

    const report = await uploadAssets(options);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = report.success ? 0 : 1;
      return;
    }

    console.log(`\n${colors.bold}=== Upload Summary ===${colors.reset}`);
    console.log(`  Total Processed : ${report.totalAssets} / 144 canonical assets`);
    console.log(`  Succeeded       : ${colors.green}${report.uploaded}${colors.reset}`);
    console.log(`  Failed          : ${report.failed > 0 ? `${colors.red}${report.failed}${colors.reset}` : '0'}`);
    console.log(`  Missing         : ${report.missing.length > 0 ? `${colors.red}${report.missing.length}${colors.reset}` : `${colors.green}0${colors.reset}`}`);
    console.log(`  Extra / Rogue   : ${report.extra.length > 0 ? `${colors.yellow}${report.extra.length}${colors.reset}` : '0'}`);
    console.log(`  Duration        : ${(report.durationMs / 1000).toFixed(2)}s\n`);

    if (report.missing.length > 0) {
      console.log(`${colors.red}${colors.bold}Missing Canonical Assets (${report.missing.length}):${colors.reset}`);
      for (const m of report.missing.slice(0, 10)) {
        console.log(`  - ${m.key} (${m.expectedContentType})`);
      }
      if (report.missing.length > 10) {
        console.log(`  ... and ${report.missing.length - 10} more`);
      }
      console.log();
    }

    if (report.extra.length > 0) {
      console.log(`${colors.yellow}Notice: Found ${report.extra.length} non-canonical extra files:${colors.reset}`);
      for (const x of report.extra.slice(0, 5)) {
        console.log(`  - ${x}`);
      }
      if (report.extra.length > 5) {
        console.log(`  ... and ${report.extra.length - 5} more`);
      }
      console.log();
    }

    if (report.success) {
      console.log(`${colors.green}${colors.bold}✓ SUCCESS:${colors.reset} All 144 normalized assets verified and processed.\n`);
      process.exitCode = 0;
    } else {
      console.log(`${colors.red}${colors.bold}✗ FAILED:${colors.reset} Upload or validation errors encountered.\n`);
      process.exitCode = 1;
    }
  })().catch((err) => {
    console.error(`\n${colors.red}${colors.bold}Fatal Error:${colors.reset}`, err.message);
    process.exitCode = 1;
  });
}
