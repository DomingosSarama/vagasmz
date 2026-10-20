import { z } from 'zod';
import { sanitizeText, validateSafeUrl, validateImportPayloadSize } from './careerLogic.ts';
import { ALL_PROFESSIONAL_AREAS, MOZAMBIQUE_PROVINCES, APPLICATION_STATUSES } from '../types/index.ts';
import { DEMONSTRATION_JOBS, LEGACY_DEMO_APPLICATION_IDS } from '../data/seedCatalog.ts';

const text = (max = 2000) => z.string().max(max).transform(v => sanitizeText(v, max).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ''));
const required = (max = 180) => text(max).refine(v => v.length > 0);
const id = z.string().min(1).max(180).regex(/^[\p{L}\p{N}][\p{L}\p{N}._:@/-]*$/u).refine(v => !['__proto__','constructor','prototype'].includes(v));
export function isCalendarDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
}
const date = z.string().refine(isCalendarDate);
const timestamp = z.string().max(40).refine(v => /^\d{4}-\d{2}-\d{2}T/.test(v) && isCalendarDate(v.slice(0,10)) && Number.isFinite(Date.parse(v)));
const maybeTime = z.union([timestamp, z.literal('')]);
const deadline = z.union([date, z.literal('Não informado'), z.literal('')]);
const url = z.string().max(2048).refine(v => validateSafeUrl(v).valid).transform(v => validateSafeUrl(v).normalizedUrl);
const maybeUrl = z.union([url, z.literal('')]);
const area = z.enum(ALL_PROFESSIONAL_AREAS);
const province = z.enum(MOZAMBIQUE_PROVINCES);
const contract = z.enum(['Estágio Profissional','Programa de Trainees','Tempo Inteiro','Contrato a Prazo','Consultoria / Freelance','Não informado']);
const experience = z.enum(['Estudante / Estágio','Júnior / Entry-Level','Pleno / Mid-Level','Sénior','Não informado']);
const kind = z.enum(['Estágio','Emprego','Trainee']);
const mode = z.enum(['Presencial','Remoto','Híbrido','Não informado']);
const list = (max = 600) => z.array(text(max)).max(60);
const sourceRef = z.object({sourceId:id,sourceName:required(),canonicalUrl:url,verifiedAt:maybeTime,isOfficialCareerPage:z.boolean().optional()});
export const jobSchema = z.object({
  id,title:required(),company:required(),companyId:id.optional(),location:text(300),province,city:text(100),area,
  contractType:contract,opportunityKind:kind,workMode:mode,remoteOpenToMZ:z.boolean(),experienceLevel:experience,
  publishedAt:date,deadline,salaryRange:text(200),description:text(12000),responsibilities:list(),requirements:list(),
  desiredSkills:list(100),benefits:list(),sources:z.array(sourceRef).min(1).max(10),lastVerifiedAt:maybeTime,
  availabilityStatus:z.enum(['Activa','Prazo próximo','Expirada','Por confirmar']),
  provenance:z.enum(['real_verified','manual_verified','feed_imported','manual_unverified','demonstration']),isDemo:z.boolean(),
}).transform(job => {
  const demo = job.isDemo || job.provenance === 'demonstration' || DEMONSTRATION_JOBS.some(d => d.id === job.id);
  return {...job,isDemo:demo,provenance:demo ? 'demonstration' as const : job.provenance === 'feed_imported' ? 'feed_imported' as const : 'manual_unverified' as const,
    availabilityStatus:'Por confirmar' as const,sources:job.sources.map(s => ({...s,isOfficialCareerPage:false}))};
});
export const profileSchema = z.object({id:z.literal('default'),name:text(180),areasOfInterest:z.array(area).max(30),preferredProvinces:z.array(province).max(20),skills:list(100),experienceLevel:experience,education:text(),preferredContracts:z.array(contract).max(10),interestedInInternships:z.boolean(),openToRemote:z.boolean(),updatedAt:timestamp});
export const preferencesSchema = z.object({id:z.literal('default'),theme:z.enum(['dark','light']),includeDemoCatalog:z.boolean(),lastOfflineCatalogSyncAt:timestamp,pushNotificationsOptIn:z.boolean()});
const savedSchema = z.object({jobId:id,savedAt:timestamp,customArea:area.optional(),notes:text(12000).optional()});
export const applicationSchema = z.object({
  id,jobId:id.optional(),isDemo:z.boolean().optional(),jobTitle:required(),company:required(),location:text(300),area,officialUrl:maybeUrl,
  status:z.enum(APPLICATION_STATUSES),appliedDate:deadline,deadline,notes:text(12000),nextAction:text(2000),nextActionDate:deadline.optional(),
  contacts:z.array(z.object({id,name:text(180),role:text(180),contactInfo:text(500)})).max(60),
  interviews:z.array(z.object({id,date:z.union([timestamp,date]),format:z.enum(['Presencial','Online / Vídeo','Telefone','Teste Técnico']),notes:text(6000),completed:z.boolean()})).max(60),
  documentChecklist:z.object({cvUpdated:z.boolean(),coverLetter:z.boolean(),certificates:z.boolean(),biAndNuit:z.boolean(),portfolioOrLinkedin:z.boolean()}).optional(),
  isExternal:z.boolean(),updatedAt:timestamp,history:z.array(z.object({status:z.enum(APPLICATION_STATUSES),timestamp,note:text(2000).optional()})).max(500),
}).transform(app => ({...app,isDemo:app.isDemo || LEGACY_DEMO_APPLICATION_IDS.includes(app.id)}));
const companySchema = z.object({id,name:required(),sector:text(180),location:text(300),province,officialWebsite:maybeUrl,careersUrl:maybeUrl,description:text(6000),verifiedSource:text(500),isDemo:z.boolean()});
const sourceSchema = z.object({id,name:required(),category:z.enum(['API Pública','RSS / Atom','Página Oficial de Carreiras','Importação Manual']),endpointUrl:z.union([maybeUrl,z.literal('local://manual-verified-urls')]),enabled:z.boolean(),lastSyncAt:timestamp.nullable(),lastStatus:z.enum(['sincronizado','por_configurar','indisponivel','a_sincronizar']),statusMessage:text(1000),itemsCollected:z.number().int().min(0).max(100000)});
const unique = <T extends z.ZodType>(schema:T,key:string,max:number) => z.array(schema).max(max).refine(values => new Set(values.map(v => (v as Record<string,unknown>)[key])).size === values.length);
const backupSchema = z.object({app:z.literal('VagasMZ'),version:z.union([z.literal(1),z.literal(2)]),exportedAt:timestamp,
  jobs:unique(jobSchema,'id',2000),savedJobs:unique(savedSchema,'jobId',2000),applications:unique(applicationSchema,'id',1000),
  profile:profileSchema,preferences:preferencesSchema,companies:unique(companySchema,'id',500).optional(),sources:unique(sourceSchema,'id',100).optional(),
});
export type ValidBackup = z.infer<typeof backupSchema>;
export function parseBackup(json:string): ValidBackup {
  try {
    if(!validateImportPayloadSize(json,5*1024*1024)) throw new Error();
    const data = JSON.parse(json,(key,value) => {if(['__proto__','constructor','prototype'].includes(key)) throw new Error(); return value;});
    const result = backupSchema.safeParse(data);
    if(!result.success) throw new Error();
    return result.data;
  } catch { throw new Error('Backup inválido ou demasiado grande. Os dados actuais foram preservados.'); }
}
export const manualImportSchema = z.object({
  title:required(),company:required(140),canonicalUrl:url,province:province.default('Não informado'),city:text(100).default('Não informado'),area:area.default('Outras áreas'),
  contractType:contract.default('Não informado'),opportunityKind:kind.default('Emprego'),workMode:mode.default('Não informado'),experienceLevel:experience.default('Não informado'),
  deadline:deadline.default('Não informado'),salaryRange:text(200).default('Não informado'),description:text(12000).default(''),sourceName:text(180).default('Fonte indicada pelo utilizador'),
  skills:z.union([text(3000),list(100)]).default([]),
});
export function parseImportedJobs(input: unknown) {
  if(!Array.isArray(input) || input.length > 2000) return [];
  return input.flatMap(value => {const result = jobSchema.safeParse(value); return result.success ? [result.data] : [];});
}
