import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createApplication } from '../../server.ts';
import { readRuntimeConfig } from './runtime.ts';
import { RETIRE_WORKER, type PrivateAccessOptions } from './privateAccess.ts';

// A test fixture only, never a production default or an accepted fallback.
const PASSWORD = 'test-only-private-access-password-42';
async function serve(access: Partial<PrivateAccessOptions> = {}, hosted = false) {
  let syncCalls = 0;
  const runtime = readRuntimeConfig(hosted ? {RENDER:'true',RENDER_EXTERNAL_URL:'https://private.example.com'} : {});
  const app = await createApplication({production:true,runtime,staticDirectory:fileURLToPath(new URL('../../public/',import.meta.url)),access:{enabled:true,password:PASSWORD,publicOrigin:runtime.publicOrigin,...access},sync:async()=>{syncCalls++; return {syncedAt:new Date().toISOString(),jobs:[],sourceReports:[]};}});
  const server = app.listen(0,'127.0.0.1'); await once(server,'listening');
  const base = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const origin = runtime.publicOrigin || base;
  const headers: Record<string,string> = hosted ? {Host:'private.example.com','X-Forwarded-Proto':'https'} : {};
  const get = (path: string, init: RequestInit = {}) => fetch(base + path, {...init,redirect:'manual',headers:{...headers,...init.headers as Record<string,string>}});
  const csrf = async () => {
    const response = await get('/login');
    const body = await response.text();
    const token = body.match(/name="csrf" value="([^"]+)"/)?.[1];
    assert.ok(token);
    return {token,cookie:response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ')};
  };
  const login = async (password = PASSWORD, extraHeaders: Record<string,string> = {}) => {
    const start = await csrf();
    return get('/login', {method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded',Cookie:start.cookie,...extraHeaders},body:new URLSearchParams({password,csrf:start.token})});
  };
  return {base,origin,get,csrf,login,syncCalls:()=>syncCalls,close:()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))};
}
function sessionCookie(response: Response) {
  const value = response.headers.getSetCookie().find(value=>/^(__Host-)?vagasmz-session=/.test(value));
  assert.ok(value); return value.split(';')[0];
}

test('anonymous visitors cannot read the application, API, manifests or assets', async () => {
  const s = await serve();
  try {
    const home = await s.get('/'); assert.equal(home.status,303); assert.equal(home.headers.get('location'),'/login');
    for (const path of ['/api/sources/sync','/api/access/session','/api/jobs/validate-import']) {
      const response = await s.get(path); assert.equal(response.status,401,path); assert.equal((await response.json()).code,'AUTH_REQUIRED');
    }
    for (const path of ['/assets/index.js','/manifest.json','/images/maputo-night.png','/index.html']) assert.equal((await s.get(path)).status,401,path);
    assert.equal(s.syncCalls(),0);
    const health = await s.get('/healthz'); assert.equal(health.status,200); assert.deepEqual(await health.json(),{status:'ok'});
  } finally {await s.close();}
});

test('missing or weak configuration fails closed without disclosing environment details', async () => {
  for (const password of [undefined,'short','x'.repeat(129)]) {
    const s = await serve({password});
    try {
      const response = await s.get('/login'); assert.equal(response.status,503);
      const body = await response.text(); assert.ok(!/VAGASMZ_ACCESS_PASSWORD|process.env|stack|<form/.test(body));
      assert.equal((await s.get('/api/sources/sync')).status,401);
      assert.equal((await s.get('/healthz')).status,200);
    } finally {await s.close();}
  }
});

test('production is private by default even without any credential configuration', async () => {
  const app=await createApplication({production:true,runtime:readRuntimeConfig({})});
  const server=app.listen(0,'127.0.0.1'); await once(server,'listening');
  try {const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;assert.equal((await fetch(base+'/api/access/session')).status,401);}
  finally {await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('valid credentials create a secure server session; secrets never reach the login HTML', async () => {
  const s = await serve({},true);
  try {
    const page = await s.get('/login'); assert.equal(page.headers.get('cache-control'),'no-store'); assert.equal(page.headers.get('referrer-policy'),'same-origin'); assert.ok(page.headers.get('x-robots-tag')?.includes('noindex'));assert.ok(!(await page.text()).includes(PASSWORD));
    const response=await s.login(); assert.equal(response.status,303);assert.equal(response.headers.get('location'),'/');
    const value=response.headers.getSetCookie().find(value=>value.startsWith('__Host-vagasmz-session='))!;
    for (const attribute of ['HttpOnly','Secure','SameSite=Strict','Path=/']) assert.ok(value.includes(attribute),attribute);
    assert.ok(!value.includes(PASSWORD));
    const cookie=sessionCookie(response);
    const api=await s.get('/api/sources/sync',{headers:{Cookie:cookie}});assert.equal(api.status,200);assert.equal(api.headers.get('cache-control'),'no-store');assert.equal(s.syncCalls(),1);
    const manifest=await s.get('/manifest.json',{headers:{Cookie:cookie}});assert.equal(manifest.status,200);assert.equal(manifest.headers.get('cache-control'),'no-store');
    assert.equal((await s.get('/server.ts',{headers:{Cookie:cookie}})).status,404);
  } finally {await s.close();}
});

test('wrong passwords, injected fields and copied or forged cookies never grant access', async () => {
  const s=await serve();
  try {
    const wrong=await s.login('wrong-password');assert.equal(wrong.status,401);assert.ok(!wrong.headers.getSetCookie().some(value=>value.includes('vagasmz-session=')));
    const start=await s.csrf();
    const injected=await s.get('/login',{method:'POST',headers:{Origin:s.origin,'Content-Type':'application/x-www-form-urlencoded',Cookie:start.cookie},body:new URLSearchParams([['password',PASSWORD],['password','another'],['csrf',start.token]])});assert.equal(injected.status,401);
    const cookie=sessionCookie(await s.login());
    assert.equal((await s.get('/api/access/session',{headers:{Cookie:'vagasmz-session='+ 'a'.repeat(43)}})).status,401);
    assert.equal((await s.get('/api/access/session',{headers:{Cookie:cookie+'; '+cookie}})).status,401);
    assert.equal((await s.get('/api/access/session',{headers:{Authorization:'Bearer '+cookie.split('=')[1]}})).status,401);
  } finally {await s.close();}
});

test('login rejects cross-origin, missing and forged CSRF tokens and expired login forms', async () => {
  let now=Date.now();const s=await serve({now:()=>now});
  try {
    assert.equal((await s.login(PASSWORD,{Origin:'https://attacker.example'})).status,403);
    assert.equal((await s.login(PASSWORD,{'Sec-Fetch-Site':'cross-site'})).status,403);
    const start=await s.csrf();
    const post=(csrf:string,cookie=start.cookie)=>s.get('/login',{method:'POST',headers:{Origin:s.origin,'Content-Type':'application/x-www-form-urlencoded',Cookie:cookie},body:new URLSearchParams({password:PASSWORD,csrf})});
    assert.equal((await post('')).status,403);
    const forged='a'.repeat(43)+'.'+(now+600000)+'.'+'b'.repeat(43);
    assert.equal((await post(forged,'vagasmz-login='+forged)).status,403);
    now+=600001;assert.equal((await post(start.token)).status,403);
    assert.equal((await s.get('/api/access/session')).status,401);
  } finally {await s.close();}
});

test('repeated attempts are bounded and expire after the cooldown', async () => {
  let now=Date.now(); const s=await serve({attempts:2,now:()=>now});
  try {
    assert.equal((await s.login('wrong')).status,401);assert.equal((await s.login('wrong')).status,401);
    const blocked=await s.login();assert.equal(blocked.status,429);assert.equal(blocked.headers.get('retry-after'),'900');
    now+=15*60_000; assert.equal((await s.login()).status,303);
  } finally {await s.close();}
});

test('session checks do not extend the idle lifetime and absolute expiry cannot be bypassed', async () => {
  let now=Date.now(); const idle=await serve({now:()=>now,idleMs:30_000});
  try {
    const cookie=sessionCookie(await idle.login());now+=20_000;
    assert.equal((await idle.get('/api/access/session',{headers:{Cookie:cookie}})).status,200);
    now+=10_001;assert.equal((await idle.get('/api/sources/sync',{headers:{Cookie:cookie}})).status,401);
  } finally {await idle.close();}
  const absolute=await serve({now:()=>now,idleMs:100_000,lifetimeMs:60_000});
  try {
    const cookie=sessionCookie(await absolute.login());now+=40_000;assert.equal((await absolute.get('/api/sources/sync',{headers:{Cookie:cookie}})).status,200);
    now+=20_001;assert.equal((await absolute.get('/api/sources/sync',{headers:{Cookie:cookie}})).status,401);
  } finally {await absolute.close();}
});

test('logout revokes the server session and cross-site logout cannot sign the owner out', async () => {
  const s=await serve();
  try {
    const cookie=sessionCookie(await s.login());
    assert.equal((await s.get('/logout',{headers:{Cookie:cookie}})).status,405);
    assert.equal((await s.get('/logout',{method:'POST',headers:{Cookie:cookie,Origin:'https://attacker.example'}})).status,403);
    assert.equal((await s.get('/api/access/session',{headers:{Cookie:cookie}})).status,200);
    const logout=await s.get('/logout',{method:'POST',headers:{Cookie:cookie,Origin:s.origin}});assert.equal(logout.status,303);assert.equal(logout.headers.get('location'),'/login');
    assert.ok(logout.headers.getSetCookie().some(value=>value.includes('vagasmz-session=;')&&value.includes('Max-Age=0')));
    assert.equal((await s.get('/api/access/session',{headers:{Cookie:cookie}})).status,401);
    assert.ok(!(logout.headers.get('clear-site-data')||'').includes('storage'));
  } finally {await s.close();}
});

test('sessions are rotated on login and are invalid after a restart', async () => {
  const first=await serve(),second=await serve();
  try {
    const cookie=sessionCookie(await first.login());
    const start=await first.csrf();
    const rotated=await first.get('/login',{method:'POST',headers:{Origin:first.origin,'Content-Type':'application/x-www-form-urlencoded',Cookie:cookie+'; '+start.cookie},body:new URLSearchParams({password:PASSWORD,csrf:start.token})});
    assert.equal(rotated.status,303); assert.notEqual(sessionCookie(rotated),cookie);
    assert.equal((await first.get('/api/access/session',{headers:{Cookie:cookie}})).status,401);
    assert.equal((await second.get('/api/access/session',{headers:{Cookie:sessionCookie(rotated)}})).status,401);
  } finally {await first.close();await second.close();}
});

test('oversized login bodies and malformed cookies return no internal details', async () => {
  const s=await serve();
  try {
    const start=await s.csrf();
    const response=await s.get('/login',{method:'POST',headers:{Origin:s.origin,Cookie:start.cookie,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:'x'.repeat(5000),csrf:start.token})});
    assert.equal(response.status,413);assert.ok(!/stack|node_modules|privateAccess|PASSWORD/.test(await response.text()));
    assert.equal((await s.get('/api/access/session',{headers:{Cookie:'vagasmz-session=%broken'}})).status,401);
  } finally {await s.close();}
});

test('legacy worker retires itself, removes only old app caches and redirects its open windows', async () => {
  const handlers=new Map<string,Function>(),deleted:string[]=[],navigated:string[]=[];let unregistered=false,claimed=false;
  vm.runInNewContext(RETIRE_WORKER,{self:{addEventListener:(name:string,callback:Function)=>handlers.set(name,callback),skipWaiting:()=>Promise.resolve(),registration:{unregister:async()=>{unregistered=true;}},clients:{claim:async()=>{claimed=true;},matchAll:async()=>[{navigate:async(path:string)=>{navigated.push(path);}}]}},caches:{keys:async()=>['vagasmz-cache-v3-swiss','other-cache'],delete:async(key:string)=>{deleted.push(key);return true;}}});
  let done:Promise<void>=Promise.resolve();handlers.get('activate')!({waitUntil:(promise:Promise<void>)=>{done=promise;}});await done;
  assert.deepEqual(deleted,['vagasmz-cache-v3-swiss']);assert.deepEqual(navigated,['/login']);assert.ok(unregistered&&claimed);assert.equal(handlers.has('fetch'),false);
});
