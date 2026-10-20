import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchApiJson } from './apiClient.ts';

test('API client uses same-origin credentials, no cache and keeps validation error responses', async () => {
  const fetcher:typeof fetch=async(path,init) => {
    assert.equal(path,'/api/jobs/validate-import');assert.equal(init?.cache,'no-store');assert.equal(init?.credentials,'same-origin');
    return new Response(JSON.stringify({error:'Dados inválidos'}),{status:400});
  };
  const response=await fetchApiJson('/api/jobs/validate-import',{method:'POST'},100,fetcher);
  assert.equal(response.status,400);assert.equal(response.ok,false);assert.deepEqual(response.data,{error:'Dados inválidos'});
});

test('API deadline aborts a stalled request or response body', async () => {
  for (const stage of ['headers','body']) {
    const fetcher:typeof fetch=async(_path,init) => {
      const pending=new Promise<never>((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
      if(stage==='headers') return pending;
      const response = new Response(); response.json = () => pending;
      return response;
    };
    await assert.rejects(fetchApiJson('/api/sources/sync',{},5,fetcher),{name:'AbortError'});
  }
});

test('successful API request clears its deadline and caller cancellation is forwarded', async () => {
  let signal:AbortSignal;
  const fetcher:typeof fetch=async(_path,init) => {signal=init!.signal!;return new Response('{}');};
  await fetchApiJson('/api/sources/sync',{},5,fetcher);
  await new Promise(resolve=>setTimeout(resolve,15)); assert.equal(signal!.aborted,false);
  const caller=new AbortController();caller.abort();
  await fetchApiJson('/api/sources/sync',{signal:caller.signal},100,fetcher);
  assert.equal(signal!.aborted,true);
  await assert.rejects(fetchApiJson('https://attacker.example/api/test',{},100,fetcher));
});
