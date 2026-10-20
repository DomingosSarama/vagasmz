import React, { useState } from 'react';
import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  ExternalLink,
  Search,
  Trash2,
} from 'lucide-react';
import {
  MOZAMBIQUE_PROVINCES,
  type CareerAlert,
  type CompanyRecord,
  type JobOpportunity,
  type ProfessionalArea,
  type ProvinceMZ,
  type SavedJobRecord,
} from '../types/index.ts';
import { evaluateDeadlineStatus, validateSafeUrl } from '../utils/careerLogic.ts';
import { CompanyEmblem, DeadlineBadge } from './VisualElements.tsx';

interface SavedJobsViewProps {
  jobs: JobOpportunity[];
  savedRecords: SavedJobRecord[];
  applicationJobIds: Set<string>;
  onSelectJob: (job: JobOpportunity) => void;
  onRemoveSaved: (jobId: string) => Promise<void>;
  onConvertToApplication: (job: JobOpportunity) => Promise<void>;
  onUpdateSavedNote?: (jobId: string, notes: string) => Promise<void>;
}

export const SavedJobsView: React.FC<SavedJobsViewProps> = ({
  jobs,
  savedRecords,
  applicationJobIds,
  onSelectJob,
  onRemoveSaved,
  onConvertToApplication,
  onUpdateSavedNote,
}) => {
  const [selectedArea, setSelectedArea] = useState<ProfessionalArea | 'Todas'>('Todas');
  const [showExpired, setShowExpired] = useState(true);
  const [editingNoteJobId, setEditingNoteJobId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const savedMap = new Map<string, SavedJobRecord>(
    savedRecords.map((r) => [r.jobId, r])
  );
  const savedJobsList = jobs.filter((j) => savedMap.has(j.id));

  const availableAreas = Array.from(new Set(savedJobsList.map((j) => j.area)));

  const filteredSaved = savedJobsList.filter((j) => {
    if (selectedArea !== 'Todas' && j.area !== selectedArea) return false;
    const dl = evaluateDeadlineStatus(j.deadline);
    if (!showExpired && dl.status === 'Expirada') return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border-color)] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Vagas Guardadas
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Organiza as tuas oportunidades favoritas por área, acompanha os prazos, adiciona notas pessoais e converte-as em candidaturas.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer min-h-[38px]">
          <input
            type="checkbox"
            checked={showExpired}
            onChange={(e) => setShowExpired(e.target.checked)}
            className="accent-[var(--accent-green)] w-4 h-4"
          />
          <span>Mostrar vagas expiradas</span>
        </label>
      </div>

      {/* Area filter tabs */}
      {availableAreas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedArea('Todas')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium min-h-[38px] ${
              selectedArea === 'Todas'
                ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--surface-bg)]'
                : 'border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-secondary)]'
            }`}
          >
            Todas as áreas ({savedJobsList.length})
          </button>
          {availableAreas.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setSelectedArea(area)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium min-h-[38px] ${
                selectedArea === area
                  ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--surface-bg)]'
                  : 'border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-secondary)]'
              }`}
            >
              {area} ({savedJobsList.filter((j) => j.area === area).length})
            </button>
          ))}
        </div>
      )}

      {filteredSaved.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-8 text-center space-y-2">
          <Bookmark className="w-6 h-6 text-[var(--text-muted)] mx-auto" />
          <p className="text-base font-semibold text-[var(--text-primary)]">
            Nenhuma vaga guardada neste filtro.
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Guarda oportunidades na página "Explorar vagas" ou "Estágios" para as acompanhares aqui mesmo offline.
          </p>
        </div>
      ) : (
        <div className="swiss-hairline-grid">
          {filteredSaved.map((job) => {
            const savedInfo = savedMap.get(job.id);
            const alreadyApplied = applicationJobIds.has(job.id);
            const isEditingThisNote = editingNoteJobId === job.id;

            return (
              <article
                key={job.id}
                className="swiss-hairline-cell p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <CompanyEmblem company={job.company} size="md" />
                      <div className="min-w-0">
                        <div className="text-xs text-[var(--text-secondary)] mb-0.5">
                          {job.company} · {job.location}
                        </div>
                        <h3 className="text-base font-bold text-[var(--text-primary)] leading-snug">
                          <button
                            type="button"
                            onClick={() => onSelectJob(job)}
                            className="text-left hover:text-[var(--accent-green)] transition-colors"
                          >
                            {job.title}
                          </button>
                        </h3>
                      </div>
                    </div>
                    <DeadlineBadge deadline={job.deadline} />
                  </div>

                  {isEditingThisNote ? (
                    <div className="mt-3 space-y-2">
                      <label htmlFor={`saved-note-${job.id}`} className="sr-only">
                        Nota pessoal para {job.title}
                      </label>
                      <textarea
                        id={`saved-note-${job.id}`}
                        rows={2}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Adiciona uma nota pessoal (ex: rever requisitos de SQL, enviar até sexta-feira)..."
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs text-[var(--text-primary)]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingNoteJobId(null)}
                          className="px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs text-[var(--text-secondary)] min-h-[32px]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (onUpdateSavedNote) {
                              await onUpdateSavedNote(job.id, noteDraft);
                            }
                            setEditingNoteJobId(null);
                          }}
                          className="px-3 py-1 rounded bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold min-h-[32px]"
                        >
                          Guardar nota
                        </button>
                      </div>
                    </div>
                  ) : savedInfo?.notes ? (
                    <div className="mt-3 p-2.5 rounded-lg bg-[var(--surface-bg)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-[var(--text-primary)]">Nota pessoal: </strong>
                        <span>{savedInfo.notes}</span>
                      </div>
                      {onUpdateSavedNote && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteJobId(job.id);
                            setNoteDraft(savedInfo.notes || '');
                          }}
                          className="text-[11px] font-semibold text-[var(--accent-green)] hover:underline shrink-0"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  ) : (
                    onUpdateSavedNote && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteJobId(job.id);
                            setNoteDraft('');
                          }}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
                        >
                          + Adicionar nota pessoal
                        </button>
                      </div>
                    )
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectJob(job)}
                      className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs font-semibold text-[var(--text-primary)] hover:border-[#737373] min-h-[38px]"
                    >
                      Ver detalhes
                    </button>

                    <button
                      type="button"
                      onClick={() => onConvertToApplication(job)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold hover:opacity-90 min-h-[38px]"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>
                        {alreadyApplied
                          ? 'Já nas candidaturas'
                          : 'Converter em candidatura'}
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveSaved(job.id)}
                    aria-label={`Remover ${job.title} dos favoritos`}
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs text-[var(--text-muted)] hover:text-red-400 min-h-[38px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface CompaniesViewProps {
  companies: CompanyRecord[];
  jobs: JobOpportunity[];
  onFilterByCompany: (companyName: string) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  companies,
  jobs,
  onFilterByCompany,
}) => {
  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<ProvinceMZ | 'Todas'>('Todas');

  const filteredCompanies = companies.filter((c) => {
    if (provinceFilter !== 'Todas' && c.province !== provinceFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border-color)] pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Empresas e Instituições em Moçambique
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Directório inicial de organizações. Confirma os endereços e oportunidades no website de cada entidade.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar empresa ou sector (ex: Telecomunicações, Banca, Energia, Logística)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-xs text-[var(--text-primary)] min-h-[42px]"
          />
        </div>
        <select
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value as ProvinceMZ | 'Todas')}
          aria-label="Filtrar empresas por província"
          className="px-3.5 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-xs text-[var(--text-primary)] min-h-[42px]"
        >
          <option value="Todas">Todas as províncias</option>
          {MOZAMBIQUE_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="swiss-hairline-grid">
        {filteredCompanies.map((comp) => {
          const activeJobs = jobs.filter(
            (j) =>
              j.companyId === comp.id ||
              j.company.toLowerCase().includes(comp.name.toLowerCase())
          );
          const safeWeb = validateSafeUrl(comp.officialWebsite);
          const safeCareers = validateSafeUrl(comp.careersUrl);

          return (
            <article
              key={comp.id}
              className="swiss-hairline-cell p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start gap-3.5">
                  <CompanyEmblem company={comp.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)] mb-1">
                      <span className="font-semibold text-[var(--accent-green)]">
                        {comp.sector}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {comp.province}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      {comp.name}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {comp.location}
                    </p>
                  </div>
                </div>

                <p className="mt-3.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                  {comp.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onFilterByCompany(comp.name)}
                  className="font-mono-tabular font-semibold text-[var(--accent-green)] hover:underline min-h-[38px] inline-flex items-center"
                >
                  {activeJobs.length} oportunidade(s) no catálogo →
                </button>

                <div className="flex items-center gap-3">
                  {safeWeb.valid && (
                    <a
                      href={safeWeb.normalizedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {safeCareers.valid && (
                    <a
                      href={safeCareers.normalizedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] hover:border-[var(--accent-green)] min-h-[36px]"
                    >
                      <span>Página de Carreiras</span>
                      <ExternalLink className="w-3 h-3 text-[var(--accent-green)]" />
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

interface AlertsViewProps {
  alerts: CareerAlert[];
  jobs: JobOpportunity[];
  onSelectJob: (job: JobOpportunity) => void;
  onGoToApplications: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  jobs,
  onSelectJob,
  onGoToApplications,
}) => {
  const [filterType, setFilterType] = useState<CareerAlert['type'] | 'todos'>('todos');

  const visibleAlerts =
    filterType === 'todos' ? alerts : alerts.filter((a) => a.type === filterType);

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border-color)] pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Alertas Internos e Prazos
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Acompanha prazos de candidatura iminentes, entrevistas agendadas, candidaturas em espera e estágios compatíveis com o teu perfil.
        </p>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'todos', label: `Todos (${alerts.length})` },
          { id: 'prazo_proximo', label: 'Prazos Próximos' },
          { id: 'entrevista', label: 'Entrevistas Registadas' },
          { id: 'acompanhamento', label: 'Acompanhamento de Candidaturas' },
          { id: 'estagio_relevante', label: 'Estágios Relevantes' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id as typeof filterType)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium min-h-[38px] ${
              filterType === tab.id
                ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--surface-bg)]'
                : 'border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visibleAlerts.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-8 text-center space-y-2">
          <Bell className="w-6 h-6 text-[var(--text-muted)] mx-auto" />
          <p className="text-base font-semibold text-[var(--text-primary)]">
            Sem alertas pendentes nesta categoria.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleAlerts.map((alert) => {
            const matchedJob = alert.relatedJobId
              ? jobs.find((j) => j.id === alert.relatedJobId)
              : undefined;

            return (
              <div
                key={alert.id}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono-tabular">
                    <span
                      className={
                        alert.severity === 'alta'
                          ? 'text-amber-400 font-semibold'
                          : 'text-[#10B981] font-semibold'
                      }
                    >
                      {alert.severity === 'alta' ? 'Prioridade Alta' : 'Notificação Interna'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[var(--text-muted)]">
                      Data de referência: {alert.dateLabel}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                    {alert.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {alert.description}
                  </p>
                </div>

                <div className="shrink-0">
                  {matchedJob ? (
                    <button
                      type="button"
                      onClick={() => onSelectJob(matchedJob)}
                      className="px-3.5 py-2 rounded-[7px] border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--text-primary)] min-h-[38px]"
                    >
                      Ver oportunidade
                    </button>
                  ) : alert.relatedApplicationId ? (
                    <button
                      type="button"
                      onClick={onGoToApplications}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[7px] border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--text-primary)] min-h-[38px]"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                      <span>Abrir candidatura</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transparency note on Push Notifications */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-4 text-xs text-[var(--text-secondary)]">
        <strong className="text-[var(--text-primary)]">Sobre os alertas: </strong>
        Os alertas são actualizados quando abres o VagasMZ. Esta versão ainda não envia notificações automáticas com a aplicação fechada.
      </div>
    </div>
  );
};
