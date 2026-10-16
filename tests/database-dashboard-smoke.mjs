import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// Run against the isolated Wrangler runtime after db:bootstrap and db:admin.
const base = process.env.TEST_BASE_URL || 'http://localhost:8789';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('This smoke test is for local databases only.');
const password = readFileSync(0, 'utf8').trimEnd();
let cookies = new Map();
async function request(path, options = {}) {
  const r = await fetch(base + path, { ...options, redirect: 'manual', headers: { cookie: [...cookies.entries()].map(([key,value]) => `${key}=${value}`).join('; '), ...options.headers } });
  for (const cookie of r.headers.getSetCookie()) {
    const pair = cookie.split(';')[0]; const equal = pair.indexOf('=');
    cookies.set(pair.slice(0,equal), pair.slice(equal + 1));
  }
  return r;
}
async function login(identifier, value) {
  const csrf = await (await request('/api/auth/csrf')).json();
  const r = await request('/api/auth/callback/credentials', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: identifier, password: value, callbackUrl: base + '/dashboard' }) });
  return (await r.json()).url;
}
assert.equal((await request('/dashboard')).status,307);
assert.match(await login('Admin','invalid-test-password'), /CredentialsSignin/);
assert.equal((await (await request('/api/auth/session')).json())?.user,undefined);
assert.doesNotMatch(await login('  aDmIn  ',password), /error=/);
const session = await (await request('/api/auth/session')).json();
assert.equal(session.user.name, 'Admin');
assert.equal(session.user.role, 'SUPER_ADMIN');
console.log('PASS: anonymous dashboard blocked, wrong password rejected, normalized Admin login and session accepted.');
for (const path of ['/dashboard','/dashboard/users','/dashboard/units','/dashboard/calendar','/dashboard/content','/dashboard/media','/dashboard/galleries','/dashboard/brochure','/dashboard/progress','/dashboard/identity','/dashboard/features','/dashboard/map','/dashboard/building','/dashboard/tours','/dashboard/video-amenities','/dashboard/maqueta','/dashboard/logs','/','/showroom','/plantas/6','/unidad/unit_1_101','/galeria','/recorridos','/ubicacion','/video','/avance-de-obra']) {
 const r = await request(path); const html=await r.text();
 assert.equal(r.status,200,`${path}: status ${r.status}`);
 assert.doesNotMatch(html,/NEXT_HTTP_ERROR_FALLBACK;500|An error occurred in the Server Components render|"digest":"\d+"/,`${path}: streamed server error`);
 console.log('PASS',path);
}
cookies.clear();
assert.doesNotMatch(await login('ADMIN@MAR-DE-JAVA.INVALID',password),/error=/);
console.log('PASS: email login remains supported.');
