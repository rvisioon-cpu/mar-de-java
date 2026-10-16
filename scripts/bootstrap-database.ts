/** Apply the existing migrations and add missing site content without resetting data. */
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getTableColumns } from 'drizzle-orm';
import { defaultFacesSeed } from '../src/data/buildingFacesSeed';
import { buildingFaces } from '../src/lib/db/schema';
import locations from '../src/data/mar_java_locations.json';
import features from '../src/data/features.json';

const args = process.argv.slice(2);
const remote = args.includes('--remote');
const local = args.includes('--local');
if (remote === local) throw new Error('Specify exactly one of --local or --remote.');
const persist = args.find(arg => arg.startsWith('--persist-to='))?.slice('--persist-to='.length);
if (remote && persist) throw new Error('--persist-to is only valid with --local.');
const target = [remote ? '--remote' : '--local', ...(persist ? ['--persist-to', persist] : [])];
function wrangler(args: string[]) {
  const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Wrangler failed.');
  return result.stdout;
}
const quote = (value: unknown): string => value == null ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
function insert(table: string, row: Record<string, unknown>) {
  return `INSERT OR IGNORE INTO ${table} (${Object.keys(row).map(key => `"${key}"`).join(',')}) VALUES (${Object.values(row).map(quote).join(',')});`;
}

// Verify access before attempting any mutation. Preserve an export before remote changes.
wrangler(['d1', 'execute', 'mar-java-db', ...target, '--command', "SELECT name FROM sqlite_master WHERE type='table'", '--json']);
if (remote) {
  mkdirSync('.wrangler/backups', { recursive: true, mode: 0o700 });
  const backup = `.wrangler/backups/before-bootstrap-${Date.now()}.sql`;
  wrangler(['d1', 'export', 'mar-java-db', '--remote', '--output', backup]);
  chmodSync(backup, 0o600);
  console.log(`Backup saved: ${backup}`);
}
console.log(wrangler(['d1', 'migrations', 'apply', 'mar-java-db', ...target]));

// The old seed begins with DELETE statements. Only its INSERTs are used here.
const sql = readFileSync('src/lib/db/seed.sql', 'utf8')
  .replace(/^\s*--.*$/gm, '')
  .split(';')
  .map(statement => statement.trim())
  .filter(statement => /^INSERT INTO /i.test(statement))
  .map(statement => statement.replace(/^INSERT INTO /i, 'INSERT OR IGNORE INTO ') + ';');
const columns = getTableColumns(buildingFaces);
for (const face of defaultFacesSeed) {
  sql.push(insert('building_faces', Object.fromEntries(Object.entries(face).map(([key, value]) => [columns[key as keyof typeof columns].name, value]))));
}
sql.push(insert('gallery_collections', { id: 'amenities', title: 'Amenidades', description: 'Conoce Mar de Java.', cover_image: 'amenities/1.webp', is_active: 1 }));
for (const feature of locations.features) {
  if (feature.properties.nombre === 'Mar de Java') continue;
  sql.push(insert('locations_poi', { id: feature.id, name: feature.properties.nombre, category: feature.properties.categoria || 'Otros', image_path: feature.properties.imagen || null, longitude: feature.geometry.coordinates[0], latitude: feature.geometry.coordinates[1], is_active: 1 }));
}
sql.push(insert('global_settings', { id: 'sidebar_features_list', config: JSON.stringify(features), updated_at: Math.floor(Date.now() / 1000) }));
const temporary = mkdtempSync(join(tmpdir(), 'mar-java-bootstrap-'));
try {
  const file = join(temporary, 'content.sql');
  writeFileSync(file, sql.join('\n'), { mode: 0o600 });
  wrangler(['d1', 'execute', 'mar-java-db', ...target, '--file', file, '--yes']);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
const checks = JSON.parse(wrangler(['d1', 'execute', 'mar-java-db', ...target, '--command', `
SELECT 'floors' AS entity, COUNT(*) AS total FROM floors;
SELECT 'units' AS entity, COUNT(*) AS total FROM units;
SELECT 'tours' AS entity, COUNT(*) AS total FROM tours;
SELECT 'media' AS entity, COUNT(*) AS total FROM media;
SELECT 'building_faces' AS entity, COUNT(*) AS total FROM building_faces;
SELECT 'gallery_collections' AS entity, COUNT(*) AS total FROM gallery_collections;
SELECT 'locations_poi' AS entity, COUNT(*) AS total FROM locations_poi;
PRAGMA foreign_key_check;`, '--json']));
if (checks.at(-1).results.length) throw new Error('Foreign key validation failed. Inspect the database before deploying.');
for (const check of checks.slice(0, -1)) {
  const { entity, total } = check.results[0];
  if (total < 1) throw new Error(`Missing initial content in ${entity}.`);
  console.log(`${entity}: ${total}`);
}
console.log('Database initialized; foreign key validation passed.');
