/** Password is read from stdin; never pass it in command arguments or commit it. */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';

const args = process.argv.slice(2);
const remote = args.includes('--remote');
if (remote === args.includes('--local')) throw new Error('Specify exactly one of --local or --remote.');
const email = args.find(arg => arg.startsWith('--email='))?.slice(8).trim().toLowerCase() || 'admin@mar-de-java.invalid';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid administrator email.');
const persist = args.find(arg => arg.startsWith('--persist-to='))?.slice('--persist-to='.length);
if (remote && persist) throw new Error('--persist-to is only valid with --local.');
const target = [remote ? '--remote' : '--local', ...(persist ? ['--persist-to', persist] : [])];
function execute(sql, query = false) {
  const temporary = mkdtempSync(join(tmpdir(), 'mar-java-admin-'));
  try {
    const file = join(temporary, 'admin.sql');
    writeFileSync(file, sql, { mode: 0o600 });
    const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'mar-java-db', ...target, ...(query ? ['--command', sql] : ['--file', file]), '--json', '--yes'], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error('Administrator operation failed; check database access and migrations.');
    return query ? JSON.parse(result.stdout) : undefined;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
const quote = value => `'${value.replaceAll("'", "''")}'`;
const existing = execute(`SELECT id FROM users WHERE lower(name) = 'admin' OR lower(email) = ${quote(email)};`, true);
if (existing[0].results.length) throw new Error('Admin already exists. No existing account or password was changed.');
if (process.stdin.isTTY) throw new Error('Provide the password through protected stdin, not a command argument.');
const password = readFileSync(0, 'utf8').replace(/\r?\n$/, '');
if (password.length < 12) throw new Error('The password must contain at least 12 characters.');
const now = Math.floor(Date.now() / 1000);
// The full site configuration is restricted to SUPER_ADMIN by the application.
execute(`INSERT INTO users (id, name, email, password, role, admin_limit, created_at, updated_at)
VALUES (${quote(randomUUID())}, 'Admin', ${quote(email)}, ${quote(await hash(password, 12))}, 'SUPER_ADMIN', 0, ${now}, ${now});`);
console.log('Admin created with full dashboard access. Sign in with Admin or the configured email.');
