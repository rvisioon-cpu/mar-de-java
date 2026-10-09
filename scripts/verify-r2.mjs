#!/usr/bin/env node
/**
 * scripts/verify-r2.mjs
 * 
 * Milestone 3: Cloudflare R2 Public CDN Verification Tool
 * 
 * Programmatically validates that all 144 normalized showroom assets are
 * accessible and correctly served via the public R2 CDN domain:
 * `https://pub-969e43023d6b439997d1d0718f6cf14e.r2.dev/plants/details/{assetId}/...`
 * 
 * Verification Criteria:
 *   1. HTTP Response status is 200 OK (or 206 Partial Content for byte-range checks)
 *   2. Response Header `content-type` matches canonical MIME (`image/webp` or `video/mp4`)
 *   3. Response Header `content-length` is an integer > 0
 * 
 * Exits:
 *   Code 0: 100% of all 144 assets passed
 *   Code 1: Any asset failed (missing, wrong MIME, 0-byte, network error)
 * 
 * CLI Usage:
 *   node scripts/verify-r2.mjs [--base-url <url>] [--concurrency <n>] [--retries <n>] [--timeout <ms>] [--get] [--verbose] [--json] [--help]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

export const DEFAULT_BASE_URL = 'https://pub-969e43023d6b439997d1d0718f6cf14e.r2.dev';

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
 * Builds the canonical list of 144 asset URLs to verify.
 * @param {string} baseUrl 
 * @returns {Array<{
 *   key: string,
 *   url: string,
 *   expectedContentType: string,
 *   type: 'base_view' | 'transition' | 'gallery',
 *   assetId: string
 * }>}
 */
export function getCanonicalVerifyList(baseUrl = DEFAULT_BASE_URL) {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const items = [];

  // 1. Base views (24)
  for (const typo of CANONICAL_TYPOLOGIES) {
    for (const view of CANONICAL_BASE_VIEWS) {
      const key = `plants/details/${typo}/${view}`;
      items.push({
        key,
        url: `${cleanBase}/${key}`,
        expectedContentType: 'image/webp',
        type: 'base_view',
        assetId: typo,
      });
    }
  }

  // 2. Transitions (48)
  for (const typo of CANONICAL_TYPOLOGIES) {
    for (const trans of CANONICAL_TRANSITIONS) {
      const key = `plants/details/${typo}/transitions/${trans}`;
      items.push({
        key,
        url: `${cleanBase}/${key}`,
        expectedContentType: 'video/mp4',
        type: 'transition',
        assetId: typo,
      });
    }
  }

  // 3. Galleries (72)
  for (const [folder, count] of Object.entries(CANONICAL_GALLERIES)) {
    for (let i = 1; i <= count; i++) {
      const key = `plants/details/${folder}/gallery/${i}.webp`;
      items.push({
        key,
        url: `${cleanBase}/${key}`,
        expectedContentType: 'image/webp',
        type: 'gallery',
        assetId: folder,
      });
    }
  }

  return items;
}

/**
 * Validates whether the returned Content-Type header matches the expected MIME.
 * Handles parameters like `charset=utf-8` or uppercase variations.
 * @param {string|null} actualHeader 
 * @param {string} expectedMime 
 * @returns {boolean}
 */
export function matchesContentType(actualHeader, expectedMime) {
  if (!actualHeader) return false;
  const lower = actualHeader.toLowerCase();
  const expectedLower = expectedMime.toLowerCase();
  return lower.startsWith(expectedLower) || lower.includes(expectedLower);
}

/**
 * Verifies a single asset URL against R2 public HTTP endpoint with retries and timeout.
 * @param {object} item 
 * @param {object} options 
 * @returns {Promise<object>}
 */
export async function verifyAssetUrl(item, options = {}) {
  const retries = typeof options.retries === 'number' ? options.retries : 2;
  const timeoutMs = options.timeout || 10000;
  const useGet = !!options.get;

  let attempt = 0;
  let lastError = null;

  const fetchImpl = options.fetchFn || globalThis.fetch;

  while (attempt <= retries) {
    attempt++;
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const method = useGet ? 'GET' : 'HEAD';
      const headers = {
        'User-Agent': 'MarJavaShowroomVerifier/1.0',
        'Accept': '*/*',
      };
      if (useGet) {
        headers['Range'] = 'bytes=0-1023'; // small byte range for efficient GET header inspection
      }

      let res = await fetchImpl(item.url, {
        method,
        headers,
        signal: controller.signal,
      });

      // If HEAD returned 405 Method Not Allowed, fallback to GET
      if (!useGet && res.status === 405) {
        res = await fetchImpl(item.url, {
          method: 'GET',
          headers: { ...headers, 'Range': 'bytes=0-1023' },
          signal: controller.signal,
        });
      }

      clearTimeout(timer);
      const latencyMs = Date.now() - start;

      const statusCode = res.status;
      const actualContentType = res.headers.get('content-type') || '';
      
      // Determine content-length (check content-length or content-range)
      let contentLength = parseInt(res.headers.get('content-length') || '0', 10);
      const contentRange = res.headers.get('content-range');
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match) {
          contentLength = parseInt(match[1], 10);
        }
      }

      // Check validation gates
      const statusOk = statusCode === 200 || statusCode === 206;
      const mimeOk = matchesContentType(actualContentType, item.expectedContentType);
      const lengthOk = contentLength > 0;

      const defects = [];
      if (!statusOk) defects.push(`Status HTTP ${statusCode} (expected 200/206)`);
      if (!mimeOk) defects.push(`MIME mismatch: expected '${item.expectedContentType}', got '${actualContentType}'`);
      if (!lengthOk) defects.push(`Content-Length is ${contentLength} (must be > 0)`);

      const pass = defects.length === 0;

      // Drain response body stream if GET was used
      try {
        await res.arrayBuffer();
      } catch (_) {}

      if (pass) {
        return {
          ...item,
          pass: true,
          statusCode,
          actualContentType,
          contentLength,
          latencyMs,
          error: null,
          attempts: attempt,
        };
      }

      // If failed due to client 4xx (e.g. 404, 403), don't waste time retrying unless 429
      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        return {
          ...item,
          pass: false,
          statusCode,
          actualContentType,
          contentLength,
          latencyMs,
          error: defects.join('; '),
          attempts: attempt,
        };
      }

      lastError = defects.join('; ');
    } catch (err) {
      lastError = err.name === 'AbortError' ? `Timeout after ${timeoutMs}ms` : err.message;
    }

    if (attempt <= retries) {
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, attempt * 300));
    }
  }

  return {
    ...item,
    pass: false,
    statusCode: 0,
    actualContentType: '',
    contentLength: 0,
    latencyMs: timeoutMs,
    error: lastError || 'Unknown verification failure',
    attempts: attempt,
  };
}

/**
 * Concurrency limiter pool.
 */
export async function runConcurrent(items, worker, concurrency = 8) {
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
 * Main coordinator function to verify all 128 canonical assets.
 * @param {object} options 
 * @returns {Promise<object>}
 */
export async function verifyAllAssets(options = {}) {
  const startTime = Date.now();
  const baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || DEFAULT_BASE_URL;
  const concurrency = parseInt(options.concurrency, 10) || 8;
  const isVerbose = !!options.verbose;

  const list = getCanonicalVerifyList(baseUrl);

  let passedCount = 0;
  let failedCount = 0;

  const results = await runConcurrent(list, async (item, idx) => {
    const res = await verifyAssetUrl(item, options);
    if (res.pass) {
      passedCount++;
    } else {
      failedCount++;
    }

    if (isVerbose) {
      const mark = res.pass ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
      const sizeStr = res.contentLength ? `${(res.contentLength / 1024).toFixed(1)} KB` : 'N/A';
      console.log(`  [${String(idx + 1).padStart(3, ' ')}/144] [${mark}] ${item.key} (${res.statusCode || 'ERR'}) ${sizeStr} - ${res.latencyMs}ms`);
      if (!res.pass && res.error) {
        console.log(`         ${colors.red}Reason:${colors.reset} ${res.error}`);
      }
    }

    return res;
  }, concurrency);

  const durationMs = Date.now() - startTime;
  const overallSuccess = passedCount === list.length && failedCount === 0;

  return {
    success: overallSuccess,
    baseUrl,
    total: list.length,
    passed: passedCount,
    failed: failedCount,
    durationMs,
    results,
  };
}

/**
 * Formats a clean ASCII summary table of verification results.
 * @param {Array<object>} results 
 */
export function printSummaryTable(results) {
  const headers = ['#', 'STATUS', 'TYPOLOGY', 'KEY', 'MIME', 'SIZE', 'LATENCY'];
  const colWidths = [4, 6, 8, 48, 12, 10, 8];

  function pad(str, len, align = 'left') {
    const s = String(str);
    if (s.length >= len) return s.substring(0, len);
    const spaces = ' '.repeat(len - s.length);
    return align === 'right' ? spaces + s : s + spaces;
  }

  const border = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';
  const headerRow = '| ' + headers.map((h, i) => pad(h, colWidths[i])).join(' | ') + ' |';

  console.log(border);
  console.log(headerRow);
  console.log(border);

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const statusText = r.pass ? 'PASS' : 'FAIL';
    const sizeText = r.contentLength > 0 ? `${(r.contentLength / 1024).toFixed(1)}K` : '0B';
    const latencyText = `${r.latencyMs}ms`;

    const row = [
      pad(i + 1, colWidths[0], 'right'),
      pad(statusText, colWidths[1]),
      pad(r.assetId, colWidths[2]),
      pad(r.key, colWidths[3]),
      pad(r.expectedContentType.replace('image/', 'img/').replace('video/', 'vid/'), colWidths[4]),
      pad(sizeText, colWidths[5], 'right'),
      pad(latencyText, colWidths[6], 'right'),
    ];

    const coloredStatus = r.pass ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    const formattedLine = `| ${row[0]} | ${pad(coloredStatus, colWidths[1] + (r.pass ? 9 : 9))} | ${row[2]} | ${row[3]} | ${row[4]} | ${row[5]} | ${row[6]} |`;
    console.log(formattedLine);
  }

  console.log(border);
}

/**
 * Creates a mock fetch function for offline testing and validation in sandboxed environments.
 * Simulates Cloudflare R2 CDN responses for canonical assets.
 * @param {string} baseUrl
 * @returns {Function}
 */
export function createMockFetch(baseUrl = DEFAULT_BASE_URL) {
  const list = getCanonicalVerifyList(baseUrl);
  return async function mockFetch(url, init = {}) {
    const cleanUrl = url.split('?')[0];
    const item = list.find(i => i.url === cleanUrl || i.key === cleanUrl.replace(/^https?:\/\/[^/]+\//, ''));
    if (!item) {
      return new Response('Not Found', {
        status: 404,
        headers: { 'content-type': 'text/plain', 'content-length': '9' },
      });
    }
    const sampleSize = item.expectedContentType === 'image/webp' ? 24500 : 380200;
    return new Response(new Uint8Array(item.expectedContentType === 'image/webp' ? 24 : 32), {
      status: 200,
      headers: {
        'content-type': item.expectedContentType,
        'content-length': String(sampleSize),
        'server': 'cloudflare',
      },
    });
  };
}

/**
 * Parses CLI arguments.
 * @param {string[]} args 
 * @returns {object}
 */
export function parseArgs(args) {
  const options = {
    baseUrl: null,
    concurrency: 8,
    retries: 2,
    timeout: 10000,
    get: false,
    mock: false,
    verbose: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--get') {
      options.get = true;
    } else if (arg === '--mock') {
      options.mock = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--base-url' || arg === '-u') {
      options.baseUrl = args[++i];
    } else if (arg === '--concurrency' || arg === '-c') {
      options.concurrency = parseInt(args[++i], 10) || 8;
    } else if (arg === '--retries' || arg === '-r') {
      options.retries = parseInt(args[++i], 10) || 0;
    } else if (arg === '--timeout' || arg === '-t') {
      options.timeout = parseInt(args[++i], 10) || 10000;
    }
  }

  return options;
}

export function printHelp() {
  console.log(`
${colors.bold}${colors.cyan}Cloudflare R2 Public CDN Verification Tool${colors.reset}

${colors.bold}USAGE:${colors.reset}
  node scripts/verify-r2.mjs [OPTIONS]

${colors.bold}OPTIONS:${colors.reset}
  --base-url, -u <url>    CDN base URL (default: https://pub-969e43023d6b439997d1d0718f6cf14e.r2.dev)
  --concurrency, -c <n>   Parallel HTTP requests (default: 8)
  --retries, -r <n>       Retry attempts on failed requests (default: 2)
  --timeout, -t <ms>      Request timeout in ms (default: 10000)
  --get                   Use GET with byte-range headers instead of HEAD
  --mock                  Simulate CDN responses for offline integration testing
  --verbose, -v           Print real-time verification status for each URL
  --json                  Output structured JSON results
  --help, -h              Display this help message

${colors.bold}EXIT CODES:${colors.reset}
  0: All 144 assets passed (HTTP 200, matching Content-Type, Content-Length > 0)
  1: Verification failure (any URL missing, defective, or inaccessible)
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
    const effectiveBaseUrl = options.baseUrl || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || DEFAULT_BASE_URL;
    if (options.mock) {
      options.fetchFn = createMockFetch(effectiveBaseUrl);
    }

    if (!options.json) {
      console.log(`\n${colors.bold}${colors.cyan}=== Cloudflare R2 Public CDN Verifier ===${colors.reset}`);
      console.log(`  Base URL     : ${colors.yellow}${effectiveBaseUrl}${colors.reset}`);
      console.log(`  Concurrency  : ${options.concurrency}`);
      console.log(`  Timeout      : ${options.timeout}ms (retries: ${options.retries})`);
      console.log(`  Mock Mode    : ${options.mock ? `${colors.green}ENABLED${colors.reset}` : 'DISABLED'}`);
      console.log(`  Target Assets: 144 canonical showroom assets`);
      console.log('--------------------------------------------------\n');
    }

    const report = await verifyAllAssets({ ...options, baseUrl: effectiveBaseUrl });

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = report.success ? 0 : 1;
      return;
    }

    // Print summary table if not verbose (or if verbose was quiet)
    if (!options.verbose) {
      printSummaryTable(report.results);
    }

    console.log(`\n${colors.bold}=== Verification Summary ===${colors.reset}`);
    console.log(`  Base URL : ${report.baseUrl}`);
    console.log(`  Total    : ${report.total} URLs`);
    console.log(`  Passed   : ${colors.green}${report.passed}${colors.reset}`);
    console.log(`  Failed   : ${report.failed > 0 ? `${colors.red}${report.failed}${colors.reset}` : '0'}`);
    console.log(`  Duration : ${(report.durationMs / 1000).toFixed(2)}s\n`);

    if (report.failed > 0) {
      console.log(`${colors.red}${colors.bold}Defective / Inaccessible URLs (${report.failed}):${colors.reset}`);
      const failures = report.results.filter(r => !r.pass);
      for (const f of failures.slice(0, 10)) {
        console.log(`  - ${f.key}`);
        console.log(`    URL    : ${f.url}`);
        console.log(`    Defect : ${colors.red}${f.error}${colors.reset}`);
      }
      if (failures.length > 10) {
        console.log(`  ... and ${failures.length - 10} more`);
      }
      console.log();
    }

    if (report.success) {
      console.log(`${colors.green}${colors.bold}✓ SUCCESS:${colors.reset} 100% of showroom assets (144/144) verified successfully on Cloudflare R2.\n`);
      process.exitCode = 0;
    } else {
      console.log(`${colors.red}${colors.bold}✗ FAILED:${colors.reset} ${report.failed} asset(s) failed verification.\n`);
      process.exitCode = 1;
    }
  })().catch((err) => {
    console.error(`\n${colors.red}${colors.bold}Fatal Error:${colors.reset}`, err.message);
    process.exitCode = 1;
  });
}
