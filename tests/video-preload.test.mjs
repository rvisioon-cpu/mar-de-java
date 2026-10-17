import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

test('video preloads share a URL, expire, cancel stalled loads and bound buffers',async()=>{
 const originals={document:globalThis.document,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const timers=new Map();let id=0;const videos=[];const players=[];
 globalThis.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id};
 globalThis.clearTimeout=i=>timers.delete(i);
 globalThis.document={baseURI:'https://example.com/',querySelectorAll(){return players},createElement(){const video={load(){this.loads=(this.loads||0)+1},pause(){},removeAttribute(){this.src=''}};videos.push(video);return video}};
 try{
  const js=ts.transpile(fs.readFileSync('src/utils/preload.ts','utf8'),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022});
  const {preloadVideo}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
  players.push({currentSrc:'https://example.com/playing.mp4',readyState:4});
  await preloadVideo('/playing.mp4');assert.equal(videos.length,0);players.length=0;
  const first=preloadVideo('/clip.mp4');const duplicate=preloadVideo('https://example.com/clip.mp4');assert.equal(first,duplicate);assert.equal(videos.length,1);
  videos[0].oncanplay();await first;assert.equal(preloadVideo('/clip.mp4'),first);
  const expiry=[...timers.values()].find(t=>t.ms===60000);expiry.fn();assert.equal(videos[0].src,'');
  const retry=preloadVideo('/clip.mp4');assert.equal(videos.length,2);
  videos[1].onerror();await retry;assert.equal(videos[1].src,'');assert.equal(preloadVideo('/clip.mp4'),retry);
  [...timers.values()].find(t=>t.ms===5000).fn();
  const stalled=preloadVideo('/stalled.mp4');[...timers.values()].find(t=>t.ms===6000).fn();await stalled;assert.equal(videos.at(-1).src,'');
  for(let n=0;n<12;n++)preloadVideo('/'+n+'.mp4');
  assert.ok(videos.filter(v=>v.src).length<=8);
 }finally{Object.assign(globalThis,originals)}
});
