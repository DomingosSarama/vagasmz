import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { db, initializeLocalDatabase } from './localDatabase.ts';
import { DEMONSTRATION_JOBS, INITIAL_DEMO_APPLICATIONS } from '../data/seedCatalog.ts';

test('fresh installation has no invented applications and hides labelled examples', async () => {
  await db.delete();
  await db.open();
  const data = await initializeLocalDatabase();
  assert.equal(data.applications.length, 0);
  assert.equal(data.preferences.includeDemoCatalog, false);
  assert.equal(data.jobs.length, 6);
  assert.ok(data.jobs.every(job => job.isDemo && job.provenance === 'demonstration'));
  assert.ok(data.jobs.every(job => job.lastVerifiedAt === '' && job.sources.every(source => !source.isOfficialCareerPage)));

  const userJob = { ...DEMONSTRATION_JOBS[0], id: 'user-import', title: 'Anúncio pessoal', isDemo: false, provenance: 'manual_unverified' as const };
  await db.jobs.put(userJob);
  const legacyExample = { ...INITIAL_DEMO_APPLICATIONS[0], notes: 'Nota conservada' };
  await db.applications.put(legacyExample);
  const reloaded = await initializeLocalDatabase();
  assert.equal(reloaded.jobs.find(job => job.id === 'user-import')?.title, 'Anúncio pessoal');
  assert.equal(reloaded.applications[0].isDemo, true);
  assert.equal(reloaded.applications[0].notes, 'Nota conservada');
  db.close();
});
