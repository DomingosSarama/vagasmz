import React from 'react';
import { ArrowRight, Bookmark, BriefcaseBusiness, CircleDollarSign, Clock3, MapPin, ShieldQuestion } from 'lucide-react';
import type { JobOpportunity } from '../types/index.ts';
import { evaluateDeadlineStatus, type HeuristicMatchResult } from '../utils/careerLogic.ts';

interface JobCardProps {
  job: JobOpportunity; match?: HeuristicMatchResult; matchResult?: HeuristicMatchResult;
  isSaved: boolean; hasApplication: boolean; onToggleSave: (jobId: string) => void; onSelectJob: (job: JobOpportunity) => void;
  onQuickApply?: (job: JobOpportunity) => void; onTrackApplication?: (job: JobOpportunity) => void; asGridCell?: boolean; editorialRow?: boolean;
}
const emblemTones = ['coral', 'orange', 'blue', 'teal', 'violet', 'gold'];
export const JobCard: React.FC<JobCardProps> = ({ job, match, matchResult, isSaved, hasApplication, onToggleSave, onSelectJob, onQuickApply, onTrackApplication }) => {
  const score = match || matchResult; const track = onQuickApply || onTrackApplication;
  const deadline = evaluateDeadlineStatus(job.deadline);
  const knownSalary = job.salaryRange && job.salaryRange !== 'Não informado';
  const deadlineDate = new Date(job.deadline);
  const knownDeadline = job.deadline && job.deadline !== 'Não informado' && !Number.isNaN(deadlineDate.getTime());
  const date = knownDeadline ? new Intl.DateTimeFormat('pt-MZ', { day: 'numeric', month: 'short', timeZone: 'Africa/Maputo' }).format(deadlineDate).replace('.', '') : '';
  const initials = job.company.replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'MZ';
  const tone = emblemTones[Array.from(job.company).reduce((sum, char) => sum + char.charCodeAt(0), 0) % emblemTones.length];
  const skills = job.desiredSkills.filter(skill => skill && skill !== 'Não informado');
  const status = job.isDemo ? 'Exemplo' : deadline.status === 'Expirada' ? 'Encerrada' : 'Anúncio por confirmar';
  return <article className={`opportunity-card ${isSaved ? 'is-saved' : ''}`} aria-label={`${job.title} — ${job.company}`}>
    <div className="opportunity-company"><span className={`company-monogram tone-${tone}`} aria-hidden="true">{initials}</span><span className="company-identity"><span className="company-name" title={job.company}>{job.company}</span><span className="company-status">{status}</span></span><span className={`provenance-icon ${job.isDemo ? 'is-demo' : ''}`} title={status} aria-label={status}><ShieldQuestion /></span><button className={`save-opportunity ${isSaved ? 'is-saved' : ''}`} onClick={() => onToggleSave(job.id)} title={isSaved ? 'Remover das vagas guardadas' : 'Guardar vaga'} aria-label={isSaved ? 'Remover das vagas guardadas' : 'Guardar vaga'} aria-pressed={isSaved}><Bookmark fill={isSaved ? 'currentColor' : 'none'} /></button></div>
    {isSaved && <span className="saved-opportunity-label">Guardada</span>}
    <h3 className="opportunity-title"><button onClick={() => onSelectJob(job)}>{job.title}</button></h3>
    <div className="opportunity-facts"><span title={job.location}><MapPin />{job.city && job.city !== 'Não informado' ? job.city : job.province !== 'Não informado' ? job.province : 'Não informado'}</span><span><BriefcaseBusiness />{job.workMode === 'Não informado' ? 'Por confirmar' : job.workMode}</span><span><Clock3 />{job.opportunityKind === 'Estágio' ? 'Estágio' : job.contractType === 'Não informado' ? job.opportunityKind : job.contractType}</span></div>
    <p className="opportunity-description">{job.description.replace(/^\[Registo de Demonstração\]\s*/i, '') || 'Consulta o anúncio na fonte para conhecer os requisitos e as condições.'}</p>
    <div className="opportunity-skills">{skills.slice(0, 4).map(skill => <span key={skill}>{skill}</span>)}{skills.length > 4 && <span title={skills.slice(4).join(', ')}>+{skills.length - 4}</span>}</div>
    <div className="opportunity-terms"><span title={knownSalary ? job.salaryRange : 'Salário não divulgado'}><CircleDollarSign />{knownSalary ? job.salaryRange : 'Salário não divulgado'}</span><span className={deadline.status === 'Expirada' ? 'is-expired' : ''}><Clock3 />{knownDeadline ? `${deadline.status === 'Expirada' ? 'Encerrou' : 'Encerra'} a ${date}` : 'Prazo não informado'}</span></div>
    {(hasApplication || (score && score.scorePercent >= 75)) && <div className="opportunity-provenance">{hasApplication ? <span className="tracked-label">Na tua lista</span> : score && <span title={score.explanation}>{score.scorePercent}% compatível</span>}</div>}
    <div className="opportunity-actions"><button className="view-opportunity" onClick={() => onSelectJob(job)}>Ver oportunidade <ArrowRight /></button>{track && <button className="track-opportunity" disabled={hasApplication} onClick={() => track(job)} title={hasApplication ? 'Já está nas tuas candidaturas' : 'Adicionar às tuas candidaturas sem enviar à empresa'} aria-label={hasApplication ? 'Candidatura acompanhada' : `Acompanhar ${job.title}`}><BriefcaseBusiness /></button>}</div>
  </article>;
};
