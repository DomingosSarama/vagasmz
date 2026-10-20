import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { validateFetchTarget, createSourceFetcher } from '../server/safeFetch.ts';
import { isPublicIp } from './publicAddress.ts';
test('metadata fetch rejects local addresses, credentials, alternate ports and lookalike hosts', () => {
  for(const url of ['http://127.0.0.1:3000/','https://[::1]/','https://169.254.169.254/','https://10.0.0.1/',
    'https://emprego.mmo.co.mz.evil.example/','https://evil.example/','https://user:password@emprego.mmo.co.mz/','https://emprego.mmo.co.mz:444/']) assert.throws(()=>validateFetchTarget(url));
  assert.equal(validateFetchTarget('https://emprego.mmo.co.mz/feed/').hostname,'emprego.mmo.co.mz');
});
test('address checks block private, loopback, reserved and IPv6 mapped ranges',()=>{
  for(const address of ['127.0.0.1','10.0.0.2','172.16.1.2','192.168.1.1','169.254.169.254','100.64.0.1','198.18.0.1','::1','::ffff:8.8.8.8','fe80::1','fc00::1','2001:db8::1']) assert.equal(isPublicIp(address),false,address);
  for(const address of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111']) assert.equal(isPublicIp(address),true,address);
});
function mockRequest(status=200,parts=['ok'],headers={}) {
  return ((_url:any,options:any,callback:any) => {
    options.lookup('source',{all:true},(error:any,answers:any)=>{assert.equal(error,null);assert.equal(answers[0].address,'8.8.8.8');});
    const req:any=new EventEmitter();req.end=()=>{const response:any=Readable.from(parts.map(p=>Buffer.from(p)));response.statusCode=status;response.headers=headers;callback(response);};req.destroy=()=>{};return req;
  }) as any;
}
const publicDns = (async()=>[{address:'8.8.8.8',family:4}]) as any;
test('source fetch pins the validated DNS result while retaining the public TLS hostname',async()=>{
  let lookups=0;
  const fetcher=createSourceFetcher((async()=>{lookups++;return publicDns();}) as any,mockRequest(200,['{"ok":true}']));
  const response=await fetcher('https://emprego.mmo.co.mz/feed/');assert.deepEqual(await response.json(),{ok:true});assert.equal(lookups,1);
});
test('source fetch rejects any private DNS answer before starting a request',async()=>{
  let requests=0;
  const fetcher=createSourceFetcher((async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]) as any,(()=>{requests++;}) as any);
  await assert.rejects(fetcher('https://emprego.mmo.co.mz/feed/'),/bloqueado/);assert.equal(requests,0);
});
test('source fetch refuses redirects and bounds declared and streamed response sizes',async()=>{
  await assert.rejects(createSourceFetcher(publicDns,mockRequest(302))('https://emprego.mmo.co.mz/feed/'),/Redireccionamento/);
  await assert.rejects(createSourceFetcher(publicDns,mockRequest(200,[],{'content-length':'3000000'}))('https://emprego.mmo.co.mz/feed/'),/grande/);
  await assert.rejects(createSourceFetcher(publicDns,mockRequest(200,['x'.repeat(2100000)]))('https://emprego.mmo.co.mz/feed/'),/grande/);
});
test('DNS timeout cancels the operation before a delayed resolution can initiate a request',async()=>{
  let requests=0;
  const fetcher=createSourceFetcher((async()=>{await new Promise(r=>setTimeout(r,25));return publicDns();}) as any,(()=>{requests++;}) as any);
  await assert.rejects(fetcher('https://emprego.mmo.co.mz/feed/',5),/tempo limite/);
  await new Promise(r=>setTimeout(r,35));assert.equal(requests,0);
});
