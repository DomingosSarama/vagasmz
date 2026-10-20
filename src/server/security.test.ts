import http from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApplication } from '../../server.ts';
import { readRuntimeConfig } from './runtime.ts';
async function serve(options:Parameters<typeof createApplication>[0]={}) {
  const app=await createApplication({production:true,runtime:readRuntimeConfig({}),sync:async()=>({syncedAt:new Date().toISOString(),jobs:[],sourceReports:[]}),...options});
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  return {base,close:()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))};
}
test('API sends safe headers and blocks cross-origin, cross-site and unrecognised hosts',async()=>{
  const s=await serve();try {
    const ok=await fetch(`${s.base}/api/sources/sync`);
    assert.equal(ok.status,200);assert.equal(ok.headers.get('x-powered-by'),null);assert.equal(ok.headers.get('cache-control'),'no-store');assert.equal(ok.headers.get('x-content-type-options'),'nosniff');assert.ok(ok.headers.get('content-security-policy')?.includes("object-src 'none'"));
    for(const headers of [{Origin:'https://attacker.example'},{'Sec-Fetch-Site':'cross-site'}] as Record<string,string>[]) assert.equal((await fetch(`${s.base}/api/sources/sync`,{headers})).status,403,JSON.stringify(headers));
    const hostStatus=await new Promise<number>(resolve=>{http.get(`${s.base}/api/sources/sync`,{headers:{Host:'attacker.example'}},r=>{r.resume();resolve(r.statusCode!);});});
    assert.equal(hostStatus,403);
    assert.equal((await fetch(`${s.base}/api/sources/sync`,{headers:{Origin:s.base}})).status,200);
  }finally{await s.close();}
});
test('bad JSON, oversize bodies and unsupported media return generic errors without internal details',async()=>{
  const s=await serve();try {
    for(const [body,type,status] of [['{broken','application/json',400],['"'+ 'x'.repeat(270000)+'"','application/json',413],['x','text/plain',415]] as const) {
      const response=await fetch(`${s.base}/api/jobs/validate-import`,{method:'POST',headers:{'Content-Type':type},body});
      assert.equal(response.status,status);const value=await response.text();assert.ok(!/SyntaxError|node_modules|server.ts|stack|DELL1|broken/.test(value));
    }
  }finally{await s.close();}
});
test('manual import rejects object injection and preserves unknown facts with unverified provenance',async()=>{
  const s=await serve();try {
    const post=(body:any)=>fetch(`${s.base}/api/jobs/validate-import`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const base={title:'Analista',company:'Entidade de teste',canonicalUrl:'https://example.com/vaga'};
    assert.equal((await post({...base,title:{danger:'x'}})).status,400);
    const response=await post(base);assert.equal(response.status,200);const {job}=await response.json();assert.equal(job.province,'Não informado');assert.equal(job.workMode,'Não informado');assert.equal(job.provenance,'manual_unverified');assert.equal(job.sources[0].isOfficialCareerPage,false);
    const second=await (await post(base)).json();assert.notEqual(job.id,second.job.id);
  }finally{await s.close();}
});
test('unexpected sync failures do not expose paths, secrets or stacks',async()=>{
  const s=await serve({sync:async()=>{throw new Error('SECRET C:/private/server.ts');}});try {
    const res=await fetch(`${s.base}/api/sources/sync`);assert.equal(res.status,500);assert.ok(!/SECRET|private|server.ts/.test(await res.text()));
  }finally{await s.close();}
});
test('metadata extraction never fetches unauthorised URLs and safely handles source failure',async()=>{
  let calls=0;
  const s=await serve({fetchSource:async()=>{calls++;throw new Error('source details');}});try {
    const post=(url:any)=>fetch(`${s.base}/api/jobs/extract-url`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
    for(const value of ['http://127.0.0.1','https://attacker.example',{}]) assert.equal((await post(value)).status,400);
    assert.equal(calls,0);const res=await post('https://emprego.mmo.co.mz/vaga');assert.equal(res.status,422);assert.equal(calls,1);assert.ok(!(await res.text()).includes('source details'));
  }finally{await s.close();}
});
test('rate limit returns retry guidance',async()=>{
  const s=await serve({rateLimit:2});try {
    await fetch(`${s.base}/api/sources/sync`);await fetch(`${s.base}/api/sources/sync`);
    const res=await fetch(`${s.base}/api/sources/sync`);assert.equal(res.status,429);assert.equal(res.headers.get('retry-after'),'60');
  }finally{await s.close();}
});
test('production does not expose source files, source maps, git, settings or dependency manifests',async()=>{
  const s=await serve();try {
    for(const path of ['/.env','/.git/config','/src/App.tsx','/server.ts','/package.json','/package-lock.json','/docs/ANALISE-E-INTEGRACAO.md','/assets/app.js.map','/api/missing']) assert.equal((await fetch(s.base+path)).status,404,path);
  }finally{await s.close();}
});

async function rawRequest(base:string, path:string, headers:Record<string,string> = {}) {
  return new Promise<{status:number;headers:http.IncomingHttpHeaders;body:string}>((resolve,reject) => {
    http.get(base + path,{headers},res => {
      let body=''; res.setEncoding('utf8'); res.on('data',chunk => body+=chunk);
      res.on('end',() => resolve({status:res.statusCode!,headers:res.headers,body}));
    }).on('error',reject);
  });
}

test('health checks disclose no implementation details and do not depend on external feeds', async () => {
  const s = await serve({sync:async()=>{throw new Error('external feed unavailable');}});
  try {
    const response = await fetch(s.base + '/healthz');
    assert.equal(response.status,200); assert.deepEqual(await response.json(),{status:'ok'});
    assert.equal(response.headers.get('cache-control'),'no-store');
  } finally {await s.close();}
});

test('hosted deployment accepts only its exact HTTPS origin and preserves file protections', async () => {
  const runtime=readRuntimeConfig({RENDER:'true',RENDER_EXTERNAL_URL:'https://test-app.onrender.com'});
  const s = await serve({runtime});
  const headers={Host:'test-app.onrender.com','X-Forwarded-Proto':'https',Origin:'https://test-app.onrender.com'};
  try {
    const response=await rawRequest(s.base,'/api/sources/sync',headers);
    assert.equal(response.status,200);assert.equal(response.headers['strict-transport-security'],'max-age=31536000');
    assert.equal((await rawRequest(s.base,'/api/sources/sync',{...headers,Origin:'https://attacker.example'})).status,403);
    assert.equal((await rawRequest(s.base,'/api/sources/sync',{...headers,Host:'attacker.example'})).status,403);
    assert.equal((await rawRequest(s.base,'/api/sources/sync',{...headers,'X-Forwarded-Host':'attacker.example'})).status,200);
    assert.equal((await rawRequest(s.base,'/.env',headers)).status,404);
    assert.equal((await rawRequest(s.base,'/src/App.tsx',headers)).status,404);
    assert.equal((await rawRequest(s.base,'/healthz',{Host:headers.Host})).status,200);
  } finally {await s.close();}
});

test('public HTTP redirects only to the configured HTTPS host; untrusted proxy headers cannot bypass it', async () => {
  const s=await serve({runtime:readRuntimeConfig({PUBLIC_URL:'https://jobs.example.com'})});
  try {
    const response=await rawRequest(s.base,'/api/sources/sync?q=1',{Host:'jobs.example.com','X-Forwarded-Proto':'https'});
    assert.equal(response.status,308);assert.equal(response.headers.location,'https://jobs.example.com/api/sources/sync?q=1');
  } finally {await s.close();}
});

test('proxy rate limits separate clients using the nearest untrusted address, ignoring a forged prefix', async () => {
  const s=await serve({rateLimit:2,runtime:readRuntimeConfig({RENDER:'true',RENDER_EXTERNAL_URL:'https://test-app.onrender.com'})});
  const headers={Host:'test-app.onrender.com','X-Forwarded-Proto':'https'};
  try {
    assert.equal((await rawRequest(s.base,'/api/sources/sync',{...headers,'X-Forwarded-For':'8.8.8.8, 1.1.1.1'})).status,200);
    assert.equal((await rawRequest(s.base,'/api/sources/sync',{...headers,'X-Forwarded-For':'9.9.9.9, 1.1.1.1'})).status,200);
    assert.equal((await rawRequest(s.base,'/api/sources/sync',{...headers,'X-Forwarded-For':'4.4.4.4, 1.1.1.1'})).status,429);
    assert.equal((await rawRequest(s.base,'/api/sources/sync',{...headers,'X-Forwarded-For':'8.8.8.8'})).status,200);
  } finally {await s.close();}
});
