import React, { useState } from 'react';
import {
  Bookmark,
  Briefcase,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Plus,
  X,
} from 'lucide-react';
import type { JobOpportunity, UserProfile } from '../types/index.ts';
import {
  evaluateDeadlineStatus,
  generateCoverLetterDraft,
  generateIcsCalendarContent,
  validateSafeUrl,
  type HeuristicMatchResult,
} from '../utils/careerLogic.ts';
import {
  CompanyEmblem,
  DeadlineBadge,
  MatchRing,
} from './VisualElements.tsx';

interface JobDetailModalProps {
  job: JobOpportunity | null;
  profile?: UserProfile;
  isSaved: boolean;
  hasApplication: boolean;
  matchResult?: HeuristicMatchResult;
  onClose: () => void;
  onToggleSave: (jobId: string) => void;
  onTrackApplication: (job: JobOpportunity) => void;
  onAddSkillToProfile?: (skill: string) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  profile,
  isSaved,
  hasApplication,
  matchResult,
  onClose,
  onToggleSave,
  onTrackApplication,
  onAddSkillToProfile,
}) => {
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [copiedLetter, setCopiedLetter] = useState(false);

  React.useEffect(() => {
    setShowCoverLetter(false);
    setCopiedLetter(false);
  }, [job?.id]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!job) return null;

  const deadlineInfo = evaluateDeadlineStatus(job.deadline);
  const primarySource = job.sources[0];
  const safePrimaryUrl = validateSafeUrl(primarySource?.canonicalUrl || '');
  const hasValidDeadline = Boolean(job.deadline && job.deadline !== 'Não informado');

  const coverDraft = profile ? generateCoverLetterDraft(job, profile) : null;

  const handleDownloadDeadlineIcs = () => {
    const ics = generateIcsCalendarContent({
      title: `Prazo VagasMZ: ${job.title} (${job.company})`,
      description: `Data limite para submeter candidatura à oportunidade "${job.title}" na ${job.company}.`,
      dateIso: job.deadline,
      location: job.location,
      url: safePrimaryUrl.valid ? safePrimaryUrl.normalizedUrl : undefined,
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prazo_${job.company.replace(/[^a-z0-9]/gi, '_')}_${job.deadline}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCoverLetter = async () => {
    if (!coverDraft) return;
    const fullText = `Assunto: ${coverDraft.subject}\n\n${coverDraft.body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedLetter(true);
      setTimeout(() => setCopiedLetter(false), 2500);
    } catch {
      setCopiedLetter(true);
      setTimeout(() => setCopiedLetter(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-heading"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)] my-auto max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-color)] bg-[var(--card-bg)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <CompanyEmblem company={job.company} size="lg" onlyVerifiedImage={true} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="text-[var(--text-primary)] font-semibold">
                    {job.area}
                  </span>
                  <span aria-hidden="true">·</span>
                  <DeadlineBadge deadline={job.deadline} />
                  {job.isDemo ? (
                    <span className="px-2 py-0.5 rounded-md bg-[var(--surface-bg)] border border-[var(--border-color)] text-[var(--text-muted)] text-[11px]">
                      Exemplo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-[var(--surface-bg)] border border-[var(--border-color)] text-[var(--accent-green)] text-[11px] font-medium">
                      Anúncio importado · por confirmar
                    </span>
                  )}
                </div>

                <h2
                  id="job-detail-heading"
                  className="font-display text-xl sm:text-2xl font-bold leading-tight text-[var(--text-primary)]"
                >
                  {job.title}
                </h2>

                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[var(--text-secondary)]">
                  <span className="text-[var(--text-primary)] font-bold">
                    {job.company}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{job.location}</span>
                  <span aria-hidden="true">·</span>
                  <span>{job.workMode}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar detalhes da vaga"
              className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm leading-relaxed">
          {/* 6-Field Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs">
            <div>
              <span className="block text-[var(--text-secondary)] text-[11px]">
                Tipo de Contrato
              </span>
              <span className="font-bold text-[var(--text-primary)] mt-0.5 block">
                {job.contractType}
              </span>
            </div>
            <div>
              <span className="block text-[var(--text-secondary)] text-[11px]">
                Nível de Experiência
              </span>
              <span className="font-bold text-[var(--text-primary)] mt-0.5 block">
                {job.experienceLevel || 'Não informado'}
              </span>
            </div>
            <div>
              <span className="block text-[var(--text-secondary)] text-[11px]">
                Salário Divulgado
              </span>
              <span className="font-bold text-[var(--text-primary)] mt-0.5 block font-mono-tabular">
                {job.salaryRange || 'Não informado'}
              </span>
            </div>
            <div>
              <span className="block text-[var(--text-secondary)] text-[11px]">
                Data de Publicação
              </span>
              <span className="font-bold text-[var(--text-primary)] mt-0.5 block font-mono-tabular">
                {job.publishedAt}
              </span>
            </div>
            <div>
              <span className="block text-[var(--text-secondary)] text-[11px]">
                Prazo de Candidatura
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-[var(--text-primary)] font-mono-tabular">
                  {job.deadline}
                </span>
                {hasValidDeadline && (
                  <button
                    type="button"
                    onClick={handleDownloadDeadlineIcs}
                    title="Guardar prazo no calendário (.ics)"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-green)] hover:underline"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>.ics</span>
                  </button>
                )}
              </div>
            </div>
            <div>
              <span className="block text-[var(--text-secondary)] text-[11px]">
                Última recolha
              </span>
              <span className="font-bold text-[var(--text-primary)] mt-0.5 block font-mono-tabular">
                {job.lastVerifiedAt.slice(0, 10)}
              </span>
            </div>
          </div>

          {/* Profile Compatibility & Skill Gap Analysis */}
          {matchResult && (
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <MatchRing score={matchResult.scorePercent} size="sm" showLabel={false} />
                  <span className="font-bold text-[var(--text-primary)] text-sm">
                    Compatibilidade com o teu Perfil
                  </span>
                </div>
                {coverDraft && (
                  <button
                    type="button"
                    onClick={() => setShowCoverLetter((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-green)] transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                    <span>
                      {showCoverLetter
                        ? 'Ocultar Carta de Apresentação'
                        : 'Gerar Carta / Email de Candidatura'}
                    </span>
                  </button>
                )}
              </div>

              <p className="text-[var(--text-secondary)] leading-relaxed">
                {matchResult.explanation}
              </p>

              {/* Skill Gap Breakdown */}
              <div className="pt-2 border-t border-[var(--border-color)] grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] text-[var(--text-muted)] mb-1">
                    Competências no teu Perfil ({matchResult.matchedSkills.length}):
                  </span>
                  <p className="text-[var(--text-primary)] font-medium">
                    {matchResult.matchedSkills.length > 0
                      ? matchResult.matchedSkills.join(' · ')
                      : 'Nenhuma competência directa detectada no perfil.'}
                  </p>
                </div>

                <div>
                  <span className="block text-[11px] text-[var(--text-muted)] mb-1">
                    Competências pedidas a destacar no CV ({matchResult.missingSkills.length}):
                  </span>
                  {matchResult.missingSkills.length === 0 ? (
                    <p className="text-[var(--accent-green)] font-medium">
                      Tens todas as competências desejadas registadas no perfil!
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {matchResult.missingSkills.map((sk) => (
                        <span
                          key={sk}
                          className="inline-flex items-center gap-1 text-[var(--text-secondary)]"
                        >
                          <span>{sk}</span>
                          {onAddSkillToProfile && (
                            <button
                              type="button"
                              onClick={() => onAddSkillToProfile(sk)}
                              title={`Adicionar "${sk}" ao meu Perfil Profissional`}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--card-bg)] text-[10px] font-semibold text-[var(--accent-green)] hover:border-[var(--accent-green)]"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Adicionar ao perfil</span>
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Expandable Cover Letter / Application Email Draft */}
          {showCoverLetter && coverDraft && (
            <section className="p-4 rounded-xl border border-[var(--accent-green)]/50 bg-[var(--surface-bg)] space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] text-sm">
                    Rascunho de Carta de Apresentação / Email Formal (Moçambique)
                  </h3>
                  <p className="text-[var(--text-secondary)]">
                    Adaptado automaticamente ao cargo, empresa e às tuas competências do perfil.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCoverLetter}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold min-h-[36px]"
                >
                  {copiedLetter ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Texto Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Carta Completa</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] space-y-2 font-sans">
                <div className="pb-2 border-b border-[var(--border-color)] text-[var(--text-primary)]">
                  <strong>Assunto: </strong>
                  <span>{coverDraft.subject}</span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs text-[var(--text-secondary)] leading-relaxed">
                  {coverDraft.body}
                </pre>
              </div>
            </section>
          )}

          {/* Description */}
          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Descrição da Oportunidade
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
              {job.description || 'Não informado pela fonte.'}
            </p>
          </section>

          {/* Responsibilities */}
          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Responsabilidades
            </h3>
            {job.responsibilities && job.responsibilities.length > 0 ? (
              <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-[var(--text-secondary)]">
                {job.responsibilities.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--text-muted)] text-xs">Não informado pela fonte.</p>
            )}
          </section>

          {/* Requirements */}
          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Requisitos
            </h3>
            {job.requirements && job.requirements.length > 0 ? (
              <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-[var(--text-secondary)]">
                {job.requirements.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--text-muted)] text-xs">Não informado pela fonte.</p>
            )}
          </section>

          {/* Desired Skills & Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <section className="space-y-1.5">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Competências Desejadas
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {job.desiredSkills.length > 0
                  ? job.desiredSkills.join(' · ')
                  : 'Não informado'}
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Benefícios Divulgados
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {job.benefits && job.benefits.length > 0
                  ? job.benefits.join(' · ')
                  : 'Não informado'}
              </p>
            </section>
          </div>

          {/* Sources & Traceability List */}
          <section className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] space-y-2.5 text-xs">
            <div className="font-bold text-[var(--text-primary)]">
              Fontes e rastreabilidade ({job.sources.length})
            </div>
            <div className="space-y-2">
              {job.sources.map((src) => {
                const check = validateSafeUrl(src.canonicalUrl);
                return (
                  <div
                    key={`${src.sourceId}-${src.canonicalUrl}`}
                    className="p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {src.sourceName}
                      </div>
                      <div className="font-mono-tabular text-[11px] text-[var(--text-muted)]">
                        Recolhido em: {src.verifiedAt.slice(0, 16).replace('T', ' ')}
                      </div>
                    </div>
                    {check.valid && (
                      <a
                        href={check.normalizedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--accent-green)] hover:underline font-semibold shrink-0"
                      >
                        <span>Ver fonte original</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-color)] bg-[var(--card-bg)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onToggleSave(job.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold min-h-[42px] transition-colors ${
                isSaved
                  ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--surface-bg)]'
                  : 'border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] hover:border-[#666]'
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
              <span>{isSaved ? 'Guardada nos Favoritos' : 'Guardar nos Favoritos'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onTrackApplication(job);
                onClose();
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold min-h-[42px] transition-colors ${
                hasApplication
                  ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--surface-bg)]'
                  : 'border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] hover:border-[#666]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>{hasApplication ? 'Gerir Candidatura' : 'Adicionar às Candidaturas'}</span>
            </button>
          </div>

          {safePrimaryUrl.valid && (
            <a
              href={safePrimaryUrl.normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold hover:opacity-90 transition-opacity min-h-[42px]"
            >
              <span>Abrir anúncio na fonte</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
