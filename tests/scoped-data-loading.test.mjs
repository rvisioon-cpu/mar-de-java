import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(file, dependencies){
 const module={exports:{}};
 vm.runInNewContext(ts.transpile(fs.readFileSync(file,'utf8'),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}),{module,exports:module.exports,URL,require:name=>{if(name in dependencies)return dependencies[name];throw new Error('Unexpected import '+name)},console});
 return module.exports;
}

test('floor reads start alongside authentication and retain role filtering',async()=>{
 for(const role of [null,'SELLER','SUPER_ADMIN']){
  let resolveSession;const session=new Promise(resolve=>{resolveSession=resolve});let batchStarted=false;
  const floors={deletedAt:'floor_deleted',level:'level'}, units={deletedAt:'unit_deleted',identifier:'identifier'};
  const common={floorId:'floor_1',id:'unit_1_common',identifier:'COMMON',state:'COMMON_AREA'};
  const sold={floorId:'floor_1',id:'unit_1_101',identifier:'101',state:'SOLD',areaSqm:110};
  const db={select(){return {from(table){return {where(){return {orderBy(){return {table}}}}}}}},async batch(queries){batchStarted=true;assert.equal(queries.length,2);assert.equal(queries[0].table,floors);assert.equal(queries[1].table,units);return [[{id:'floor_1',name:'Planta 1',level:1,imagePath:'plants/floor_1.webp'}],[sold,common]]}};
  const actions=load('src/app/actions/units.ts',{'react':{cache:fn=>fn},'@/lib/db':{getDb:async()=>db},'@/lib/db/schema':{floors,units,logs:{}},'drizzle-orm':{isNull:value=>value},'next/cache':{},'@/auth':{auth:()=>session},'@/data/floors':{floorsData:[]}});
  const resultPromise=actions.getFloorsData();await new Promise(resolve=>setImmediate(resolve));assert.ok(batchStarted,'DB reads must not wait for the session');
  resolveSession(role?{user:{role}}:null);const result=await resultPromise;
  assert.equal(result[0].id,'1');assert.equal(result[0].units.length,role==='SUPER_ADMIN'?2:1);assert.equal(result[0].units[0].status,'sold');assert.equal(result[0].units[0].dimensions,110);
 }
});

test('middleware only matches dashboard and login, keeping dashboard redirects',()=>{
 const {NextResponse}=require('next/server');const {unstable_doesMiddlewareMatch}=require('next/experimental/testing/server');
 const middleware=load('src/middleware.ts',{'@/auth':{auth:fn=>fn},'next/server':{NextResponse}});
 for(const path of ['/','/showroom','/plantas/6','/contact','/identity/logo.png','/_next/static/test.js','/api/auth/session'])assert.equal(unstable_doesMiddlewareMatch({config:middleware.config,url:'https://example.com'+path}),false,path);
 for(const path of ['/dashboard','/dashboard/units','/login'])assert.equal(unstable_doesMiddlewareMatch({config:middleware.config,url:'https://example.com'+path}),true,path);
 const denied=middleware.default({auth:null,nextUrl:new URL('https://example.com/dashboard/units')});assert.equal(denied.status,307);assert.equal(new URL(denied.headers.get('location')).pathname,'/login');
 const login=middleware.default({auth:{user:{name:'Admin'}},nextUrl:new URL('https://example.com/login')});assert.equal(new URL(login.headers.get('location')).pathname,'/dashboard');
});
