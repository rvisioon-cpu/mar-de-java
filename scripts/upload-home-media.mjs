import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';

const keys = [
  'videos/video_portada.mp4',
  'videos/video_general.mp4',
  'homepage/intro.webp',
  ...Array.from({ length: 14 }, (_, index) => `amenities/${index + 1}.webp`),
];
const dryRun = process.argv.includes('--dry-run');
const accountId = process.argv.find(arg => arg.startsWith('--account-id='))?.split('=')[1];
if (!dryRun && !/^[a-f0-9]{32}$/.test(accountId || '')) {
  throw new Error('Specify the verified target account with --account-id=<id>.');
}
// Validate every source before starting any upload.
for (const key of keys) {
  if (!statSync(join('public', key)).size) throw new Error(`Empty media: ${key}`);
}
for (const key of keys) {
  console.log(`${dryRun ? '[dry-run] ' : ''}mar-java-showroom/${key}`);
  if (dryRun) continue;
  const result = spawnSync(process.execPath, [
    'node_modules/wrangler/bin/wrangler.js', 'r2', 'object', 'put',
    `mar-java-showroom/${key}`, '--remote', '--file', join('public', key),
    '--content-type', key.endsWith('.mp4') ? 'video/mp4' : 'image/webp',
    '--cache-control', 'public, max-age=3600, must-revalidate',
  ], { stdio: 'inherit', env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId } });
  if (result.status !== 0) throw new Error(`R2 upload failed: ${key}`);
}
console.log(`${keys.length} media files ${dryRun ? 'validated' : 'uploaded to R2'}.`);
