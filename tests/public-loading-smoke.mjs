import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL || 'http://localhost:8789';
for(const path of ['/','/contact','/politica-de-privacidad','/ubicacion','/showroom','/plantas/6','/unidad/unit_1_101','/dashboard','/login']){
 const res=await fetch(new URL(path,base),{redirect:'manual'});const html=await res.text();
 assert.equal(res.status,path==='/dashboard'?307:200,path);
 assert.ok(!html.includes('An error occurred in the Server Components render'),path+' render error');
 assert.ok(!html.includes('api.mapbox.com/mapbox-gl-js/'),path+' global external map stylesheet');
 if(!['/dashboard','/login'].includes(path))assert.ok(!res.headers.getSetCookie().some(cookie=>/authjs|next-auth/.test(cookie)),path+' authentication cookies');
 if(['/', '/contact', '/politica-de-privacidad','/ubicacion'].includes(path)){
  assert.ok(!html.includes('initialFloorsData'),path+' unnecessary inventory payload');
  assert.ok(!html.includes('initialBuildingFacesData'),path+' unnecessary building payload');
 }
 if(path==='/'){
  const styles=[...html.matchAll(/href="([^\"]+\.css)"/g)].map(m=>m[1]);
  for(const style of styles){const css=await(await fetch(new URL(style,base))).text();assert.ok(!css.includes('.mapboxgl-canvas')&&!css.includes('.maplibregl-canvas'),'map engine CSS on homepage');}
 }
 console.log('PASS',path,res.status,Buffer.byteLength(html),'bytes');
}
