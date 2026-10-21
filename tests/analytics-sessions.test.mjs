import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);

function load(file, deps, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpile(fs.readFileSync(file, 'utf8'), {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  }), { module, exports: module.exports, console, crypto: { randomUUID }, Date, ...globals,
    require: name => name in deps ? deps[name] : require(name) });
  return module.exports;
}
const policy = load('src/lib/analytics/policy.ts', {});
function setup() {
  let now = Date.now();
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const sqlite = new DatabaseSync(':memory:');
  for (const name of fs.readdirSync('drizzle').filter(n => n.endsWith('.sql')).sort()) sqlite.exec(fs.readFileSync('drizzle/' + name, 'utf8'));
  sqlite.exec(fs.readFileSync('seed.sql', 'utf8'));
  const schema = load('src/lib/db/schema.ts', {}, { Date: Clock });
  const execute = async (sql, params, method) => {
    const stmt = sqlite.prepare(sql);
    if (method === 'run') { stmt.run(...params); return { rows: [] }; }
    const rows = stmt.all(...params).map(row => Object.values(row));
    return { rows: method === 'get' ? rows[0] : rows };
  };
  const db = require('drizzle-orm/sqlite-proxy').drizzle(execute, async batch => {
    sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const query of batch) results.push(await execute(query.sql, query.params, query.method));
      sqlite.exec('COMMIT'); return results;
    } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  }, { schema });
  const actions = load('src/app/actions/analytics.ts', {
    '@/lib/db': { getDb: async () => db }, '@/lib/db/schema': schema,
    '@/auth': { auth: async () => ({ user: { role: 'SUPER_ADMIN' } }) },
    '@/lib/analytics/policy': policy,
  }, { Date: Clock });
  return { ...actions, sqlite, advance: milliseconds => { now += milliseconds; },
    count: table => sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n };
}

test('several pages, reloads and return visits in one browser count as one session', async () => {
  const app = setup();
  const first = await app.trackPageView('/', 'mobile', undefined, randomUUID());
  assert.equal(first.success, true);
  for (const path of ['/showroom', '/plantas/1', '/unidad/unit_1_101', '/', '/']) {
    app.advance(60_000);
    const next = await app.trackPageView(path, 'mobile', first.sessionId, randomUUID());
    assert.equal(next.sessionId, first.sessionId);
  }
  assert.equal(app.count('analytics_sessions'), 1);
  assert.equal(app.count('page_views'), 6);
  const stats = await app.getDashboardStats({ timeRange: 'day' });
  assert.equal(stats.success, true);
  assert.equal(stats.data.totalVisits, 1);
  assert.equal(stats.data.devices.total, 1);
  assert.equal(stats.data.viewsSeries.reduce((sum, count) => sum + count, 0), 1);
  assert.equal(stats.data.popularUnits[0].views, 1);
  assert.equal(stats.data.popularUnits[0].avgDuration, 0, 'missing measurements never produce simulated times');
  app.sqlite.close();
});

test('activity extends a session and 30 minutes of inactivity starts a new one', async () => {
  const app = setup();
  const first = await app.trackPageView('/', 'desktop');
  app.advance(29 * 60_000);
  const continued = await app.trackPageView('/showroom', 'desktop', first.sessionId);
  assert.equal(continued.sessionId, first.sessionId);
  app.advance(29 * 60_000);
  assert.equal((await app.trackPageView('/plantas/1', 'desktop', first.sessionId)).sessionId, first.sessionId);
  app.advance(30 * 60_000);
  const expired = await app.trackPageView('/', 'desktop', first.sessionId);
  assert.notEqual(expired.sessionId, first.sessionId);
  assert.equal(app.count('analytics_sessions'), 2);
  const separateBrowser = await app.trackPageView('/', 'desktop');
  assert.notEqual(separateBrowser.sessionId, expired.sessionId);
  assert.equal(app.count('analytics_sessions'), 3);
  app.sqlite.close();
});

test('replaying one event is idempotent, even with no cookie or after expiry', async () => {
  const app = setup(); const event = randomUUID();
  const first = await app.trackPageView('/', 'desktop', undefined, event);
  app.advance(31 * 60_000);
  const retry = await app.trackPageView('/', 'desktop', undefined, event);
  assert.equal(retry.sessionId, first.sessionId);
  assert.equal(app.count('analytics_sessions'), 1);
  assert.equal(app.count('page_views'), 1);
  app.sqlite.close();
});

test('invalid/admin paths and nonexistent departments do not create any visits', async () => {
  const app = setup();
  for (const path of ['/dashboard', '/login', '/api/foo', '//other.test', '/unknown', '/unidad/missing']) {
    assert.equal((await app.trackPageView(path, 'desktop')).success, false, path);
  }
  assert.equal(app.count('analytics_sessions'), 0);
  assert.equal(app.count('page_views'), 0);
  app.sqlite.close();
});

test('repeated duration updates never add or reduce time and missing time stays zero', async () => {
  const app = setup(); const view = await app.trackPageView('/', 'desktop');
  await app.updatePageViewDuration(view.pageViewId, 12);
  await app.updatePageViewDuration(view.pageViewId, 12);
  await app.updatePageViewDuration(view.pageViewId, 5);
  assert.equal(app.sqlite.prepare('SELECT duration FROM page_views').get().duration, 12);
  assert.equal(policy.measuredDuration(null), 0);
  assert.equal(policy.measuredDuration(0), 0);
  app.sqlite.close();
});

function client(fetch) {
  let now = 0; let pathname = '/'; const effects = []; const beacons = [];
  class Clock extends Date { static now() { return now; } }
  const listeners = new Map();
  const tracker = load('src/components/AnalyticsTracker.tsx', {
    react: { useEffect: effect => effects.push(effect) },
    'next/navigation': { usePathname: () => pathname }, '@/lib/analytics/policy': policy,
  }, { Date: Clock, Blob, fetch, window: { innerWidth: 1200,
    addEventListener: (event, fn) => listeners.set(event, fn),
    removeEventListener: (event, fn) => { if (listeners.get(event) === fn) listeners.delete(event); },
  }, navigator: { sendBeacon: (url, body) => { beacons.push({ url, body }); return true; } } });
  return { mount(path = '/') { pathname = path; tracker.default(); return effects.pop()(); },
    beacons, listeners, advance: ms => { now += ms; } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('StrictMode setup/cleanup does not duplicate the first hit; pagehide and cleanup send duration once', async () => {
  const hits = [];
  const app = client(async (url, input) => {
    const body = JSON.parse(input.body); hits.push(body);
    return { json: async () => ({ success: true, pageViewId: body.pageViewId }) };
  });
  app.mount()(); // React development StrictMode's first setup/cleanup.
  const cleanup = app.mount();
  await flush();
  assert.equal(hits.length, 1);
  app.advance(5_000); app.listeners.get('pagehide')(); cleanup();
  assert.equal(app.beacons.length, 1);
  assert.equal(JSON.parse(await app.beacons[0].body.text()).duration, 5);
});

test('fast navigation serializes registration and a late reply keeps the original page duration', async () => {
  const hits = []; let release;
  const app = client(async (url, input) => {
    const body = JSON.parse(input.body); hits.push(body);
    if (hits.length === 1) await new Promise(resolve => { release = resolve; });
    return { json: async () => ({ success: true, pageViewId: body.pageViewId }) };
  });
  const closeFirst = app.mount('/'); await flush();
  app.advance(5_000); closeFirst();
  const closeSecond = app.mount('/showroom'); await flush();
  assert.equal(hits.length, 1, 'second page waits for the first session cookie');
  release(); await flush();
  assert.equal(hits.length, 2);
  app.advance(2_000); closeSecond();
  const durations = await Promise.all(app.beacons.map(async ({ body }) => JSON.parse(await body.text())));
  assert.equal(durations.length, 2);
  assert.equal(durations[0].id, hits[0].pageViewId);
  assert.equal(durations[0].duration, 5);
  assert.equal(durations[1].id, hits[1].pageViewId);
  assert.equal(durations[1].duration, 2);
});

test('hit endpoint uses a rolling HttpOnly cookie and rejects invalid public events', async () => {
  const { NextResponse } = require('next/server');
  const sessionId = randomUUID(); const calls = [];
  const route = load('src/app/api/analytics/hit/route.ts', {
    'next/server': { NextResponse }, 'next/headers': { cookies: async () => ({ get: () => ({ value: sessionId }) }) },
    '@/lib/analytics/policy': policy,
    '@/app/actions/analytics': { trackPageView: async (...args) => {
      calls.push(args); return { success: true, sessionId, pageViewId: args[3] };
    } },
  }, { URL });
  const id = randomUUID();
  const response = await route.POST(new Request('https://example.com/api/analytics/hit', {
    method: 'POST', body: JSON.stringify({ path: '/', deviceType: 'mobile', pageViewId: id }),
  }));
  assert.equal(response.status, 200);
  assert.equal(calls[0][2], sessionId);
  assert.equal(calls[0][3], id);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /Max-Age=1800/i); assert.match(cookie, /HttpOnly/i); assert.match(cookie, /Secure/i);
  const rejected = await route.POST(new Request('https://example.com/api/analytics/hit', {
    method: 'POST', body: JSON.stringify({ path: '/dashboard' }),
  }));
  assert.equal(rejected.status, 400);
  assert.equal(calls.length, 1);
});
