import Dexie, { type Table } from 'dexie';
import type {
  CompanyRecord,
  DataSourceConfig,
  JobApplicationRecord,
  JobOpportunity,
  SavedJobRecord,
  UserProfile,
} from '../types/index.ts';
import {
  DEFAULT_USER_PROFILE,
  DEMONSTRATION_JOBS,
  INITIAL_DATA_SOURCES,
  LEGACY_DEMO_APPLICATION_IDS,
  VERIFIED_COMPANIES_MZ,
} from '../data/seedCatalog.ts';

export interface UserPreferencesRecord {
  id: string;
  theme: 'dark' | 'light';
  includeDemoCatalog: boolean;
  lastOfflineCatalogSyncAt: string;
  pushNotificationsOptIn: boolean;
}

export class VagasMZDatabase extends Dexie {
  jobs!: Table<JobOpportunity, string>;
  savedJobs!: Table<SavedJobRecord, string>;
  applications!: Table<JobApplicationRecord, string>;
  profiles!: Table<UserProfile, string>;
  preferences!: Table<UserPreferencesRecord, string>;
  companies!: Table<CompanyRecord, string>;
  sources!: Table<DataSourceConfig, string>;

  constructor() {
    super('VagasMZ_LocalDB_v3_Swiss');
    this.version(1).stores({
      jobs: 'id, company, province, area, opportunityKind, workMode, isDemo, publishedAt, deadline',
      savedJobs: 'jobId, savedAt, customArea',
      applications: 'id, jobId, status, company, updatedAt',
      profiles: 'id',
      preferences: 'id',
      companies: 'id, province, sector',
      sources: 'id, category, lastStatus',
    });
  }
}

export const db = new VagasMZDatabase();

export async function initializeLocalDatabase(): Promise<{
  jobs: JobOpportunity[];
  savedJobs: SavedJobRecord[];
  applications: JobApplicationRecord[];
  profile: UserProfile;
  preferences: UserPreferencesRecord;
  companies: CompanyRecord[];
  sources: DataSourceConfig[];
}> {
  const existingProfile = await db.profiles.get('default');
  if (!existingProfile) {
    await db.profiles.put(DEFAULT_USER_PROFILE);
  }

  const existingPrefs = await db.preferences.get('default');
  if (!existingPrefs) {
    await db.preferences.put({
      id: 'default',
      theme: 'dark',
      includeDemoCatalog: false,
      lastOfflineCatalogSyncAt: new Date().toISOString(),
      pushNotificationsOptIn: false,
    });
  }

  // Preserve user data; reclassify only the known bundled examples.
  await db.transaction('rw', db.jobs, db.applications, async () => {
    for (const demo of DEMONSTRATION_JOBS) {
      const existing = await db.jobs.get(demo.id);
      await db.jobs.put(existing
        ? { ...existing, isDemo: true, provenance: 'demonstration', lastVerifiedAt: '',
            sources: existing.sources.map((source) => ({ ...source, verifiedAt: '', isOfficialCareerPage: false })) }
        : demo);
    }
    // Never create fictional application history in a new installation.
    for (const exampleId of LEGACY_DEMO_APPLICATION_IDS) {
      const existing = await db.applications.get(exampleId);
      if (existing) await db.applications.put({ ...existing, isDemo: true });
    }
  });

  const companiesCount = await db.companies.count();
  if (companiesCount === 0) {
    await db.companies.bulkPut(VERIFIED_COMPANIES_MZ);
  }

  const sourcesCount = await db.sources.count();
  if (sourcesCount === 0) {
    await db.sources.bulkPut(INITIAL_DATA_SOURCES);
  }

  const [jobs, savedJobs, applications, profile, preferences, companies, sources] =
    await Promise.all([
      db.jobs.toArray(),
      db.savedJobs.toArray(),
      db.applications.toArray(),
      db.profiles.get('default'),
      db.preferences.get('default'),
      db.companies.toArray(),
      db.sources.toArray(),
    ]);

  return {
    jobs,
    savedJobs,
    applications,
    profile: profile || DEFAULT_USER_PROFILE,
    preferences: preferences || {
      id: 'default',
      theme: 'dark',
      includeDemoCatalog: false,
      lastOfflineCatalogSyncAt: new Date().toISOString(),
      pushNotificationsOptIn: false,
    },
    companies,
    sources,
  };
}
