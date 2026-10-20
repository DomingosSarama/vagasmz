import React, { useMemo, useState } from 'react';
import { ArrowRight, Bookmark, BriefcaseBusiness, ChevronDown, Code2, GraduationCap, LayoutGrid, MapPin, Monitor, RefreshCw, Search, Sparkles } from 'lucide-react';
import { ALL_PROFESSIONAL_AREAS, TECH_AREAS, type ActivePage, type DataSourceConfig, type JobApplicationRecord, type JobFilterState, type JobOpportunity, type SavedJobRecord, type UserProfile } from '../types/index.ts';
import { computeJobMatch, evaluateDeadlineStatus, normalizeIdentifier } from '../utils/careerLogic.ts';
import { JobCard } from './JobCard.tsx';

interface DashboardViewProps {
  jobs: JobOpportunity[]; savedRecords: SavedJobRecord[]; applications: JobApplicationRecord[]; profile: UserProfile; sources: DataSourceConfig[];
  isSyncing?: boolean; onSelectJob: (job: JobOpportunity) => void; onToggleSave: (jobId: string) => void; onTrackApplication: (job: JobOpportunity) => void;
  onNavigate: (page: ActivePage) => void; onQuickSearch?: (patch: Partial<JobFilterState>) => void; onSyncSources?: () => void;
}
type QuickFilter = 'all' | 'estagios' | 'tecnologia' | 'remoto' | 'maputo';

export const DashboardView: React.FC<DashboardViewProps> = ({ jobs = [], savedRecords = [], applications = [], profile, sources = [], isSyncing = false, onSelectJob, onToggleSave, onTrackApplication, onNavigate, onQuickSearch, onSyncSources }) => {
  const [query, setQuery] = useState(''); const [quickFilter, setQuickFilter] = useState<QuickFilter>('all'); const [area, setArea] = useState('Todas');
  const saved = useMemo(() => new Set(savedRecords.map(record => record.jobId)), [savedRecords]);
  const tracked = useMemo(() => new Set(applications.map(record => record.jobId)), [applications]);
  const active = useMemo(() => jobs.filter(job => evaluateDeadlineStatus(job.deadline).status !== 'Expirada').map(job => ({ job, match: computeJobMatch(job, profile) })), [jobs, profile]);
  const filtered = useMemo(() => {
    const terms = normalizeIdentifier(query).split(' ').filter(Boolean);
    return active.filter(({ job }) => {
      if (quickFilter === 'estagios' && !['Estágio', 'Trainee'].includes(job.opportunityKind)) return false;
      if (quickFilter === 'tecnologia' && !TECH_AREAS.includes(job.area)) return false;
      if (quickFilter === 'remoto' && job.workMode !== 'Remoto') return false;
      if (quickFilter === 'maputo' && !['Maputo Cidade', 'Maputo Província'].includes(job.province)) return false;
      if (area !== 'Todas' && job.area !== area) return false;
      const text = normalizeIdentifier([job.title, job.company, job.location, job.area, ...job.desiredSkills].join(' '));
      return terms.every(term => text.includes(term));
    });
  }, [active, query, quickFilter, area]);
  const featured = useMemo(() => [...active].filter(({ job }) => !/^(confira|resumo|mais de|veja as)/i.test(job.title)).sort((a, b) => {
    const priority = (job: JobOpportunity) => (job.province !== 'Remoto' ? 20 : 0) + (job.company !== 'Não informado' ? 5 : 0) + (TECH_AREAS.includes(job.area) ? 2 : 0);
    return priority(b.job) - priority(a.job) || b.job.publishedAt.localeCompare(a.job.publishedAt);
  }).slice(0, 4), [active]);
  const internships = useMemo(() => active.filter(({ job }) => ['Estágio', 'Trainee'].includes(job.opportunityKind)).sort((a, b) => b.job.publishedAt.localeCompare(a.job.publishedAt)).slice(0, 4), [active]);
  const recommendations = useMemo(() => profile.skills.length ? [...active].filter(item => item.match.scorePercent >= 70).sort((a, b) => b.match.scorePercent - a.match.scorePercent).slice(0, 4) : [], [active, profile.skills]);
  const recent = useMemo(() => [...active].filter(item => !item.job.isDemo).sort((a, b) => b.job.publishedAt.localeCompare(a.job.publishedAt)).slice(0, 4), [active]);
  const filtering = query.trim() || quickFilter !== 'all' || area !== 'Todas';
  const clear = () => { setQuery(''); setQuickFilter('all'); setArea('Todas'); };
  const card = ({ job, match }: typeof active[number]) => <JobCard key={job.id} job={job} match={match} isSaved={saved.has(job.id)} hasApplication={tracked.has(job.id)} onToggleSave={onToggleSave} onSelectJob={onSelectJob} onQuickApply={onTrackApplication} />;
  const heading = (title: string, description: string, label: string, action: () => void) => <div className="dashboard-section-heading"><div><h2>{title}</h2><p>{description}</p></div><button onClick={action}>{label}<ArrowRight /></button></div>;
  return <div className="reference-dashboard">
    <section className="discovery-hero" aria-labelledby="hero-heading">
      <div className="hero-photograph" aria-hidden="true" />
      <p className="hero-motto" aria-hidden="true">Talento hoje.<br />Um Moçambique maior amanhã.<span /></p>
      <div className="hero-content"><p className="hero-eyebrow">Emprego e estágios em Moçambique</p><h1 id="hero-heading">O teu próximo passo<br /><span>começa aqui.</span></h1><p className="hero-description">Descobre oportunidades de emprego e estágios nas melhores<br className="hero-desktop-break" /> empresas em Moçambique e constrói um futuro com impacto.</p>
        <form className="hero-search" role="search" onSubmit={event => { event.preventDefault(); onQuickSearch?.({ query: query.trim(), ...(area !== 'Todas' ? { area: area as JobFilterState['area'] } : {}) }); onNavigate('explorar'); }}><Search aria-hidden="true" /><input aria-label="Cargo, empresa ou competência" placeholder="Cargo, empresa ou competência" value={query} onChange={event => setQuery(event.target.value)} /><button type="submit" aria-label="Pesquisar vagas"><Search /></button></form>
        <div className="hero-filters">{([{ id: 'estagios', label: 'Estágios', icon: GraduationCap }, { id: 'tecnologia', label: 'Tecnologia', icon: Code2 }, { id: 'remoto', label: 'Remoto', icon: Monitor }, { id: 'maputo', label: 'Maputo', icon: MapPin }] as const).map(({ id, label, icon: Icon }) => <button key={id} className={quickFilter === id ? 'is-selected' : ''} aria-pressed={quickFilter === id} onClick={() => setQuickFilter(quickFilter === id ? 'all' : id)}><Icon />{label}</button>)}<div className="area-filter"><LayoutGrid /><select aria-label="Filtrar por área profissional" value={area} onChange={event => setArea(event.target.value)}><option value="Todas">Todas as áreas</option>{ALL_PROFESSIONAL_AREAS.map(item => <option key={item} value={item}>{item}</option>)}</select><ChevronDown /></div></div>
      </div>
    </section>
    {filtering ? <section className="dashboard-section">{heading(`Resultados da pesquisa (${filtered.length})`, 'Anúncios que correspondem aos filtros seleccionados.', 'Limpar filtros', clear)}{filtered.length ? <div className="reference-grid">{filtered.slice(0, 12).map(card)}</div> : <div className="discovery-empty"><Search /><h3>Nenhuma oportunidade encontrada</h3><p>Experimenta outra pesquisa ou escolhe uma área diferente.</p><button onClick={clear}>Ver todas as oportunidades <ArrowRight /></button></div>}</section> : <>
      <section className="dashboard-section">{heading('Oportunidades em destaque', 'Anúncios seleccionados do catálogo. Confirma os detalhes na fonte.', 'Ver todas as vagas', () => onNavigate('explorar'))}<div className="reference-grid">{featured.map(card)}</div>{!featured.length && <div className="discovery-empty"><p>{isSyncing ? 'A consultar as fontes de oportunidades...' : 'O catálogo ainda não tem anúncios. Actualiza as fontes para começar.'}</p><button onClick={onSyncSources} disabled={isSyncing}><RefreshCw className={isSyncing ? 'animate-spin' : ''} />Actualizar fontes</button></div>}</section>
      <section className="dashboard-section">{heading('Estágios', 'Começa a tua carreira com estágios e programas de graduados.', 'Ver todos os estágios', () => onNavigate('estagios'))}<div className="reference-grid">{internships.map(card)}</div>{!internships.length && <p className="section-empty-note">Ainda não há estágios no catálogo. Podes voltar a consultar as fontes.</p>}</section>
      {recommendations.length > 0 && <section className="dashboard-section">{heading('Para a tua carreira', 'Recomendações calculadas a partir das tuas preferências.', 'Ajustar o meu perfil', () => onNavigate('perfil'))}<div className="reference-grid">{recommendations.map(card)}</div></section>}
      <section className="dashboard-section">{heading('Oportunidades recentes', 'Novos anúncios recolhidos de feeds e APIs externas.', 'Explorar oportunidades', () => onNavigate('explorar'))}<div className="reference-grid">{recent.map(card)}</div></section>
    </>}
    <section className="career-summary"><div><Sparkles /><div><h2>O próximo passo é teu.</h2><p>Guarda oportunidades e acompanha a tua carreira num só lugar.</p></div></div><nav aria-label="Resumo da tua carreira"><button onClick={() => onNavigate('guardadas')}><Bookmark /><strong>{savedRecords.length}</strong> guardadas</button><button onClick={() => onNavigate('candidaturas')}><BriefcaseBusiness /><strong>{applications.length}</strong> candidaturas</button><button onClick={() => onNavigate('perfil')}>O meu perfil <ArrowRight /></button></nav></section>
    <footer className="dashboard-source-footer"><span>Dados guardados neste navegador · {sources.filter(source => source.lastStatus === 'sincronizado').length} fontes consultadas com sucesso</span><button onClick={onSyncSources} disabled={isSyncing}><RefreshCw className={isSyncing ? 'animate-spin' : ''} />{isSyncing ? 'A actualizar fontes...' : 'Actualizar fontes'}</button></footer>
  </div>;
};
