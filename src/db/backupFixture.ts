import { DEFAULT_USER_PROFILE, DEMONSTRATION_JOBS, INITIAL_DATA_SOURCES, VERIFIED_COMPANIES_MZ } from '../data/seedCatalog.ts';
const prefs = {id:'default',theme:'dark',includeDemoCatalog:false,lastOfflineCatalogSyncAt:new Date().toISOString(),pushNotificationsOptIn:false};
export const backupFixture = () => ({app:'VagasMZ',version:2,exportedAt:new Date().toISOString(),profile:DEFAULT_USER_PROFILE,preferences:prefs,jobs:DEMONSTRATION_JOBS,savedJobs:[],applications:[],companies:VERIFIED_COMPANIES_MZ,sources:INITIAL_DATA_SOURCES});
