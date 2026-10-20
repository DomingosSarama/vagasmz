import test from 'node:test';
import assert from 'node:assert/strict';
import { readRuntimeConfig } from './runtime.ts';

test('runtime remains private by default and reads the platform port', () => {
  assert.deepEqual(readRuntimeConfig({}), {port:3000,host:'127.0.0.1',publicOrigin:undefined,trustProxyHops:0});
  assert.equal(readRuntimeConfig({PORT:'10000'}).port,10000);
});

test('Render uses its exact HTTPS origin and explicitly trusts one platform proxy', () => {
  const config = readRuntimeConfig({RENDER:'true',RENDER_EXTERNAL_URL:'https://test-app.onrender.com',PORT:'10000'});
  assert.deepEqual(config, {port:10000,host:'0.0.0.0',publicOrigin:'https://test-app.onrender.com',trustProxyHops:1});
  const custom = readRuntimeConfig({PUBLIC_URL:'https://jobs.example.com',RENDER:'true',RENDER_EXTERNAL_URL:'https://test-app.onrender.com'});
  assert.equal(custom.publicOrigin,'https://jobs.example.com');
});

test('runtime rejects unsafe public origins, invalid ports and unbounded proxy trust', () => {
  for (const PUBLIC_URL of ['http://example.com','https://user:password@example.com','https://example.com/path','https://example.com?token=x','https://localhost','https://127.0.0.1','https://example.com:444','https://example.com/#fragment']) {
    assert.throws(() => readRuntimeConfig({PUBLIC_URL}),PUBLIC_URL);
  }
  for (const PORT of ['0','-1','65536','1.2','bad']) assert.throws(() => readRuntimeConfig({PORT}));
  assert.throws(() => readRuntimeConfig({RENDER:'true'}));
  assert.throws(() => readRuntimeConfig({TRUST_PROXY_HOPS:'1'}));
  assert.throws(() => readRuntimeConfig({PUBLIC_URL:'https://example.com',TRUST_PROXY_HOPS:'true'}));
});
