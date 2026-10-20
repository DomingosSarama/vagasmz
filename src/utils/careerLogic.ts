import { isPublicHost } from './publicAddress.ts';
import type {
  CareerAlert,
  JobApplicationRecord,
  JobFilterState,
  JobOpportunity,
  OpportunityKind,
  ProfessionalArea,
  ProvinceMZ,
  UserProfile,
} from '../types/index.ts';

/**
 * Sanitizes plain text input against XSS injection vectors.
 */
export function sanitizeText(input: string, maxLength = 2000): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates that a URL is safe (http/https only, no javascript:, data:, vbscript: or local file schemes).
 */
export function validateSafeUrl(rawUrl: string): { valid: boolean; normalizedUrl: string; reason?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, normalizedUrl: '', reason: 'URL vazio ou inválido.' };
  }
  const trimmed = rawUrl.trim();
  if (/[\u0000-\u0020\u007f]/.test(trimmed) || trimmed.length > 2048) {
    return { valid: false, normalizedUrl: '', reason: 'O URL contém caracteres inválidos ou é demasiado longo.' };
  }
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return { valid: false, normalizedUrl: '', reason: 'Protocolo de URL bloqueado por motivos de segurança.' };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.username || parsed.password) {
      return { valid: false, normalizedUrl: '', reason: 'URLs com credenciais não são permitidos.' };
    }
    if (!isPublicHost(parsed.hostname)) return { valid: false, normalizedUrl: '', reason: 'Usa um endereço público da fonte do anúncio.' };
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, normalizedUrl: '', reason: 'Apenas URLs HTTP/HTTPS são permitidos.' };
    }
    parsed.hash = '';
    // Strip common tracking query parameters for canonical comparison
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    trackingParams.forEach((p) => parsed.searchParams.delete(p));
    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }
    return { valid: true, normalizedUrl: parsed.toString().replace(/\/$/, '') };
  } catch {
    return { valid: false, normalizedUrl: '', reason: 'Formato de URL inválido. Inclui https://' };
  }
}

/**
 * Enforces payload size limit (default 512 KB) for JSON/manual imports.
 */
export function validateImportPayloadSize(payload: string, maxBytes = 512 * 1024): boolean {
  if (typeof payload !== 'string') return false;
  return new TextEncoder().encode(payload).byteLength <= maxBytes;
}

/**
 * Normalizes a string for duplicate detection (lowercase, no accents, alphanumeric only).
 */
export function normalizeIdentifier(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes deadline status relative to reference date.
 */
export function evaluateDeadlineStatus(
  deadline: string,
  referenceDateIso: string = new Date().toISOString()
): {
  status: 'Activa' | 'Prazo próximo' | 'Expirada' | 'Por confirmar';
  daysRemaining: number | null;
} {
  if (!deadline || deadline === 'Não informado') {
    return { status: 'Por confirmar', daysRemaining: null };
  }
  const ref = new Date(referenceDateIso);
  const target = new Date(deadline);
  if (!Number.isFinite(ref.getTime()) || !Number.isFinite(target.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(deadline) || target.toISOString().slice(0,10) !== deadline) {
    return { status: 'Por confirmar', daysRemaining: null };
  }
  // Date-only deadlines include the entire local calendar day in Mozambique.
  const mzDate = new Date(ref.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const daysRemaining = Math.round((Date.parse(deadline.slice(0, 10)) - Date.parse(mzDate)) / 86400000);
  if (daysRemaining < 0) {
    return { status: 'Expirada', daysRemaining };
  }
  if (daysRemaining <= 7) {
    return { status: 'Prazo próximo', daysRemaining };
  }
  return { status: 'Activa', daysRemaining };
}

/**
 * Determines whether two JobOpportunity records represent the same real-world job opening.
 * Avoids merging different openings that merely share similar titles at different locations or contract types.
 */
export function areJobsDuplicates(a: JobOpportunity, b: JobOpportunity): boolean {
  // Never merge a demonstration record with a real verified record
  if (a.isDemo !== b.isDemo) return false;

  // 1. Check canonical URL overlap across sources
  const aUrls = new Set(
    a.sources
      .map((s) => validateSafeUrl(s.canonicalUrl).normalizedUrl)
      .filter(Boolean)
  );
  for (const s of b.sources) {
    const normUrl = validateSafeUrl(s.canonicalUrl).normalizedUrl;
    if (normUrl && aUrls.has(normUrl)) {
      return true;
    }
  }

  // 2. Check exact sourceId overlap
  const aSourceIds = new Set(a.sources.map((s) => `${s.sourceName}::${s.sourceId}`));
  for (const s of b.sources) {
    if (s.sourceId && aSourceIds.has(`${s.sourceName}::${s.sourceId}`)) {
      return true;
    }
  }

  // 3. Check normalized company + title + province + contractType + close publication date
  const sameCompany = normalizeIdentifier(a.company) === normalizeIdentifier(b.company);
  const sameTitle = normalizeIdentifier(a.title) === normalizeIdentifier(b.title);
  const sameProvince = a.province === b.province;
  const sameCity = normalizeIdentifier(a.city) === normalizeIdentifier(b.city);
  const sameKind = a.opportunityKind === b.opportunityKind;

  if (sameCompany && sameTitle && sameProvince && sameCity && sameKind) {
    const dateA = new Date(a.publishedAt).getTime();
    const dateB = new Date(b.publishedAt).getTime();
    if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
      const daysApart = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
      if (daysApart <= 21) return true;
    } else {
      return true;
    }
  }

  return false;
}

/**
 * Deduplicates a list of JobOpportunities, merging their `sources` references into a single unified record.
 */
export function deduplicateAndMergeJobs(jobs: JobOpportunity[]): {
  mergedJobs: JobOpportunity[];
  duplicatesMergedCount: number;
} {
  const result: JobOpportunity[] = [];
  let duplicatesMergedCount = 0;

  for (const incoming of jobs) {
    const existingIdx = result.findIndex((existing) => areJobsDuplicates(existing, incoming));
    if (existingIdx === -1) {
      result.push({
        ...incoming,
        sources: [...incoming.sources],
      });
    } else {
      duplicatesMergedCount++;
      const existing = result[existingIdx];
      const existingSourceKeys = new Set(
        existing.sources.map((s) => `${s.sourceName}|${validateSafeUrl(s.canonicalUrl).normalizedUrl}`)
      );
      const mergedSources = [...existing.sources];
      for (const src of incoming.sources) {
        const key = `${src.sourceName}|${validateSafeUrl(src.canonicalUrl).normalizedUrl}`;
        if (!existingSourceKeys.has(key)) {
          mergedSources.push(src);
          existingSourceKeys.add(key);
        }
      }
      result[existingIdx] = {
        ...existing,
        sources: mergedSources,
        lastVerifiedAt:
          incoming.lastVerifiedAt > existing.lastVerifiedAt
            ? incoming.lastVerifiedAt
            : existing.lastVerifiedAt,
      };
    }
  }

  return { mergedJobs: result, duplicatesMergedCount };
}

export interface HeuristicMatchResult {
  scorePercent: number;
  matchedCriteria: string[];
  matchedSkills: string[];
  missingSkills: string[];
  explanation: string;
}

/**
 * Transparent heuristic matcher between UserProfile and JobOpportunity.
 * Never claims AI validation; explicitly explains every criterion used and identifies skill gaps.
 */
export function computeJobMatch(job: JobOpportunity, profile: UserProfile): HeuristicMatchResult {
  let points = 0;
  const maxPoints = 100;
  const matchedCriteria: string[] = [];

  // 1. Área de interesse (35 pts)
  if (profile.areasOfInterest.includes(job.area)) {
    points += 35;
    matchedCriteria.push(job.area);
  }

  // 2. Competências e tecnologias (25 pts) + Análise de Lacunas (Skill Gap)
  const profileSkillsNorm = profile.skills.map((s) => normalizeIdentifier(s)).filter(Boolean);
  const jobTextNorm = normalizeIdentifier(
    [job.title, job.description, ...job.desiredSkills, ...job.requirements].join(' ')
  );
  const matchedSkills = profile.skills.filter((_, idx) => {
    const norm = profileSkillsNorm[idx];
    return norm && jobTextNorm.includes(norm);
  });

  const missingSkills = (job.desiredSkills || []).filter((desired) => {
    const normDesired = normalizeIdentifier(desired);
    if (!normDesired || normDesired === 'nao informado') return false;
    return !profileSkillsNorm.some(
      (ps) => ps === normDesired || ps.includes(normDesired) || normDesired.includes(ps)
    );
  });

  if (matchedSkills.length > 0) {
    const skillScore = Math.min(25, matchedSkills.length * 10);
    points += skillScore;
    matchedCriteria.push(`competências (${matchedSkills.slice(0, 3).join(', ')})`);
  }

  // 3. Localização / Província ou Remoto (20 pts)
  if (
    profile.preferredProvinces.includes(job.province) ||
    profile.preferredProvinces.includes('Todo Moçambique')
  ) {
    points += 20;
    matchedCriteria.push(job.province);
  } else if (profile.openToRemote && (job.workMode === 'Remoto' || job.remoteOpenToMZ)) {
    points += 18;
    matchedCriteria.push('trabalho remoto');
  }

  // 4. Tipo de oportunidade / Estágio (10 pts)
  if (profile.interestedInInternships && job.opportunityKind === 'Estágio') {
    points += 10;
    matchedCriteria.push('estágio');
  } else if (profile.preferredContracts.includes(job.contractType)) {
    points += 10;
    matchedCriteria.push(job.contractType.toLowerCase());
  }

  // 5. Nível de experiência (10 pts)
  if (job.experienceLevel === profile.experienceLevel) {
    points += 10;
    matchedCriteria.push(`nível ${job.experienceLevel}`);
  } else if (
    profile.experienceLevel === 'Estudante / Estágio' &&
    job.experienceLevel === 'Júnior / Entry-Level'
  ) {
    points += 6;
  }

  const scorePercent = Math.min(maxPoints, Math.round(points));

  const explanation =
    matchedCriteria.length > 0
      ? `Recomendada porque corresponde às tuas preferências de ${matchedCriteria.join(', ')}. (Pontuação heurística: ${scorePercent}% baseada em critérios explícitos do teu perfil).`
      : `Correspondência heurística parcial (${scorePercent}%). Ajusta as tuas áreas de interesse ou competências no Perfil para afinar recomendações.`;

  return {
    scorePercent,
    matchedCriteria,
    matchedSkills,
    missingSkills,
    explanation,
  };
}

/**
 * Filters and sorts jobs according to combinable filter criteria.
 */
export function filterAndSortJobs(
  jobs: JobOpportunity[],
  filters: JobFilterState,
  profile: UserProfile,
  referenceDateIso: string = new Date().toISOString()
): JobOpportunity[] {
  const queryNorm = normalizeIdentifier(filters.query);
  const cityNorm = normalizeIdentifier(filters.city);
  const refTime = new Date(referenceDateIso).getTime();

  const filtered = jobs.filter((job) => {
    if (!filters.includeDemo && job.isDemo) {
      return false;
    }

    if (queryNorm) {
      const searchable = normalizeIdentifier(
        [
          job.title,
          job.company,
          job.location,
          job.province,
          job.city,
          job.area,
          job.description,
          ...job.desiredSkills,
          ...job.requirements,
        ].join(' ')
      );
      const terms = queryNorm.split(' ').filter(Boolean);
      const allMatch = terms.every((t) => searchable.includes(t));
      if (!allMatch) return false;
    }

    if (filters.province !== 'Todas') {
      if (filters.province === 'Remoto') {
        if (job.workMode !== 'Remoto' && !job.remoteOpenToMZ) return false;
      } else if (filters.province !== 'Todo Moçambique') {
        if (job.province !== filters.province && job.province !== 'Todo Moçambique') return false;
      }
    }

    if (cityNorm) {
      const jobLocNorm = normalizeIdentifier(`${job.city} ${job.location}`);
      if (!jobLocNorm.includes(cityNorm)) return false;
    }

    if (filters.area !== 'Todas' && job.area !== filters.area) {
      return false;
    }

    if (filters.contractType !== 'Todos' && job.contractType !== filters.contractType) {
      return false;
    }

    if (filters.opportunityKind !== 'Todos' && job.opportunityKind !== filters.opportunityKind) {
      return false;
    }

    if (filters.workMode !== 'Todos' && job.workMode !== filters.workMode) {
      return false;
    }

    if (filters.experienceLevel !== 'Todos' && job.experienceLevel !== filters.experienceLevel) {
      return false;
    }

    if (filters.publishedWithinDays !== 'all') {
      const pubTime = new Date(job.publishedAt).getTime();
      if (!Number.isNaN(pubTime)) {
        const diffDays = (refTime - pubTime) / (1000 * 60 * 60 * 24);
        if (diffDays > filters.publishedWithinDays) return false;
      }
    }

    if (filters.onlyActiveDeadlines) {
      const dl = evaluateDeadlineStatus(job.deadline, referenceDateIso);
      if (dl.status === 'Expirada') return false;
    }

    if (filters.onlyDisclosedSalary) {
      if (!job.salaryRange || job.salaryRange === 'Não informado') return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    if (filters.sortBy === 'company') {
      return a.company.localeCompare(b.company, 'pt');
    }
    if (filters.sortBy === 'deadline') {
      const aHasDl = a.deadline && a.deadline !== 'Não informado';
      const bHasDl = b.deadline && b.deadline !== 'Não informado';
      if (aHasDl && !bHasDl) return -1;
      if (!aHasDl && bHasDl) return 1;
      if (aHasDl && bHasDl) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return 0;
    }
    if (filters.sortBy === 'match') {
      const scoreA = computeJobMatch(a, profile).scorePercent;
      const scoreB = computeJobMatch(b, profile).scorePercent;
      return scoreB - scoreA;
    }
    // Default: 'recent' — prioritize national Mozambican jobs ahead of international remote listings, then by date
    const aIsLocalMz = a.province !== 'Remoto' ? 1 : 0;
    const bIsLocalMz = b.province !== 'Remoto' ? 1 : 0;
    if (aIsLocalMz !== bIsLocalMz) {
      return bIsLocalMz - aIsLocalMz;
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

/**
 * Generates internal CareerAlerts from jobs, saved jobs, applications, and user profile.
 */
export function generateCareerAlerts(
  jobs: JobOpportunity[],
  savedJobIds: string[],
  applications: JobApplicationRecord[],
  profile: UserProfile,
  referenceDateIso: string = new Date().toISOString()
): CareerAlert[] {
  const alerts: CareerAlert[] = [];
  const savedSet = new Set(savedJobIds);

  // 1. Prazos próximos em vagas guardadas ou em destaque
  for (const job of jobs.filter(item => !item.isDemo)) {
    const dl = evaluateDeadlineStatus(job.deadline, referenceDateIso);
    if (dl.daysRemaining !== null && dl.daysRemaining >= 0 && dl.daysRemaining <= 7) {
      const isSaved = savedSet.has(job.id);
      alerts.push({
        id: `alert-dl-${job.id}`,
        type: 'prazo_proximo',
        severity: dl.daysRemaining <= 3 || isSaved ? 'alta' : 'media',
        title: `Prazo a terminar (${dl.daysRemaining === 0 ? 'Hoje' : `${dl.daysRemaining}d`}): ${job.title}`,
        description: `${job.company} · ${job.location}${isSaved ? ' (Vaga guardada)' : ''}. Prazo indicado: ${job.deadline} · Confirma na fonte.`,
        relatedJobId: job.id,
        dateLabel: job.deadline,
        read: false,
      });
    }
  }

  // 2. Entrevistas registadas nas candidaturas
  for (const app of applications.filter(item => !item.isDemo)) {
    for (const interview of app.interviews) {
      if (!interview.completed) {
        alerts.push({
          id: `alert-int-${app.id}-${interview.id}`,
          type: 'entrevista',
          severity: 'alta',
          title: `Entrevista agendada: ${app.jobTitle} na ${app.company}`,
          description: `Formato: ${interview.format} · Data: ${interview.date}. ${interview.notes || 'Prepara o teu portefólio e exemplos técnicos.'}`,
          relatedApplicationId: app.id,
          dateLabel: interview.date,
          read: false,
        });
      }
    }

    // 3. Candidaturas que precisam de acompanhamento
    if (app.status === 'Candidatura enviada' || app.status === 'Em análise' || app.status === 'Pretendo candidatar-me') {
      alerts.push({
        id: `alert-followup-${app.id}`,
        type: 'acompanhamento',
        severity: app.status === 'Pretendo candidatar-me' ? 'alta' : 'media',
        title: `Acompanhamento de candidatura: ${app.jobTitle}`,
        description: `Estado actual: "${app.status}" (${app.company}). Próxima acção: ${app.nextAction || 'Verificar resposta ou actualizar estado.'}`,
        relatedApplicationId: app.id,
        dateLabel: app.updatedAt.slice(0, 10),
        read: false,
      });
    }
  }

  // 4. Estágios relevantes e vagas de alta correspondência heurística
  for (const job of jobs.filter(item => !item.isDemo)) {
    const match = computeJobMatch(job, profile);
    if (job.opportunityKind === 'Estágio' && match.scorePercent >= 50 && evaluateDeadlineStatus(job.deadline,referenceDateIso).status !== 'Expirada') {
      alerts.push({
        id: `alert-intern-${job.id}`,
        type: 'estagio_relevante',
        severity: 'info',
        title: `Estágio relevante em ${job.area}: ${job.title}`,
        description: `${job.company} (${job.location}). ${match.explanation}`,
        relatedJobId: job.id,
        dateLabel: job.publishedAt,
        read: false,
      });
    }
  }

  return alerts;
}

/**
 * Infers Mozambican province from free-text location or title.
 */
export function inferProvinceFromText(text: string): ProvinceMZ {
  const lower = (text || '').toLowerCase();
  if (lower.includes('beira') || lower.includes('sofala')) return 'Sofala';
  if (lower.includes('nampula') || lower.includes('nacala')) return 'Nampula';
  if (lower.includes('pemba') || lower.includes('cabo delgado')) return 'Cabo Delgado';
  if (lower.includes('tete')) return 'Tete';
  if (lower.includes('quelimane') || lower.includes('zambezia') || lower.includes('zambézia')) return 'Zambézia';
  if (lower.includes('chimoio') || lower.includes('manica')) return 'Manica';
  if (lower.includes('inhambane') || lower.includes('maxixe') || lower.includes('temane')) return 'Inhambane';
  if (lower.includes('xai-xai') || lower.includes('gaza')) return 'Gaza';
  if (lower.includes('lichinga') || lower.includes('niassa')) return 'Niassa';
  if (lower.includes('matola') || lower.includes('boane') || lower.includes('beluluane')) return 'Maputo Província';
  if (lower.includes('maputo')) return 'Maputo Cidade';
  if (lower.includes('remote') || lower.includes('remoto') || lower.includes('worldwide')) return 'Remoto';
  return 'Não informado';
}

/**
 * Infers ProfessionalArea from job title or description text.
 */
export function inferAreaFromText(text: string): ProfessionalArea {
  const lower = (text || '').toLowerCase();
  if (
    lower.includes('cyber') ||
    lower.includes('cibersegurança') ||
    lower.includes('ciberseguranca') ||
    lower.includes('segurança da informação') ||
    lower.includes('segurança informática') ||
    lower.includes('infosec') ||
    lower.includes('soc analyst')
  ) {
    return 'Cybersecurity';
  }
  if (lower.includes('software') || lower.includes('developer') || lower.includes('frontend') || lower.includes('backend') || lower.includes('fullstack') || lower.includes('programador')) return 'Software Engineering';
  if (lower.includes('database') || lower.includes('dba') || lower.includes('bases de dados') || lower.includes('postgres')) return 'Database Administration';
  if (lower.includes('data') || lower.includes('analytics') || lower.includes('dados') || lower.includes('statistic') || lower.includes('power bi') || lower.includes('gestão de informação') || lower.includes('meal')) return 'Data Analysis';
  if (lower.includes('sql')) return 'Database Administration';
  if (lower.includes('network') || lower.includes('rede') || lower.includes('cisco')) return 'Network Engineering';
  if (lower.includes('cloud') || lower.includes('devops') || lower.includes('aws') || lower.includes('kubernetes')) return 'Cloud Computing';
  if (lower.includes('ai ') || lower.includes('machine learning') || lower.includes('artificial intelligence')) return 'Artificial Intelligence';
  if (lower.includes('telecom')) return 'Telecommunications';
  if (lower.includes('support') || lower.includes('helpdesk') || lower.includes('ict') || lower.includes('it officer') || lower.includes('suporte') || lower.includes('informática')) return 'IT Support';
  if (lower.includes('system') || lower.includes('sistemas')) return 'Systems Analysis';
  if (lower.includes('finance') || lower.includes('account') || lower.includes('contabil') || lower.includes('finanças') || lower.includes('orçamento')) return 'Contabilidade e Finanças';
  if (lower.includes('logistic') || lower.includes('supply chain') || lower.includes('procurement') || lower.includes('logística') || lower.includes('demand planning') || lower.includes('frota')) return 'Logística';
  if (lower.includes('health') || lower.includes('medical') || lower.includes('saúde') || lower.includes('nutrition') || lower.includes('laboratório')) return 'Saúde';
  if (lower.includes('education') || lower.includes('educação') || lower.includes('training') || lower.includes('ensino')) return 'Educação';
  if (lower.includes('hr') || lower.includes('human resources') || lower.includes('recursos humanos')) return 'Recursos Humanos';
  if (lower.includes('engineer') || lower.includes('engenh') || lower.includes('mechanic') || lower.includes('mecânico') || lower.includes('construção')) return 'Engenharia';
  if (lower.includes('admin') || lower.includes('programme') || lower.includes('project') || lower.includes('propostas') || lower.includes('consultor') || lower.includes('legal')) return 'Administração';
  return 'Information Technology';
}

/**
 * Generates a formal Mozambican Portuguese cover letter / email application draft tailored to the job and profile.
 */
export function generateCoverLetterDraft(
  job: JobOpportunity,
  profile: UserProfile
): { subject: string; body: string } {
  const candidateName = profile.name?.trim() || '[O Teu Nome Completo]';
  const education = profile.education?.trim() || '[indica a tua formação]';
  const match = computeJobMatch(job, profile);
  const relevantSkills =
    match.matchedSkills.length > 0
      ? match.matchedSkills.join(', ')
      : profile.skills.slice(0, 4).join(', ') || '[indica competências que realmente possuis]';

  const isInternship = job.opportunityKind === 'Estágio' || job.opportunityKind === 'Trainee';
  const roleContext = isInternship
    ? `ao programa de ${job.opportunityKind.toLowerCase()} "${job.title}"`
    : `à vaga de "${job.title}"`;

  const subject = `Candidatura: ${job.title} — ${candidateName}`;

  const body = `Exmo.(a) Senhor(a) Gestor(a) de Recrutamento da ${job.company},

Venho por este meio apresentar a minha candidatura ${roleContext}, localizada em ${job.location}, conforme anúncio divulgado.

Possuo formação em ${education} (${profile.experienceLevel}) e acompanho de perto o impacto da ${job.company} no sector de ${job.area} em Moçambique. Ao longo do meu percurso académico e prático, desenvolvi competências directas em ${relevantSkills}, que considero alinhadas com os requisitos técnicos desta oportunidade.

Estou disponível para prestar esclarecimentos adicionais. [Confirma a tua disponibilidade e indica apenas os documentos que decidires anexar, conforme o pedido da entidade.]

Agradeço desde já a atenção dispensada à minha candidatura.

Com os melhores cumprimentos,

${candidateName}
Localização preferencial: ${profile.preferredProvinces.slice(0, 2).join(', ')}`;

  return { subject, body };
}

/**
 * Generates RFC 5545 .ics calendar file content for a job deadline or scheduled interview.
 */
export function generateIcsCalendarContent(params: {
  title: string;
  description: string;
  dateIso: string;
  location?: string;
  url?: string;
}): string {
  const datePart = (params.dateIso || '').slice(0,10);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(datePart) && Number.isFinite(Date.parse(datePart)) && new Date(datePart).toISOString().slice(0,10) === datePart;
  const cleanDate = validDate ? datePart.replace(/-/g, '') : '';
  const fallbackDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const dt = cleanDate.length === 8 ? cleanDate : fallbackDate;
  const end = new Date(`${dt.slice(0,4)}-${dt.slice(4,6)}-${dt.slice(6,8)}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate()+1);
  const endDate = end.toISOString().slice(0,10).replace(/-/g,'');
  const uid = `vagasmz-${dt}-${Math.random().toString(36).slice(2, 9)}@vagasmz.local`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const escapeIcs = (str: string) =>
    sanitizeText(str, 600)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r\n|\r|\n/g, '\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VagasMZ//Gestao de Carreira Mocambique//PT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dt}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${escapeIcs(params.title)}`,
    `DESCRIPTION:${escapeIcs(params.description)}${params.url ? `\\nLink: ${escapeIcs(validateSafeUrl(params.url).normalizedUrl)}` : ''}`,
    `LOCATION:${escapeIcs(params.location || 'Moçambique')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/**
 * Extracts job metadata from raw HTML (JSON-LD JobPosting, OpenGraph tags, <title>, meta description)
 * or falls back cleanly to URL hostname/slug inference.
 */
export function extractMetadataFromHtml(html: string, rawUrl: string): {
  title: string;
  company: string;
  province: ProvinceMZ;
  city: string;
  area: ProfessionalArea;
  opportunityKind: OpportunityKind;
  description: string;
  sourceName: string;
  skills: string;
  deadline: string;
} {
  let title = '';
  let company = '';
  let description = '';
  let deadline = '';
  let locationText = '';
  let skillsList: string[] = [];

  // 1. Try JSON-LD JobPosting if present
  const ldMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of ldMatches) {
    try {
      const inner = block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
      const parsed = JSON.parse(inner);
      const items = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];
      for (const item of items) {
        if (item && (item['@type'] === 'JobPosting' || String(item['@type']).includes('JobPosting'))) {
          if (item.title) title = sanitizeText(String(item.title), 180);
          if (item.hiringOrganization?.name) {
            company = sanitizeText(String(item.hiringOrganization.name), 140);
          }
          if (item.description) {
            description = sanitizeText(String(item.description), 1200);
          }
          if (item.validThrough) {
            deadline = String(item.validThrough).slice(0, 10);
          }
          const loc = item.jobLocation?.address?.addressLocality || item.jobLocation?.address?.addressRegion;
          if (loc) locationText = sanitizeText(String(loc), 100);
          if (item.skills) {
            skillsList = String(item.skills)
              .split(',')
              .map((s) => sanitizeText(s, 40))
              .filter(Boolean);
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }

  // 2. Fallback to OpenGraph and standard meta tags
  const extractMeta = (pattern: RegExp): string => {
    const m = html.match(pattern);
    return m && m[1] ? sanitizeText(m[1], 600) : '';
  };

  if (!title) {
    title =
      extractMeta(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      extractMeta(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
      extractMeta(/<title[^>]*>([\s\S]*?)<\/title>/i);
  }


  if (!description) {
    description =
      extractMeta(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      extractMeta(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  }

  // 3. Clean title & infer from URL if needed
  let hostName = 'Fonte indicada';
  try {
    const u = new URL(rawUrl);
    hostName = u.hostname.replace(/^www\./i, '');
    if (!title) {
      const slug = u.pathname
        .split('/')
        .filter(Boolean)
        .pop() || 'Oportunidade Profissional';
      title = sanitizeText(slug.replace(/[-_]/g, ' '), 160);
    }
  } catch {
    // Keep defaults
  }

  // Strip common site suffix in title (e.g., "Software Engineer | Vodacom")
  if (title.includes(' | ') && !company) {
    const parts = title.split(' | ');
    title = parts[0].trim();
  } else if (title.includes(' - ') && title.length > 40) {
    const parts = title.split(' - ');
    title = parts[0].trim();
  }

  const combinedText = `${title} ${company} ${description} ${locationText} ${rawUrl}`;
  const province = inferProvinceFromText(combinedText);
  const city = locationText || 'Não informado';
  const area = inferAreaFromText(combinedText);
  const isIntern = /estágio|estagio|intern|internship/i.test(combinedText);
  const isTrainee = /trainee|graduado|graduate/i.test(combinedText);
  const opportunityKind: OpportunityKind = isIntern ? 'Estágio' : isTrainee ? 'Trainee' : 'Emprego';

  if (skillsList.length === 0) {
    const commonTech = ['TypeScript', 'React', 'SQL', 'Python', 'Linux', 'Java', 'Redes TCP/IP', 'Power BI', 'Excel', 'SAP', 'Docker', 'Cybersecurity'];
    const normCombined = combinedText.toLowerCase();
    skillsList = commonTech.filter((sk) => normCombined.includes(sk.toLowerCase()));
    if (skillsList.length === 0) skillsList = [area];
  }

  return {
    title: title || 'Anúncio por confirmar',
    company: company || '',
    province,
    city,
    area,
    opportunityKind,
    description:
      description ||
      `Metadados extraídos de ${hostName}. Consulta o link original para todos os requisitos.`,
    sourceName: `Website (${hostName})`,
    skills: skillsList.join(', '),
    deadline,
  };
}

/**
 * Decodes common HTML entities (named and numeric) from RSS/XML feeds into clean UTF-8 text.
 */
export function decodeHtmlEntities(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return !Number.isInteger(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff) ? '' : String.fromCodePoint(code);
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return !Number.isInteger(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff) ? '' : String.fromCodePoint(code);
    })
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#038;/gi, '&')
    .replace(/&#8211;/gi, '–')
    .replace(/&#8212;/gi, '—')
    .replace(/&#8216;/gi, '‘')
    .replace(/&#8217;/gi, '’')
    .replace(/&#8220;/gi, '“')
    .replace(/&#8221;/gi, '”')
    .replace(/&#8230;/gi, '…')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

/**
 * Parses a standard RSS 2.0 XML feed from Mozambican job portals into unverified JobOpportunity records.
 */
export function parseMozambiqueRssFeed(
  xml: string,
  sourceName: string,
  sourcePrefix: string,
  nowIso: string = new Date().toISOString()
): JobOpportunity[] {
  if (!xml || typeof xml !== 'string') return [];

  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  const results: JobOpportunity[] = [];

  const skillCatalog = [
    'TypeScript',
    'React',
    'SQL',
    'Python',
    'Java',
    'Linux',
    'Redes TCP/IP',
    'Power BI',
    'Excel',
    'Word',
    'PowerPoint',
    'SAP',
    'Gestão de Projectos',
    'Contabilidade',
    'Logística',
    'Procurement',
    'MEAL',
    'Recursos Humanos',
    'Inglês',
    'Português',
    'CRM',
    'Auditoria',
    'Cibersegurança',
    'Suporte Técnico',
    'Administração',
  ];

  for (let i = 0; i < itemBlocks.length; i++) {
    const block = itemBlocks[i];

    const extractTag = (tag: string): string => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const m = block.match(regex);
      return m && m[1] ? decodeHtmlEntities(m[1]) : '';
    };

    const rawTitle = sanitizeText(extractTag('title'), 180);
    const rawLink = extractTag('link').replace(/#new_tab$/i, '').trim();
    const rawPubDate = extractTag('pubDate');
    const rawDescription = extractTag('description');
    const rawContent = extractTag('content:encoded') || rawDescription;

    const categories = [...block.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((m) =>
      sanitizeText(decodeHtmlEntities(m[1]), 60)
    );

    // Skip non-job blog posts or tips
    if (
      categories.some((c) => /^(dicas|notícias|noticias|uncategorized)$/i.test(c)) ||
      /^(hello world|como elaborar|confira mais|resumo de vagas)/i.test(rawTitle)
    ) {
      continue;
    }

    const urlCheck = validateSafeUrl(rawLink);
    if (!urlCheck.valid || !rawTitle) continue;

    // Extract <li> items from HTML content for responsibilities and requirements
    const liMatches = [...rawContent.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((m) => sanitizeText(decodeHtmlEntities(m[1]), 220))
      .filter((text) => text.length > 8);

    const cleanSummary = sanitizeText(
      rawDescription
        .replace(/The post [\s\S]*? appeared first on [\s\S]*$/i, '')
        .replace(/\s+/g, ' '),
      900
    );

    // Determine Company Name cleanly
    let company = 'Não informado';
    {
      const titleCompanyMatch = rawTitle.match(
        /^A\s+([A-ZÀ-Ú0-9][A-Za-zÀ-ú0-9\s&.-]{1,35}?)\s+(?:Abre\s+vagas|recruta|está\s+a\s+recrutar)/i
      );
      const summaryCompanyMatch = cleanSummary
        .replace(/^The post [\s\S]*$/i, '')
        .match(
          /^(?:The|A|O)\s+([A-ZÀ-Ú][A-Za-zÀ-ú0-9\s&(),.-]{2,40}?)\s+(?:está a recrutar|recruta|is hiring|pretende recrutar|abre vagas)/i
        );
      if (titleCompanyMatch && titleCompanyMatch[1]) {
        company = sanitizeText(titleCompanyMatch[1], 100);
      } else if (
        summaryCompanyMatch &&
        summaryCompanyMatch[1] &&
        !/^post\b/i.test(summaryCompanyMatch[1].trim())
      ) {
        company = sanitizeText(summaryCompanyMatch[1], 100);
      } else if (/concurso p[úu]blico/i.test(rawTitle)) {
        company = 'Concurso Público (Moçambique)';
      } else {
        company = 'Não informado';
      }
    }

    const fullText = `${rawTitle} ${company} ${cleanSummary} ${liMatches.join(' ')} ${categories.join(' ')}`;
    const province = inferProvinceFromText(fullText);
    const city = 'Não informado';

    // Infer area prioritizing job title first so boilerplate footer text doesn't skew classification
    const titleArea = inferAreaFromText(`${rawTitle} ${categories.join(' ')}`);
    const area =
      titleArea !== 'Information Technology'
        ? titleArea
        : inferAreaFromText(`${rawTitle} ${cleanSummary}`);
    const isInternship =
      /est[áa]gio|estagi[áa]rio|intern|internship|apprentice|aprendiz/i.test(
        `${rawTitle} ${categories.join(' ')}`
      );
    const isTrainee = /trainee|graduado|graduate|jovem talento/i.test(
      `${rawTitle} ${categories.join(' ')}`
    );

    const opportunityKind: OpportunityKind = isInternship
      ? 'Estágio'
      : isTrainee
      ? 'Trainee'
      : 'Emprego';

    let publishedAt = nowIso.slice(0, 10);
    if (rawPubDate) {
      const parsedDate = new Date(rawPubDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        publishedAt = parsedDate.toISOString().slice(0, 10);
      }
    }

    const matchedSkills = skillCatalog.filter((sk) =>
      fullText.toLowerCase().includes(sk.toLowerCase())
    );
    const desiredSkills =
      matchedSkills.length >= 2
        ? matchedSkills.slice(0, 6)
        : Array.from(new Set([area, ...matchedSkills, 'Português'])).slice(0, 4);

    const responsibilities =
      liMatches.length > 0
        ? liMatches.slice(0, 5)
        : ['Consultar o anúncio na fonte original para a lista completa de responsabilidades.'];

    const requirements =
      liMatches.length > 5
        ? liMatches.slice(5, 10)
        : liMatches.length > 0
        ? liMatches.slice(-3)
        : ['Consultar os requisitos académicos e documentais na página oficial da vaga.'];

    const slugId =
      urlCheck.normalizedUrl
        .split('/')
        .filter(Boolean)
        .pop()
        ?.replace(/[^a-z0-9-]/gi, '')
        .slice(0, 48) || `item-${i}`;

    results.push({
      id: `${sourcePrefix}-${slugId}`,
      title: rawTitle,
      company,
      location: `${city}, ${province}`,
      province,
      city,
      area,
      contractType: isInternship
        ? 'Estágio Profissional'
        : isTrainee
        ? 'Programa de Trainees'
        : 'Não informado',
      opportunityKind,
      workMode: province === 'Remoto' ? 'Remoto' : 'Não informado',
      remoteOpenToMZ: province === 'Remoto',
      experienceLevel: isInternship
        ? 'Estudante / Estágio'
        : isTrainee
        ? 'Júnior / Entry-Level'
        : 'Não informado',
      publishedAt,
      deadline: 'Não informado',
      salaryRange: 'Não informado',
      description:
        cleanSummary ||
        `Anúncio recolhido para ${company} em Moçambique. Consulta a fonte oficial para submissão de candidatura.`,
      responsibilities,
      requirements,
      desiredSkills,
      benefits: ['Consultar condições salariais e benefícios no anúncio oficial'],
      sources: [
        {
          sourceId: `${sourcePrefix}-${slugId}`,
          sourceName,
          canonicalUrl: urlCheck.normalizedUrl,
          verifiedAt: nowIso,
          isOfficialCareerPage: false,
        },
      ],
      lastVerifiedAt: nowIso,
      availabilityStatus: 'Por confirmar',
      provenance: 'feed_imported',
      isDemo: false,
    });
  }

  return results;
}
