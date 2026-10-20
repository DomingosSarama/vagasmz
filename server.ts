import { randomUUID } from 'node:crypto';
import { readRuntimeConfig, type RuntimeConfig } from './src/server/runtime.ts';
import { installSecurity, safeErrorHandler } from './src/server/security.ts';
import { manualImportSchema, parseImportedJobs } from './src/utils/validation.ts';
import { fetchSourceText, validateFetchTarget } from './src/server/safeFetch.ts';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  decodeHtmlEntities,
  deduplicateAndMergeJobs,
  extractMetadataFromHtml,
  inferAreaFromText,
  parseMozambiqueRssFeed,
  sanitizeText,
  validateImportPayloadSize,
  validateSafeUrl,
} from './src/utils/careerLogic.ts';
import type { JobOpportunity, ProfessionalArea, ProvinceMZ } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SourceReport {
  id: string;
  status: 'sincronizado' | 'indisponivel' | 'por_configurar';
  message: string;
  count: number;
  syncedAt: string;
}

interface SyncPayload {
  syncedAt: string;
  jobs: JobOpportunity[];
  sourceReports: SourceReport[];
}

let cachedSyncResponse: {
  timestampMs: number;
  payload: SyncPayload;
} | null = null;

let activeSyncPromise: Promise<SyncPayload> | null = null;

const fetchWithTimeout = fetchSourceText;

async function performRealTimeSync(forceRefresh = false): Promise<SyncPayload> {
  if (
    !forceRefresh &&
    cachedSyncResponse &&
    Date.now() - cachedSyncResponse.timestampMs < 3 * 60 * 1000
  ) {
    return cachedSyncResponse.payload;
  }

  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    const nowIso = new Date().toISOString();
    const collectedJobs: JobOpportunity[] = [];
    const sourceReports: SourceReport[] = [];

    // Execute all 4 real-time sources in parallel for fast response
    const [mmoResult, soVagasResult, remotiveResult, jobicyResult] = await Promise.allSettled([
      // 1. MMO Emprego Moçambique (Feed principal + Feed de Estágios em Moçambique)
      (async () => {
        const [mainRes, internRes] = await Promise.allSettled([
          fetchWithTimeout('https://emprego.mmo.co.mz/feed/', 5000, 'application/rss+xml, application/xml, text/xml'),
          fetchWithTimeout('https://emprego.mmo.co.mz/?s=estagio&post_type=job_listing&feed=rss2', 5000, 'application/rss+xml, application/xml, text/xml'),
        ]);

        let mmoJobs: JobOpportunity[] = [];
        if (mainRes.status === 'fulfilled' && mainRes.value.ok) {
          const xmlMain = await mainRes.value.text();
          mmoJobs.push(
            ...parseMozambiqueRssFeed(xmlMain, 'MMO Emprego Moçambique (Feed/API)', 'mmo-mz', nowIso).slice(0, 18)
          );
        }
        if (internRes.status === 'fulfilled' && internRes.value.ok) {
          const xmlIntern = await internRes.value.text();
          mmoJobs.push(
            ...parseMozambiqueRssFeed(xmlIntern, 'MMO Emprego Moçambique (Estágios)', 'mmo-estagio', nowIso).slice(0, 6)
          );
        }

        const dedupedMmo = deduplicateAndMergeJobs(mmoJobs).mergedJobs;
        return dedupedMmo;
      })(),

      // 2. SoVagas Moçambique (Feed RSS de Vagas, Estágios e Concursos Públicos)
      (async () => {
        const svRes = await fetchWithTimeout(
          'https://sovagas.co.mz/feed/',
          5000,
          'application/rss+xml, application/xml, text/xml'
        );
        if (!svRes.ok) throw new Error(`HTTP ${svRes.status}`);
        const svXml = await svRes.text();
        return parseMozambiqueRssFeed(svXml, 'SoVagas Moçambique (Feed/API)', 'sovagas-mz', nowIso).slice(0, 10);
      })(),

      // 3. Remotive Public API (Vagas Remotas Internacionais de Tecnologia)
      (async () => {
        const remRes = await fetchWithTimeout('https://remotive.com/api/remote-jobs?limit=8', 4500);
        if (!remRes.ok) throw new Error(`HTTP ${remRes.status}`);
        const remData = (await remRes.json()) as {
          jobs?: Array<{
            id: number;
            url?: string;
            title?: string;
            company_name?: string;
            category?: string;
            candidate_required_location?: string;
            publication_date?: string;
            salary?: string;
            description?: string;
          }>;
        };

        const rawJobs = (remData.jobs || []).slice(0, 8);
        const remJobs: JobOpportunity[] = [];

        for (const rj of rawJobs) {
          const urlCheck = validateSafeUrl(rj.url || '');
          if (!urlCheck.valid) continue;

          const title = sanitizeText(decodeHtmlEntities(rj.title || 'Remote Tech Role'), 180);
          const company = sanitizeText(decodeHtmlEntities(rj.company_name || 'Empresa Remota'), 120);
          const reqLoc = sanitizeText(rj.candidate_required_location || 'Não informado', 100);
          const salary = sanitizeText(rj.salary || '', 100) || 'Não informado';
          const cleanDesc = sanitizeText(decodeHtmlEntities(rj.description || ''), 750);
          const area = inferAreaFromText(`${title} ${rj.category || ''}`);

          remJobs.push({
            id: `remotive-${rj.id}`,
            title,
            company,
            location: `Remoto (${reqLoc})`,
            province: 'Remoto',
            city: 'Remoto',
            area,
            contractType: 'Não informado',
            opportunityKind: 'Emprego',
            workMode: 'Remoto',
            remoteOpenToMZ: /worldwide|anywhere|africa|emea|global/i.test(reqLoc),
            experienceLevel: 'Não informado',
            publishedAt: rj.publication_date ? rj.publication_date.slice(0, 10) : nowIso.slice(0, 10),
            deadline: 'Não informado',
            salaryRange: salary,
            description: cleanDesc || 'Anúncio remoto recolhido via Remotive API.',
            responsibilities: ['Consultar o anúncio oficial na fonte indicada para detalhes da função remota.'],
            requirements: [`Elegibilidade geográfica indicada pela empresa: ${reqLoc}`],
            desiredSkills: [area, 'Trabalho Remoto', 'Inglês'],
            benefits: ['Não informado'],
            sources: [
              {
                sourceId: `remotive-${rj.id}`,
                sourceName: 'Remotive API Pública (Feed/API)',
                canonicalUrl: urlCheck.normalizedUrl,
                verifiedAt: nowIso, // Legacy field: collection time, not employer verification.
              },
            ],
            lastVerifiedAt: nowIso,
            availabilityStatus: 'Por confirmar',
            provenance: 'feed_imported',
            isDemo: false,
          });
        }
        return remJobs;
      })(),

      // 4. Jobicy Public API (Vagas Remotas Internacionais)
      (async () => {
        const jbRes = await fetchWithTimeout('https://jobicy.com/api/v2/remote-jobs?count=8', 4500);
        if (!jbRes.ok) throw new Error(`HTTP ${jbRes.status}`);
        const jbData = (await jbRes.json()) as {
          jobs?: Array<{
            id: number;
            url?: string;
            jobTitle?: string;
            companyName?: string;
            jobGeo?: string;
            jobLevel?: string;
            pubDate?: string;
            jobExcerpt?: string;
            annualSalaryMin?: number;
            annualSalaryMax?: number;
            salaryCurrency?: string;
          }>;
        };

        const rawList = Array.isArray(jbData.jobs) ? jbData.jobs.slice(0, 8) : [];
        const jbJobs: JobOpportunity[] = [];

        for (const item of rawList) {
          const urlCheck = validateSafeUrl(item.url || '');
          if (!urlCheck.valid) continue;

          const title = sanitizeText(decodeHtmlEntities(item.jobTitle || 'Oportunidade Remota'), 180);
          const company = sanitizeText(decodeHtmlEntities(item.companyName || 'Empresa Internacional'), 120);
          const geo = sanitizeText(decodeHtmlEntities(item.jobGeo || 'Não informado'), 80);
          const excerpt = sanitizeText(decodeHtmlEntities(item.jobExcerpt || ''), 750);
          const area = inferAreaFromText(`${title} ${excerpt}`);

          let salaryRange = 'Não informado';
          if (item.annualSalaryMin && item.annualSalaryMax) {
            salaryRange = `${item.annualSalaryMin.toLocaleString()} - ${item.annualSalaryMax.toLocaleString()} ${item.salaryCurrency || 'USD'}/ano`;
          }

          jbJobs.push({
            id: `jobicy-${item.id}`,
            title,
            company,
            location: `Remoto (${geo})`,
            province: 'Remoto',
            city: 'Remoto',
            area,
            contractType: 'Não informado',
            opportunityKind: 'Emprego',
            workMode: 'Remoto',
            remoteOpenToMZ: /anywhere|worldwide|emea|africa/i.test(geo),
            experienceLevel: /senior|lead/i.test(item.jobLevel || '') ? 'Sénior' : 'Não informado',
            publishedAt: item.pubDate ? item.pubDate.slice(0, 10) : nowIso.slice(0, 10),
            deadline: 'Não informado',
            salaryRange,
            description: excerpt || 'Anúncio remoto recolhido via Jobicy API.',
            responsibilities: ['Consultar o anúncio oficial para detalhes técnicos e fuso horário.'],
            requirements: [`Região elegível indicada: ${geo}`],
            desiredSkills: [area, 'Trabalho Remoto', 'Inglês'],
            benefits: ['Não informado'],
            sources: [
              {
                sourceId: `jobicy-${item.id}`,
                sourceName: 'Jobicy API Pública (Feed/API)',
                canonicalUrl: urlCheck.normalizedUrl,
                verifiedAt: nowIso, // Legacy field: collection time, not employer verification.
              },
            ],
            lastVerifiedAt: nowIso,
            availabilityStatus: 'Por confirmar',
            provenance: 'feed_imported',
            isDemo: false,
          });
        }
        return jbJobs;
      })(),
    ]);

    // Process MMO Emprego result
    if (mmoResult.status === 'fulfilled' && mmoResult.value.length > 0) {
      collectedJobs.push(...mmoResult.value);
      sourceReports.push({
        id: 'src-mmo-mz',
        status: 'sincronizado',
        message: `Consulta concluída: ${mmoResult.value.length} anúncios de vagas e estágios recolhidos em Moçambique (MMO Emprego).`,
        count: mmoResult.value.length,
        syncedAt: nowIso,
      });
    } else {
      sourceReports.push({
        id: 'src-mmo-mz',
        status: 'indisponivel',
        message: 'Feed MMO Emprego temporariamente indisponível.',
        count: 0,
        syncedAt: nowIso,
      });
    }

    // Process SoVagas result
    if (soVagasResult.status === 'fulfilled' && soVagasResult.value.length > 0) {
      collectedJobs.push(...soVagasResult.value);
      sourceReports.push({
        id: 'src-sovagas-mz',
        status: 'sincronizado',
        message: `Consulta concluída: ${soVagasResult.value.length} anúncios e concursos em Moçambique (SoVagas).`,
        count: soVagasResult.value.length,
        syncedAt: nowIso,
      });
    } else {
      sourceReports.push({
        id: 'src-sovagas-mz',
        status: 'indisponivel',
        message: 'Feed SoVagas Moçambique sem resposta neste momento.',
        count: 0,
        syncedAt: nowIso,
      });
    }

    // Process Remotive result
    if (remotiveResult.status === 'fulfilled' && remotiveResult.value.length > 0) {
      collectedJobs.push(...remotiveResult.value);
      sourceReports.push({
        id: 'src-remotive-tech',
        status: 'sincronizado',
        message: `Consulta concluída: ${remotiveResult.value.length} anúncios remotos recolhidos da API Remotive.`,
        count: remotiveResult.value.length,
        syncedAt: nowIso,
      });
    } else {
      sourceReports.push({
        id: 'src-remotive-tech',
        status: 'indisponivel',
        message: 'API Remotive sem resposta neste momento.',
        count: 0,
        syncedAt: nowIso,
      });
    }

    // Process Jobicy result
    if (jobicyResult.status === 'fulfilled' && jobicyResult.value.length > 0) {
      collectedJobs.push(...jobicyResult.value);
      sourceReports.push({
        id: 'src-jobicy-remote',
        status: 'sincronizado',
        message: `Consulta concluída: ${jobicyResult.value.length} vagas remotas internacionais obtidas da API Jobicy.`,
        count: jobicyResult.value.length,
        syncedAt: nowIso,
      });
    } else {
      sourceReports.push({
        id: 'src-jobicy-remote',
        status: 'indisponivel',
        message: 'API Jobicy sem resposta neste momento.',
        count: 0,
        syncedAt: nowIso,
      });
    }

    const dedupedAll = deduplicateAndMergeJobs(collectedJobs);
    const payload: SyncPayload = {
      syncedAt: nowIso,
      jobs: parseImportedJobs(dedupedAll.mergedJobs),
      sourceReports,
    };

    cachedSyncResponse = {
      timestampMs: Date.now(),
      payload,
    };
    activeSyncPromise = null;
    return payload;
  })();

  try { return await activeSyncPromise; } finally { activeSyncPromise = null; }
}

export async function createApplication(options: {production?:boolean; sync?:typeof performRealTimeSync; fetchSource?:typeof fetchSourceText; rateLimit?:number; runtime?:RuntimeConfig} = {}) {
  const app = express();
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const sync = options.sync || performRealTimeSync;
  const fetchSource = options.fetchSource || fetchSourceText;
  installSecurity(app,production,options.rateLimit,options.runtime || readRuntimeConfig());
  app.get('/healthz',(_req,res) => res.json({status:'ok'}));
  app.use(express.json({limit:'256kb',strict:true}));
  // Endpoint para sincronizar fontes públicas em tempo real (GET ou POST)
  app.post('/api/sources/sync', async (req, res) => {
    try {
      const forceRefresh = false; // Do not let callers bypass source throttling.
      const payload = await sync(forceRefresh);
      res.json(payload);
    } catch {
      res.status(500).json({ error: 'Falha ao sincronizar fontes em tempo real.' });
    }
  });

  app.get('/api/sources/sync', async (_req, res) => {
    try {
      const payload = await sync(false);
      res.json(payload);
    } catch {
      res.status(500).json({ error: 'Falha ao sincronizar fontes em tempo real.' });
    }
  });

  // Endpoint de extração automática de metadados a partir de URL oficial (Proxy anti-CORS)
  app.post('/api/jobs/extract-url', (req, res, next) => {
    (async () => {
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url : '';
    const urlCheck = validateSafeUrl(rawUrl);
    if (!urlCheck.valid) {
      res.status(400).json({ error: urlCheck.reason || 'Indica um URL válido (https://...).' });
      return;
    }

    try { validateFetchTarget(urlCheck.normalizedUrl); }
    catch { res.status(400).json({ error: 'Domínio não autorizado para extracção automática. Preenche os campos manualmente.' }); return; }

    let html = '';
    let fetchedRemotely = false;
    try {
      const pageRes = await fetchSource(
        urlCheck.normalizedUrl,
        4500,
        'text/html,application/xhtml+xml'
      );
      if (pageRes.ok) {
        html = await pageRes.text();
        fetchedRemotely = true;
      }
    } catch {
      // Fallback to URL structure inference if remote host blocks server fetch
    }

    if (!fetchedRemotely) {
      res.status(422).json({ error: 'A fonte não respondeu. Preenche os campos manualmente; o URL não confirma os dados da vaga.' });
      return;
    }
    const extracted = extractMetadataFromHtml(html, urlCheck.normalizedUrl);
    res.json({
      extracted,
      normalizedUrl: urlCheck.normalizedUrl,
      fetchedRemotely,
    });
    })().catch(next);
  });

    // Endpoint de validação segura para importação manual de anúncio oficial com URL verificável
  app.post('/api/jobs/validate-import', (req, res) => {
    const result = manualImportSchema.safeParse(req.body);
    if(!result.success) {res.status(400).json({error:'Dados inválidos. Confirma cargo, empresa, URL e opções do formulário.'});return;}
    const {title:cleanTitle,company:cleanCompany,province,city,area,contractType,opportunityKind,workMode,experienceLevel,deadline,salaryRange,description,sourceName,canonicalUrl,skills} = result.data;
    const urlValidation = validateSafeUrl(canonicalUrl);
    const nowIso = new Date().toISOString();
    const recordId = `manual-${randomUUID()}`;
    const skillList = (Array.isArray(skills) ? skills : skills.split(',')).map(s => sanitizeText(s,100)).filter(Boolean).slice(0,60);
    const newJob: JobOpportunity = {
      id: recordId,
      title: cleanTitle,
      company: cleanCompany,
      location: `${city || 'Não informado'}, ${province}`,
      province: province,
      city: city || 'Não informado',
      area: area,
      contractType: contractType || 'Não informado',
      opportunityKind: opportunityKind || 'Emprego',
      workMode: workMode,
      remoteOpenToMZ: false,
      experienceLevel: experienceLevel || 'Não informado',
      publishedAt: nowIso.slice(0, 10),
      deadline: deadline ? sanitizeText(deadline, 40) : 'Não informado',
      salaryRange: salaryRange ? sanitizeText(salaryRange, 100) : 'Não informado',
      description: sanitizeText(description || 'Anúncio importado manualmente. Confirma os detalhes na fonte indicada.', 2000),
      responsibilities: ['Consultar anúncio oficial na fonte indicada.'],
      requirements: ['Consultar anúncio oficial na fonte indicada.'],
      desiredSkills: skillList.length > 0 ? skillList : ['Não informado'],
      benefits: ['Não informado'],
      sources: [
        {
          sourceId: recordId,
          sourceName: sanitizeText(sourceName || 'Fonte indicada pelo utilizador', 100),
          canonicalUrl: urlValidation.normalizedUrl,
          verifiedAt: nowIso, // Legacy field: collection time, not employer verification.
          isOfficialCareerPage: false,
        },
      ],
      lastVerifiedAt: nowIso,
      availabilityStatus: 'Por confirmar',
      provenance: 'manual_unverified',
      isDemo: false,
    };

    res.json({ job: parseImportedJobs([newJob])[0] });
  });

  app.use('/api',(_req,res) => {res.status(404).json({error:'Página não encontrada.'});});
  if (!production) {
    const vite = await createViteServer({server:{middlewareMode:true,fs:{strict:true,allow:[__dirname],deny:['**/.git/**','**/.env*','**/*.pem','**/*.key']}},appType:'spa'});
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname,'dist');
    app.use((req,res,next) => {
      if(/(?:^|\/)(?:\.[^/]+|src|docs|node_modules)(?:\/|$)|\.(?:map|ts|tsx|jsonl|env|md|lock|log|pem|key)$|^\/(?:package(?:-lock)?\.json|tsconfig\.json)/i.test(req.path)) {res.status(404).end();return;}
      next();
    });
    app.use(express.static(distPath,{dotfiles:'deny',index:'index.html'}));
    app.get('/',(_req,res) => res.sendFile(path.join(distPath,'index.html')));
    app.use((_req,res) => res.status(404).send('Página não encontrada.'));
  }
  app.use(safeErrorHandler);
  return app;
}
if(process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  Promise.resolve().then(() => {
    const runtime = readRuntimeConfig();
    return createApplication({runtime}).then(app => {
    const server = app.listen(runtime.port,runtime.host,() => console.log(`VagasMZ disponível em ${runtime.publicOrigin || `http://127.0.0.1:${runtime.port}`}`));
    server.on('error',() => {console.error('Não foi possível abrir a porta do VagasMZ.');process.exitCode=1;});
    for (const signal of ['SIGTERM','SIGINT'] as const) process.once(signal,() => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1),10000).unref();
    });
    performRealTimeSync(false).catch(() => {});
    });
  }).catch(() => {console.error('Não foi possível iniciar o VagasMZ.');process.exitCode=1;});
}
