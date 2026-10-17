import {test} from 'node:test';
import assert from 'node:assert/strict';
import {serveR2Media} from '../scripts/worker/r2-media.mjs';

function fixture(policy='public, max-age=3600') {
 const bytes=new TextEncoder().encode('0123456789abcdefghijklmnopqrstuv');
 const stored=new Map();let reads=0;const pending=[];
 const original=globalThis.caches;
 globalThis.caches={default:{async match(req){return stored.get(req.url)?.clone()},async put(req,res){assert.equal(res.status,200);stored.set(req.url,new Response(await res.arrayBuffer(),res))}}};
 const head={size:bytes.length,httpEtag:'"test-v1"',uploaded:new Date('2026-10-17T00:00:00Z'),writeHttpMetadata(h){h.set('content-type','video/mp4');h.set('cache-control',policy)}};
 const env={R2:{async head(){reads++;return head},async get(key,options){reads++;const r=options?.range;return {body:r?bytes.slice(r.offset,r.offset+r.length):bytes}}}};
 const ctx={waitUntil(p){pending.push(p)}};
 return {bytes,stored,get reads(){return reads},restore(){globalThis.caches=original},async request(headers={},method='GET',path='building/videos/0.1.mp4'){const r=await serveR2Media(new Request('https://example.com/api/r2/'+path,{headers,method}),env,ctx);await Promise.all(pending);return r}};
}

test('full bodies hit cache, preserve validators, HEAD has no body',async()=>{
 const f=fixture();try {
  const first=await f.request();assert.equal(first.headers.get('x-media-cache'),'MISS');assert.deepEqual(new Uint8Array(await first.arrayBuffer()),f.bytes);
  const reads=f.reads;const second=await f.request();assert.equal(second.headers.get('x-media-cache'),'HIT');assert.equal(second.headers.get('etag'),'"test-v1"');assert.equal(f.reads,reads);
  assert.equal((await f.request({'if-none-match':'"test-v1"'})).status,304);
  assert.equal(await (await f.request({},'HEAD')).text(),'');
 }finally{f.restore()}
});
test('segments hit independently and never poison full files or other ranges',async()=>{
 const f=fixture();try{
  const first=await f.request({range:'bytes=2-5'});assert.equal(first.status,206);assert.equal(await first.text(),'2345');assert.equal(first.headers.get('content-range'),'bytes 2-5/32');
  const reads=f.reads;const hit=await f.request({range:'bytes=2-5'});assert.equal(hit.status,206);assert.equal(hit.headers.get('x-media-cache'),'HIT');assert.equal(await hit.text(),'2345');assert.equal(f.reads,reads);
  assert.equal(await (await f.request({range:'bytes=-3'})).text(),'tuv');
  assert.equal(await (await f.request({range:'bytes=20-'})).text(),'klmnopqrstuv');
  const full=await f.request();assert.equal(full.status,200);assert.equal(await full.text(),'0123456789abcdefghijklmnopqrstuv');
  const different=await f.request({range:'bytes=6-8'});assert.equal(await different.text(),'678');
  assert.equal((await f.request({range:'bytes=99-100'})).status,416);
  assert.equal((await f.request({range:'bytes=-0'})).status,416);
  const changed=await f.request({range:'bytes=2-5','if-range':'"older"'});assert.equal(changed.status,200);assert.equal((await changed.text()).length,32);
 }finally{f.restore()}
});
test('private policies, requests outside public media and writes bypass cache',async()=>{
 const f=fixture('private, no-store');try{
  await f.request();await f.request();assert.equal(f.stored.size,0);
  assert.equal(await f.request({},'POST'),null);
  assert.equal(await f.request({},'GET','private/customer.png'),null);
 }finally{f.restore()}
});
