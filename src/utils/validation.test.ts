import test from 'node:test';
import assert from 'node:assert/strict';
import { manualImportSchema, parseBackup, jobSchema, parseImportedJobs } from './validation.ts';
import { DEFAULT_USER_PROFILE, DEMONSTRATION_JOBS, INITIAL_DATA_SOURCES, VERIFIED_COMPANIES_MZ } from '../data/seedCatalog.ts';
import { backupFixture } from '../db/backupFixture.ts';
test('backup round-trip validates the complete shipped catalogue and preferences', () => {
  const parsed = parseBackup(JSON.stringify(backupFixture()));
  assert.equal(parsed.jobs.length,6); assert.equal(parsed.sources?.length,5);
  assert.equal(parsed.preferences.theme,'dark');
});
test('backup rejects nested wrong types, duplicate ids, missing fields and malicious URLs', () => {
  for(const change of [
    (b:any)=>b.profile.name={},(b:any)=>b.jobs[0].sources[0].canonicalUrl='javascript:alert(1)',
    (b:any)=>b.jobs.push(b.jobs[0]),(b:any)=>delete b.profile,(b:any)=>b.jobs[0].deadline='2026-02-31',
    (b:any)=>b.preferences.theme='pink',(b:any)=>b.applications=[{id:'broken'}],
  ]) {const b=structuredClone(backupFixture());change(b);assert.throws(()=>parseBackup(JSON.stringify(b)),/Backup inválido/);}
  assert.throws(()=>parseBackup('{"__proto__":{"admin":true}}'));
  assert.throws(()=>parseBackup('x'.repeat(5*1024*1024+1)));
});
test('unknown backup fields are discarded and legacy verified claims are downgraded', () => {
  const b:any=backupFixture();b.developerSecret='do not restore';b.profile.apiKey='discard';
  const job={...DEMONSTRATION_JOBS[0],id:'personal',isDemo:false,provenance:'real_verified'};
  b.jobs=[job];const parsed:any=parseBackup(JSON.stringify(b));
  assert.equal(parsed.developerSecret,undefined);assert.equal(parsed.profile.apiKey,undefined);
  assert.equal(parsed.jobs[0].provenance,'manual_unverified');assert.equal(parsed.jobs[0].sources[0].isOfficialCareerPage,false);
});
test('manual import validates enums and field types without inventing missing facts', () => {
  const base = {title:'Analista',company:'Entidade',canonicalUrl:'https://example.com/vaga'};
  const parsed = manualImportSchema.parse(base);
  assert.equal(parsed.province,'Não informado');assert.equal(parsed.area,'Outras áreas');assert.equal(parsed.workMode,'Não informado');
  for(const extra of [{title:{}},{workMode:'Alien'},{skills:[{}]},{province:'Atlantis'},{deadline:'2026-02-31'},{canonicalUrl:'http://localhost'}]) assert.equal(manualImportSchema.safeParse({...base,...extra}).success,false);
});
test('untrusted feed records are bounded, validated and cannot relabel known demos as verified', () => {
  assert.equal(parseImportedJobs([{}, {...DEMONSTRATION_JOBS[0],isDemo:false,provenance:'real_verified'}]).length,1);
  assert.equal(jobSchema.parse({...DEMONSTRATION_JOBS[0],isDemo:false,provenance:'real_verified'}).isDemo,true);
  assert.equal(parseImportedJobs(Array(2001).fill(DEMONSTRATION_JOBS[0])).length,0);
});
