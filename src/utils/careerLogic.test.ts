import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCareerAlerts,
  sanitizeText,
  validateSafeUrl,
  areJobsDuplicates,
  deduplicateAndMergeJobs,
  computeJobMatch,
  filterAndSortJobs,
  evaluateDeadlineStatus,
  generateCoverLetterDraft,
  generateIcsCalendarContent,
  extractMetadataFromHtml,
  decodeHtmlEntities,
  parseMozambiqueRssFeed,
} from './careerLogic.ts';
import type { JobFilterState, JobOpportunity, UserProfile } from '../types/index.ts';

const sampleProfile: UserProfile = {
  id: 'default',
  name: 'Inácio Mondlane',
  areasOfInterest: ['Software Engineering', 'Cybersecurity'],
  preferredProvinces: ['Maputo Cidade'],
  skills: ['TypeScript', 'React', 'Linux', 'SQL'],
  experienceLevel: 'Estudante / Estágio',
  education: 'Licenciatura em Engenharia Informática (UEM)',
  preferredContracts: ['Estágio Profissional', 'Tempo Inteiro'],
  interestedInInternships: true,
  openToRemote: true,
  updatedAt: '2026-10-17T10:00:00Z',
};

const sampleJobA: JobOpportunity = {
  id: 'job-1',
  title: 'Estagiário de Engenharia de Software (Frontend & APIs)',
  company: 'Vodacom Moçambique',
  location: 'Maputo Cidade',
  province: 'Maputo Cidade',
  city: 'Maputo',
  area: 'Software Engineering',
  contractType: 'Estágio Profissional',
  opportunityKind: 'Estágio',
  workMode: 'Híbrido',
  remoteOpenToMZ: false,
  experienceLevel: 'Estudante / Estágio',
  publishedAt: '2026-10-12',
  deadline: '2026-10-22',
  salaryRange: 'Não informado',
  description: 'Programa de estágio em desenvolvimento web com React e TypeScript.',
  responsibilities: ['Desenvolver interfaces em React'],
  requirements: ['Finalista de Engenharia Informática'],
  desiredSkills: ['TypeScript', 'React', 'Git'],
  benefits: ['Subsídio de estágio'],
  sources: [
    {
      sourceId: 'voda-01',
      sourceName: 'Página Oficial Vodacom',
      canonicalUrl: 'https://careers.vodacom.co.mz/jobs/estagio-software-2026?utm_source=linkedin',
      verifiedAt: '2026-10-17T08:00:00Z',
      isOfficialCareerPage: true,
    },
  ],
  lastVerifiedAt: '2026-10-17T08:00:00Z',
  availabilityStatus: 'Prazo próximo',
  provenance: 'demonstration',
  isDemo: true,
};

test('sanitizeText strips script tags and event handlers cleanly', () => {
  const dirty = '<script>alert("xss")</script><b onclick="evil()">Engenheiro de Redes</b>';
  assert.equal(sanitizeText(dirty), 'Engenheiro de Redes');
});

test('validateSafeUrl blocks javascript: protocol and normalizes tracking params', () => {
  const unsafe = validateSafeUrl('javascript:alert(1)');
  assert.equal(unsafe.valid, false);

  const safe = validateSafeUrl('https://careers.vodacom.co.mz/jobs/123/?utm_source=fb&ref=mz');
  assert.equal(safe.valid, true);
  assert.equal(safe.normalizedUrl, 'https://careers.vodacom.co.mz/jobs/123?ref=mz');
});

test('areJobsDuplicates detects canonical URL and same-company-title-location duplicates without merging distinct cities', () => {
  const duplicateFromPortal: JobOpportunity = {
    ...sampleJobA,
    id: 'job-2',
    sources: [
      {
        sourceId: 'portal-99',
        sourceName: 'Emprego.co.mz',
        canonicalUrl: 'https://careers.vodacom.co.mz/jobs/estagio-software-2026',
        verifiedAt: '2026-10-17T09:00:00Z',
      },
    ],
  };

  const differentCityJob: JobOpportunity = {
    ...sampleJobA,
    id: 'job-3',
    province: 'Sofala',
    city: 'Beira',
    location: 'Beira, Sofala',
    sources: [
      {
        sourceId: 'voda-beira-02',
        sourceName: 'Página Oficial Vodacom',
        canonicalUrl: 'https://careers.vodacom.co.mz/jobs/estagio-software-beira-2026',
        verifiedAt: '2026-10-17T09:00:00Z',
      },
    ],
  };

  assert.equal(areJobsDuplicates(sampleJobA, duplicateFromPortal), true);
  assert.equal(areJobsDuplicates(sampleJobA, differentCityJob), false);

  const merged = deduplicateAndMergeJobs([sampleJobA, duplicateFromPortal, differentCityJob]);
  assert.equal(merged.mergedJobs.length, 2);
  assert.equal(merged.duplicatesMergedCount, 1);
  assert.equal(merged.mergedJobs[0].sources.length, 2);
});

test('computeJobMatch calculates transparent heuristic score, matchedSkills, and missingSkills (skill gap)', () => {
  const match = computeJobMatch(sampleJobA, sampleProfile);
  assert.ok(match.scorePercent >= 80);
  assert.ok(match.explanation.includes('Software Engineering'));
  assert.ok(match.explanation.includes('Maputo Cidade'));
  assert.ok(match.explanation.includes('Pontuação heurística'));
  assert.deepEqual(match.matchedSkills, ['TypeScript', 'React']);
  assert.deepEqual(match.missingSkills, ['Git']);
});

test('filterAndSortJobs filters by province, area, and search query accurately', () => {
  const defaultFilters: JobFilterState = {
    query: 'TypeScript',
    province: 'Maputo Cidade',
    city: '',
    area: 'Software Engineering',
    contractType: 'Todos',
    opportunityKind: 'Estágio',
    workMode: 'Todos',
    experienceLevel: 'Todos',
    publishedWithinDays: 'all',
    onlyActiveDeadlines: true,
    onlyDisclosedSalary: false,
    includeDemo: true,
    sortBy: 'match',
  };

  const results = filterAndSortJobs([sampleJobA], defaultFilters, sampleProfile, '2026-10-17T12:00:00Z');
  assert.equal(results.length, 1);

  const noMatchFilters: JobFilterState = {
    ...defaultFilters,
    province: 'Nampula',
  };
  const emptyResults = filterAndSortJobs([sampleJobA], noMatchFilters, sampleProfile, '2026-10-17T12:00:00Z');
  assert.equal(emptyResults.length, 0);
});

test('evaluateDeadlineStatus identifies approaching and expired deadlines accurately', () => {
  assert.equal(evaluateDeadlineStatus('Não informado').status, 'Por confirmar');
  const soon = evaluateDeadlineStatus('2026-10-20', '2026-10-17T00:00:00Z');
  assert.equal(soon.status, 'Prazo próximo');
  assert.equal(soon.daysRemaining, 3);

  const expired = evaluateDeadlineStatus('2026-10-10', '2026-10-17T00:00:00Z');
  assert.equal(expired.status, 'Expirada');
});

test('RSS does not turn the editor into an employer or invent a city, contract or deadline', () => {
  const xml = '<rss><channel><item><title>Assistente de escritório</title><link>https://emprego.mmo.co.mz/vaga/assistente</link><dc:creator>Editor do portal</dc:creator><description>Consulta o anúncio para mais informação.</description></item></channel></rss>';
  const [job] = parseMozambiqueRssFeed(xml, 'Portal', 'portal');
  assert.equal(job.company, 'Não informado');
  assert.equal(job.city, 'Não informado');
  assert.equal(job.province, 'Não informado');
  assert.equal(job.contractType, 'Não informado');
  assert.equal(job.experienceLevel, 'Não informado');
  assert.equal(job.availabilityStatus, 'Por confirmar');
  assert.equal(validateSafeUrl('https://user:secret@example.com').valid, false);
});

test('generateCoverLetterDraft creates formal Mozambican application draft with matched skills', () => {
  const draft = generateCoverLetterDraft(sampleJobA, sampleProfile);
  assert.ok(draft.subject.includes('Estagiário de Engenharia de Software'));
  assert.ok(draft.subject.includes('Inácio Mondlane'));
  assert.ok(draft.body.includes('Vodacom Moçambique'));
  assert.ok(draft.body.includes('TypeScript, React'));
  assert.ok(!draft.body.includes('BI e NUIT'));
  assert.ok(draft.body.includes('indica apenas os documentos'));
});

test('generateIcsCalendarContent produces valid VCALENDAR with event summary and date', () => {
  const ics = generateIcsCalendarContent({
    title: 'Prazo: Estágio Vodacom',
    description: 'Submeter CV e Carta de Motivação',
    dateIso: '2026-10-22',
    location: 'Maputo Cidade',
  });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261022'));
  assert.ok(ics.includes('SUMMARY:Prazo: Estágio Vodacom'));
  assert.ok(ics.endsWith('END:VCALENDAR'));
});

test('OpenGraph extraction does not turn the publisher into the hiring company or infer a city', () => {
  const html = `
    <html>
      <head>
        <title>Engenheiro de Dados Sénior - Beira | Cornelder</title>
        <meta property="og:site_name" content="Cornelder de Moçambique" />
        <meta name="description" content="Vaga para especialista em SQL, Python e Power BI no Porto da Beira." />
      </head>
      <body></body>
    </html>
  `;
  const meta = extractMetadataFromHtml(html, 'https://www.cornelder.co.mz/carreiras/engenheiro-dados-beira');
  assert.equal(meta.company, '');
  assert.equal(meta.province, 'Sofala');
  assert.equal(meta.city, 'Não informado');
  assert.equal(meta.area, 'Data Analysis');
  assert.ok(meta.skills.includes('SQL'));
  assert.ok(meta.skills.includes('Python'));
});

test('JSON-LD preserves an explicit employer, city and deadline', () => {
  const html = '<script type="application/ld+json">' + JSON.stringify({
    '@type': 'JobPosting', title: 'Engenheiro de Dados', hiringOrganization: { name: 'Entidade de teste' },
    jobLocation: { address: { addressLocality: 'Beira' } }, validThrough: '2026-11-30', skills: 'SQL, Python',
  }) + '</script>';
  const meta = extractMetadataFromHtml(html, 'https://example.com/anuncio');
  assert.equal(meta.company, 'Entidade de teste');
  assert.equal(meta.city, 'Beira');
  assert.equal(meta.deadline, '2026-11-30');
});

test('decodeHtmlEntities and parseMozambiqueRssFeed parse real Mozambican RSS items with zero demo flags', () => {
  assert.equal(decodeHtmlEntities('Coordenador &#8211; Construção &#038; Logística'), 'Coordenador – Construção & Logística');

  const sampleRss = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <channel>
        <item>
          <title>Estagiário de Gestão de Informação (Pemba)</title>
          <link>https://emprego.mmo.co.mz/vaga/estagiario-gestao-informacao-pemba/</link>
          <dc:creator><![CDATA[Save the Children Internacional]]></dc:creator>
          <pubDate>Thu, 15 Oct 2026 18:50:19 +0000</pubDate>
          <category><![CDATA[Estágio]]></category>
          <description><![CDATA[A Save the Children Internacional pretende recrutar para estágio em Pemba, Cabo Delgado para gestão de bases de dados SQL e Excel.]]></description>
          <content:encoded><![CDATA[
            <ul>
              <li>Gerir bases de dados SQL e relatórios em Excel e Power BI na província de Cabo Delgado.</li>
              <li>Apoiar a equipa de Monitoria e Avaliação (MEAL) em Pemba.</li>
            </ul>
          ]]></content:encoded>
        </item>
      </channel>
    </rss>`;

  const parsed = parseMozambiqueRssFeed(sampleRss, 'MMO Emprego Moçambique', 'mmo');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].isDemo, false);
  assert.equal(parsed[0].provenance, 'feed_imported');
  assert.equal(parsed[0].company, 'Save the Children Internacional');
  assert.equal(parsed[0].province, 'Cabo Delgado');
  assert.equal(parsed[0].city, 'Não informado');
  assert.equal(parsed[0].opportunityKind, 'Estágio');
  assert.ok(parsed[0].desiredSkills.includes('SQL'));
  assert.ok(parsed[0].desiredSkills.includes('Excel'));
  assert.equal(parsed[0].responsibilities.length, 2);
});


test('date-only deadlines remain open until the end of the Mozambique day', () => {
  assert.equal(evaluateDeadlineStatus('2026-10-22','2026-10-22T21:59:59Z').daysRemaining,0);
  assert.equal(evaluateDeadlineStatus('2026-10-22','2026-10-22T22:00:00Z').status,'Expirada');
  for(const invalid of ['2026-02-31','garbage','2026-22-01']) assert.equal(evaluateDeadlineStatus(invalid).status,'Por confirmar');
  assert.equal(evaluateDeadlineStatus('2026-10-22','invalid').status,'Por confirmar');
});
test('calendar escapes control injection and ends all-day events on the following date', () => {
  for(const [date,end] of [['2026-12-31','20270101'],['2028-02-29','20280301']]) {
    const ics = generateIcsCalendarContent({title:'Test\rBEGIN:VEVENT',description:'a,b;c',dateIso:date,url:'https://example.com/\r\nBEGIN:VEVENT'});
    assert.equal(ics.split('\r\n').filter(l => l === 'BEGIN:VEVENT').length,1);
    assert.ok(ics.includes(`DTEND;VALUE=DATE:${end}`));
    assert.ok(ics.includes('a\\,b\\;c'));
  }
});
test('public URLs reject private, obfuscated, internal and credentialed addresses', () => {
  for(const value of ['https://127.1','https://2130706433','https://0x7f000001','http://[::ffff:127.0.0.1]','https://10.0.0.1','https://service.internal','https://host.local','https://example.com/\nsecret']) assert.equal(validateSafeUrl(value).valid,false,value);
});
test('malformed HTML entities do not crash an entire source', () => {
  assert.doesNotThrow(() => decodeHtmlEntities('&#9999999999; &#x110000; &#xD800;'));
  assert.equal(decodeHtmlEntities('A &#128512; B'),'A 😀 B');
});
test('cover letter does not invent education or skills from the vacancy', () => {
  const draft = generateCoverLetterDraft(sampleJobA,{...sampleProfile,education:'',skills:[]});
  assert.ok(draft.body.includes('[indica a tua formação]'));
  assert.ok(draft.body.includes('[indica competências que realmente possuis]'));
  assert.ok(!draft.body.includes('Formação Superior relevante'));
});

test('alerts exclude fictional vacancies and demo applications, and never claim official verification', () => {
  const ref='2026-10-20T12:00:00Z';
  assert.equal(generateCareerAlerts([sampleJobA],[],[],sampleProfile,ref).length,0);
  const real={...sampleJobA,isDemo:false,provenance:'feed_imported' as const};
  const alerts=generateCareerAlerts([real],[],[],sampleProfile,ref);
  assert.ok(alerts.length>0);assert.ok(alerts.every(a=>!a.description.includes('Prazo oficial')));
});
