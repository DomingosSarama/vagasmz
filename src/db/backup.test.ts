import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from './localDatabase.ts';
import { restoreBackup, replaceCatalog, mergeCatalog } from './backup.ts';
import { backupFixture } from './backupFixture.ts';
test('backup restores all tables and preferences, rejects before mutation, rolls back storage errors',async () => {
  await db.delete();await db.open();
  const b:any=backupFixture();b.preferences.theme='light';
  await restoreBackup(JSON.stringify(b));
  assert.equal((await db.preferences.get('default'))?.theme,'light');
  await db.savedJobs.put({jobId:b.jobs[0].id,savedAt:new Date().toISOString(),notes:'keep'});
  await assert.rejects(restoreBackup(JSON.stringify({...b,profile:{}})));
  assert.equal((await db.savedJobs.toArray())[0].notes,'keep');
  const fail=()=>{throw new Error('simulated storage failure');};
  db.jobs.hook('creating',fail);
  try {await assert.rejects(restoreBackup(JSON.stringify(b)),/storage failure/);} finally {db.jobs.hook('creating').unsubscribe(fail);}
  assert.equal(await db.jobs.count(),6);assert.equal((await db.savedJobs.toArray())[0].notes,'keep');
  const original=await db.jobs.toArray();
  await assert.rejects(replaceCatalog([{...b.jobs[0],id:undefined}]));
  assert.deepEqual(await db.jobs.toArray(),original);
  db.close();
});

test('concurrent feed and manual imports merge against stored data without losing either update',async () => {
  await db.delete(); await db.open();
  const b=backupFixture();await restoreBackup(JSON.stringify(b));
  const incoming=['first','second'].map(key => ({...b.jobs[0],id:`concurrent-${key}`,title:`Independent ${key}`,sources:[{...b.jobs[0].sources[0],sourceId:`source-${key}`,canonicalUrl:`https://example.com/${key}`}]}));
  await Promise.all(incoming.map(job => mergeCatalog([job])));
  const stored=await db.jobs.toArray();
  assert.equal(stored.length,8);
  assert.ok(incoming.every(job => stored.some(item => item.id === job.id)));
  db.close();
});
