import { db } from './localDatabase.ts';
import { parseBackup } from '../utils/validation.ts';
import { deduplicateAndMergeJobs } from '../utils/careerLogic.ts';
export async function restoreBackup(json:string) {
  const backup = parseBackup(json);
  await db.transaction('rw', db.tables, async () => {
    await db.jobs.clear(); await db.jobs.bulkPut(backup.jobs);
    await db.savedJobs.clear(); await db.savedJobs.bulkPut(backup.savedJobs);
    await db.applications.clear(); await db.applications.bulkPut(backup.applications);
    await db.profiles.put(backup.profile); await db.preferences.put(backup.preferences);
    if(backup.companies) {await db.companies.clear(); await db.companies.bulkPut(backup.companies);}
    if(backup.sources) {await db.sources.clear(); await db.sources.bulkPut(backup.sources);}
  });
  return backup;
}
export async function replaceCatalog(jobs: import('../types/index.ts').JobOpportunity[]) {
  await db.transaction('rw',db.jobs,async () => {await db.jobs.clear();await db.jobs.bulkPut(jobs);});
}

export async function mergeCatalog(incoming: import('../types/index.ts').JobOpportunity[]) {
  return db.transaction('rw', db.jobs, async () => {
    const stored = await db.jobs.toArray();
    const merged = deduplicateAndMergeJobs([...incoming, ...stored]);
    await db.jobs.clear();
    await db.jobs.bulkPut(merged.mergedJobs);
    return merged;
  });
}
