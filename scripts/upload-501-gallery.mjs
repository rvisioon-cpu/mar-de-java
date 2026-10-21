import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const entries = JSON.parse(readFileSync('docs/typology-audit-2026-10-20/gallery-501-repair.json', 'utf8'));
const dryRun = process.argv.includes('--dry-run');
const accountId = process.argv.find(arg => arg.startsWith('--account-id='))?.split('=')[1];
if (!dryRun && !/^[a-f0-9]{32}$/.test(accountId || '')) {
  throw new Error('Specify the verified target account with --account-id=<id>.');
}
if (entries.length !== 12 || new Set(entries.map(entry => entry.key)).size !== 12) {
  throw new Error('Expected exactly 12 distinct gallery images.');
}
// Validate every source before uploading; only the reviewed gallery can be published.
for (const entry of entries) {
  if (!/^plants\/details\/501\/gallery\/\d+_[a-f0-9]{12}\.webp$/.test(entry.key)) {
    throw new Error(`Unexpected gallery key: ${entry.key}`);
  }
  const data = readFileSync(join('public', entry.key));
  if (data.length !== entry.bytes || createHash('sha256').update(data).digest('hex') !== entry.sha256) {
    throw new Error(`Source does not match reviewed image: ${entry.key}`);
  }
}
for (const entry of entries) {
  console.log(`${dryRun ? '[dry-run] ' : ''}mar-java-showroom/${entry.key}`);
  if (dryRun) continue;
  const result = spawnSync(process.execPath, [
    'node_modules/wrangler/bin/wrangler.js', 'r2', 'object', 'put',
    `mar-java-showroom/${entry.key}`, '--remote', '--file', join('public', entry.key),
    '--content-type', 'image/webp', '--cache-control', 'public, max-age=31536000, immutable',
  ], { stdio: 'inherit', env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId } });
  if (result.status !== 0) throw new Error(`R2 upload failed: ${entry.key}`);
}
console.log(`12 gallery images ${dryRun ? 'validated' : 'uploaded'}.`);
