import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  ExternalLink,
  FileDown,
  Kanban,
  LayoutGrid,
  Plus,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  APPLICATION_STATUSES,
  ALL_PROFESSIONAL_AREAS,
  type ApplicationDocumentChecklist,
  type ApplicationStatus,
  type JobApplicationRecord,
  type ProfessionalArea,
  type UserProfile,
} from '../types/index.ts';
import {
  generateIcsCalendarContent,
  sanitizeText,
  validateSafeUrl,
} from '../utils/careerLogic.ts';
import { exportApplicationsToPDF } from '../utils/pdfExport.ts';
import { CompanyEmblem, DeadlineBadge } from './VisualElements.tsx';

interface ApplicationsManagerViewProps {
  applications: JobApplicationRecord[];
  profile: UserProfile;
  onSaveApplication: (app: JobApplicationRecord) => Promise<void>;
  onDeleteApplication: (id: string) => Promise<void>;
}

export const ApplicationsManagerView: React.FC<ApplicationsManagerViewProps> = ({
  applications,
  profile,
  onSaveApplication,
  onDeleteApplication,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'kanban'>('cards');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'Todos'>('Todos');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplicationRecord | null>(null);
  const [pdfFeedback, setPdfFeedback] = useState(false);
  const [pdfError,setPdfError] = useState('');

  // New external application form state
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newArea, setNewArea] = useState<ProfessionalArea>('Outras áreas');
  const [newUrl, setNewUrl] = useState('');
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('Candidatura enviada');
  const [newAppliedDate, setNewAppliedDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDeadline, setNewDeadline] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newNextAction, setNewNextAction] = useState('');
  const [formError, setFormError] = useState('');

  // Sub-forms inside edit modal for adding an interview or contact
  const [intDate, setIntDate] = useState('');
  const [intFormat, setIntFormat] = useState<'Presencial' | 'Online / Vídeo' | 'Telefone' | 'Teste Técnico'>('Online / Vídeo');
  const [intNotes, setIntNotes] = useState('');

  const [ctName, setCtName] = useState('');
  const [ctRole, setCtRole] = useState('');
  const [ctInfo, setCtInfo] = useState('');

  const filteredApps =
    statusFilter === 'Todos'
      ? applications
      : applications.filter((a) => a.status === statusFilter);

  const handleExportPDF = async () => {
    setPdfError('');
    try {
      exportApplicationsToPDF(applications, profile);
      setPdfFeedback(true);
      setTimeout(() => setPdfFeedback(false), 3000);
    } catch {setPdfError('Não foi possível exportar o PDF. Tenta novamente.');}
  };

  const handleCreateExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const cleanTitle = sanitizeText(newTitle, 160);
    const cleanCompany = sanitizeText(newCompany, 140);
    if (!cleanTitle || !cleanCompany) {
      setFormError('Indica o cargo e o nome da empresa.');
      return;
    }

    let safeUrl = '';
    if (newUrl.trim()) {
      const check = validateSafeUrl(newUrl);
      if (!check.valid) {
        setFormError(check.reason || 'URL inválido.');
        return;
      }
      safeUrl = check.normalizedUrl;
    }

    const nowIso = new Date().toISOString();
    const record: JobApplicationRecord = {
      id: `app-${crypto.randomUUID()}`,
      jobTitle: cleanTitle,
      company: cleanCompany,
      location: sanitizeText(newLocation, 100) || 'Não informado',
      area: newArea,
      officialUrl: safeUrl,
      status: newStatus,
      appliedDate: newAppliedDate || nowIso.slice(0, 10),
      deadline: newDeadline || 'Não informado',
      notes: sanitizeText(newNotes, 1500),
      nextAction: sanitizeText(newNextAction, 300),
      contacts: [],
      interviews: [],
      isExternal: true,
      updatedAt: nowIso,
      history: [{ status: newStatus, timestamp: nowIso, note: 'Registada manualmente' }],
    };

    await onSaveApplication(record);
    setNewTitle('');
    setNewCompany('');
    setNewUrl('');
    setNewNotes('');
    setNewNextAction('');
    setShowNewModal(false);
  };

  const handleQuickStatusChange = async (
    app: JobApplicationRecord,
    nextStatus: ApplicationStatus
  ) => {
    const nowIso = new Date().toISOString();
    const updated: JobApplicationRecord = {
      ...app,
      status: nextStatus,
      updatedAt: nowIso,
      history: [...app.history, { status: nextStatus, timestamp: nowIso }],
    };
    await onSaveApplication(updated);
    if (editingApp?.id === app.id) {
      setEditingApp(updated);
    }
  };

  const handleAddInterview = async () => {
    if (!editingApp || !intDate) return;
    const updated: JobApplicationRecord = {
      ...editingApp,
      updatedAt: new Date().toISOString(),
      interviews: [
        ...editingApp.interviews,
        {
          id: `int-${Date.now()}`,
          date: intDate,
          format: intFormat,
          notes: sanitizeText(intNotes, 300),
          completed: false,
        },
      ],
    };
    await onSaveApplication(updated);
    setEditingApp(updated);
    setIntDate('');
    setIntNotes('');
  };

  const handleAddContact = async () => {
    if (!editingApp || !ctName.trim()) return;
    const updated: JobApplicationRecord = {
      ...editingApp,
      updatedAt: new Date().toISOString(),
      contacts: [
        ...editingApp.contacts,
        {
          id: `ct-${Date.now()}`,
          name: sanitizeText(ctName, 100),
          role: sanitizeText(ctRole, 100) || 'Recrutador(a)',
          contactInfo: sanitizeText(ctInfo, 120),
        },
      ],
    };
    await onSaveApplication(updated);
    setEditingApp(updated);
    setCtName('');
    setCtRole('');
    setCtInfo('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Minhas Candidaturas
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Acompanha todas as etapas, entrevistas, contactos e próximas acções num único quadro.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {pdfError && <p role="alert" className="text-red-400 text-xs">{pdfError}</p>}
          {/* Segmented View Toggle: Cartões vs Kanban */}
          <div
            role="group"
            aria-label="Modo de visualização de candidaturas"
            className="flex items-center p-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)]"
          >
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors min-h-[36px] whitespace-nowrap shrink-0 ${
                viewMode === 'cards'
                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cartões</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors min-h-[36px] whitespace-nowrap shrink-0 ${
                viewMode === 'kanban'
                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Quadro Kanban</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-green)] transition-colors min-h-[44px] whitespace-nowrap shrink-0"
          >
            <FileDown className="w-4 h-4 text-[var(--accent-green)]" />
            <span>{pdfFeedback ? 'PDF Exportado!' : 'Exportar PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold hover:opacity-90 transition-opacity min-h-[44px] whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registar candidatura externa</span>
          </button>
        </div>
      </div>

      {/* Status Filter Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setStatusFilter('Todos')}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 min-h-[38px] ${
            statusFilter === 'Todos'
              ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--surface-bg)]'
              : 'border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Todas ({applications.length})
        </button>
        {APPLICATION_STATUSES.map((st) => {
          const count = applications.filter((a) => a.status === st).length;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 min-h-[38px] ${
                statusFilter === st
                  ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--surface-bg)]'
                  : 'border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredApps.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-8 text-center space-y-3">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            Nenhuma candidatura encontrada neste estado.
          </p>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Podes adicionar qualquer vaga do catálogo às tuas candidaturas ou registar uma candidatura feita fora da plataforma.
          </p>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Registar candidatura</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredApps.map((app) => {
            const isAdvanced =
              app.status !== 'Pretendo candidatar-me' &&
              app.status !== 'Candidatura preparada';
            const checklist = app.documentChecklist || {
              cvUpdated: isAdvanced,
              coverLetter: isAdvanced,
              certificates: app.status === 'Entrevista marcada',
              biAndNuit: isAdvanced,
              portfolioOrLinkedin: app.status === 'Entrevista marcada',
            };
            const readyDocsCount = [
              checklist.cvUpdated,
              checklist.coverLetter,
              checklist.certificates,
              checklist.biAndNuit,
              checklist.portfolioOrLinkedin,
            ].filter(Boolean).length;

            return (
              <article
                key={app.id}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 flex flex-col justify-between space-y-4 hover:border-[#3A3A3A] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <CompanyEmblem company={app.company} size="md" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)] mb-0.5">
                          <span>{app.company}</span>
                          <span>·</span>
                          <span>{app.location}</span>
                        </div>
                        <h3 className="text-base font-bold text-[var(--text-primary)] leading-snug">
                          {app.isDemo ? '[Exemplo] ' : ''}{app.jobTitle}
                        </h3>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-bg)] border border-[var(--border-color)] text-xs text-[var(--accent-green)] font-semibold shrink-0">
                      {app.status}
                    </span>
                  </div>

                  {/* Visual Document Checklist Progress Bar */}
                  <div className="mt-4 p-3 rounded-xl bg-[var(--surface-bg)] border border-[var(--border-color)] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">
                        Documentos preparados (CV, BI/NUIT, Certificados)
                      </span>
                      <span className="font-bold text-[var(--accent-green)]">
                        {readyDocsCount}/5 prontos
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 1, 2, 3, 4].map((idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 rounded-full transition-colors ${
                            idx < readyDocsCount
                              ? 'bg-[var(--accent-green)]'
                              : 'bg-[var(--border-color)]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                    <span>
                      Registada em:{' '}
                      <strong className="text-[var(--text-primary)]">
                        {app.appliedDate || 'Não informado'}
                      </strong>
                    </span>
                    <DeadlineBadge deadline={app.deadline} />
                  </div>

                  {app.nextAction && (
                    <div className="mt-2.5 text-xs text-[var(--text-secondary)]">
                      <strong className="text-[var(--text-primary)]">
                        Próximo passo:{' '}
                      </strong>
                      <span>{app.nextAction}</span>
                    </div>
                  )}

                  {(app.interviews.length > 0 || app.contacts.length > 0) && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                      {app.interviews.length > 0 && (
                        <span className="text-[var(--accent-green)] font-medium">
                          {app.interviews.length} entrevista(s) agendada(s)
                        </span>
                      )}
                      {app.contacts.length > 0 && (
                        <span>{app.contacts.length} contacto(s)</span>
                      )}
                    </div>
                  )}
                </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label htmlFor={`status-select-${app.id}`} className="sr-only">
                    Actualizar estado de {app.isDemo ? '[Exemplo] ' : ''}{app.jobTitle}
                  </label>
                  <select
                    id={`status-select-${app.id}`}
                    value={app.status}
                    onChange={(e) =>
                      handleQuickStatusChange(app, e.target.value as ApplicationStatus)
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)] min-h-[38px]"
                  >
                    {APPLICATION_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingApp(app)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-green)] min-h-[38px]"
                  >
                    Notas, Contactos & Entrevistas
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteApplication(app.id)}
                    aria-label={`Eliminar candidatura ${app.isDemo ? '[Exemplo] ' : ''}${app.jobTitle}`}
                    className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-muted)] hover:text-red-400 min-h-[38px] min-w-[38px] flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start gap-4 min-w-max">
            {[...APPLICATION_STATUSES]
              .sort((a, b) => {
                const aCount = applications.filter((item) => item.status === a).length;
                const bCount = applications.filter((item) => item.status === b).length;
                if (aCount > 0 && bCount === 0) return -1;
                if (aCount === 0 && bCount > 0) return 1;
                return 0;
              })
              .map((columnStatus) => {
              const colApps = applications.filter((a) => a.status === columnStatus);
              return (
                <div
                  key={columnStatus}
                  className="w-72 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-3.5 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                    <h3 className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {columnStatus}
                    </h3>
                    <span className="font-mono-tabular text-xs text-[var(--accent-green)] font-semibold">
                      {colApps.length}
                    </span>
                  </div>

                  {colApps.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                      Sem registos
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {colApps.map((app) => (
                        <div
                          key={app.id}
                          className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-3.5 space-y-2.5"
                        >
                          <div className="flex items-start gap-2.5">
                            <CompanyEmblem company={app.company} size="sm" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                                {app.isDemo ? '[Exemplo] ' : ''}{app.jobTitle}
                              </div>
                              <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                                {app.company} · {app.location}
                              </div>
                            </div>
                          </div>
                          {app.nextAction && (
                            <div className="text-[11px] text-[var(--text-muted)]">
                              Acção: {app.nextAction}
                            </div>
                          )}
                          <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between gap-1.5">
                            <select
                              aria-label={`Mover candidatura ${app.isDemo ? '[Exemplo] ' : ''}${app.jobTitle} de coluna`}
                              value={app.status}
                              onChange={(e) =>
                                handleQuickStatusChange(
                                  app,
                                  e.target.value as ApplicationStatus
                                )
                              }
                              className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--surface-bg)] text-[11px] text-[var(--text-primary)] max-w-[155px]"
                            >
                              {APPLICATION_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setEditingApp(app)}
                              className="text-[11px] font-semibold text-[var(--accent-green)] hover:underline px-1.5 py-1"
                            >
                              Abrir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: New External Application */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-app-modal-title"
        >
          <div className="w-full max-w-xl rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 text-[var(--text-primary)] my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <h2 id="new-app-modal-title" className="text-lg font-bold">
                Registar Candidatura Externa
              </h2>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                aria-label="Fechar modal de nova candidatura"
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[40px] min-w-[40px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExternal} className="mt-4 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ext-title" className="block text-[var(--text-secondary)] mb-1">
                    Cargo / Oportunidade *
                  </label>
                  <input
                    id="ext-title"
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Engenheiro de Redes Júnior"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
                  />
                </div>
                <div>
                  <label htmlFor="ext-company" className="block text-[var(--text-secondary)] mb-1">
                    Empresa / Organização *
                  </label>
                  <input
                    id="ext-company"
                    type="text"
                    required
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="Ex: Tmcel Moçambique"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="ext-loc" className="block text-[var(--text-secondary)] mb-1">
                    Localização
                  </label>
                  <input
                    id="ext-loc"
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
                  />
                </div>
                <div>
                  <label htmlFor="ext-area" className="block text-[var(--text-secondary)] mb-1">
                    Área Profissional
                  </label>
                  <select
                    id="ext-area"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value as ProfessionalArea)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
                  >
                    {ALL_PROFESSIONAL_AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ext-status" className="block text-[var(--text-secondary)] mb-1">
                    Estado Inicial
                  </label>
                  <select
                    id="ext-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
                  >
                    {APPLICATION_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="ext-date" className="block text-[var(--text-secondary)] mb-1">
                    Data de Envio
                  </label>
                  <input
                    id="ext-date"
                    type="date"
                    value={newAppliedDate}
                    onChange={(e) => setNewAppliedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
                  />
                </div>
                <div>
                  <label htmlFor="ext-deadline" className="block text-[var(--text-secondary)] mb-1">
                    Prazo (opcional)
                  </label>
                  <input
                    id="ext-deadline"
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
                  />
                </div>
                <div>
                  <label htmlFor="ext-url" className="block text-[var(--text-secondary)] mb-1">
                    Link Oficial (opcional)
                  </label>
                  <input
                    id="ext-url"
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ext-next" className="block text-[var(--text-secondary)] mb-1">
                  Próxima Acção Planeada
                </label>
                <input
                  id="ext-next"
                  type="text"
                  value={newNextAction}
                  onChange={(e) => setNewNextAction(e.target.value)}
                  placeholder="Ex: Enviar email de acompanhamento na próxima segunda-feira"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
                />
              </div>

              <div>
                <label htmlFor="ext-notes" className="block text-[var(--text-secondary)] mb-1">
                  Notas da Candidatura
                </label>
                <textarea
                  id="ext-notes"
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Versão do CV enviada, requisitos específicos, observações..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] font-semibold min-h-[40px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold min-h-[40px]"
                >
                  Guardar Candidatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Application Details (Notes, Next Actions, Contacts, Interviews) */}
      {editingApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-app-title"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 text-[var(--text-primary)] my-auto max-h-[90vh] overflow-y-auto space-y-5 text-xs">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
              <div>
                <h2 id="edit-app-title" className="text-lg font-bold">
                  {editingApp.jobTitle}
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {editingApp.company} · {editingApp.location}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                aria-label="Fechar gestão da candidatura"
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[40px] min-w-[40px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Editable Notes & Next Action */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">
                  Estado da Candidatura
                </label>
                <select
                  value={editingApp.status}
                  onChange={(e) =>
                    handleQuickStatusChange(editingApp, e.target.value as ApplicationStatus)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
                >
                  {APPLICATION_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">
                  Próxima Acção
                </label>
                <input
                  type="text"
                  value={editingApp.nextAction}
                  onChange={async (e) => {
                    const updated = {
                      ...editingApp,
                      nextAction: sanitizeText(e.target.value, 300),
                      updatedAt: new Date().toISOString(),
                    };
                    setEditingApp(updated);
                    await onSaveApplication(updated);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-1">
                Notas Pessoais e Observações
              </label>
              <textarea
                rows={3}
                value={editingApp.notes}
                onChange={async (e) => {
                  const updated = {
                    ...editingApp,
                    notes: sanitizeText(e.target.value, 1500),
                    updatedAt: new Date().toISOString(),
                  };
                  setEditingApp(updated);
                  await onSaveApplication(updated);
                }}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)]"
              />
            </div>

            {/* Mozambican Document Checklist Section */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckSquare className="w-4 h-4 text-[var(--accent-green)]" />
                <span>Checklist Documental da Candidatura (Moçambique)</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Marca os documentos preparados ou enviados para esta oportunidade:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {(
                  [
                    { key: 'cvUpdated', label: 'CV actualizado em PDF' },
                    { key: 'coverLetter', label: 'Carta de Motivação / Apresentação' },
                    { key: 'certificates', label: 'Certificado de Habilitações / Declaração' },
                    { key: 'biAndNuit', label: 'Bilhete de Identidade (BI) & NUIT' },
                    { key: 'portfolioOrLinkedin', label: 'Portefólio / GitHub / LinkedIn revisto' },
                  ] as Array<{ key: keyof ApplicationDocumentChecklist; label: string }>
                ).map((item) => {
                  const currentChecklist: ApplicationDocumentChecklist =
                    editingApp.documentChecklist || {
                      cvUpdated: false,
                      coverLetter: false,
                      certificates: false,
                      biAndNuit: false,
                      portfolioOrLinkedin: false,
                    };
                  const isChecked = Boolean(currentChecklist[item.key]);
                  return (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] cursor-pointer text-xs text-[var(--text-primary)]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={async (e) => {
                          const nextChecklist: ApplicationDocumentChecklist = {
                            ...currentChecklist,
                            [item.key]: e.target.checked,
                          };
                          const updated: JobApplicationRecord = {
                            ...editingApp,
                            documentChecklist: nextChecklist,
                            updatedAt: new Date().toISOString(),
                          };
                          setEditingApp(updated);
                          await onSaveApplication(updated);
                        }}
                        className="accent-[var(--accent-green)] w-4 h-4"
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Interviews Section */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Calendar className="w-4 h-4 text-[#B5F07A]" />
                <span>Entrevistas e Testes Técnicos ({editingApp.interviews.length})</span>
              </div>

              {editingApp.interviews.length > 0 && (
                <div className="space-y-2">
                  {editingApp.interviews.map((inter) => (
                    <div
                      key={inter.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)]"
                    >
                      <div>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {inter.format} · {inter.date}
                        </span>
                        {inter.notes && (
                          <p className="text-[var(--text-secondary)] mt-0.5">{inter.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const ics = generateIcsCalendarContent({
                              title: `Entrevista (${inter.format}): ${editingApp.jobTitle} — ${editingApp.company}`,
                              description: inter.notes || `Entrevista agendada para ${editingApp.jobTitle} na ${editingApp.company}.`,
                              dateIso: inter.date,
                              location: editingApp.location,
                              url: editingApp.officialUrl || undefined,
                            });
                            const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Entrevista_${editingApp.company.replace(/[^a-z0-9]/gi, '_')}_${inter.date}.ics`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-green)] hover:underline"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Calendário (.ics)</span>
                        </button>
                        <label className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <input
                            type="checkbox"
                            checked={inter.completed}
                            onChange={async (e) => {
                              const updated: JobApplicationRecord = {
                                ...editingApp,
                                interviews: editingApp.interviews.map((i) =>
                                  i.id === inter.id ? { ...i, completed: e.target.checked } : i
                                ),
                              };
                              setEditingApp(updated);
                              await onSaveApplication(updated);
                            }}
                            className="accent-[#B5F07A]"
                          />
                          <span>Concluída</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <input
                  type="date"
                  value={intDate}
                  onChange={(e) => setIntDate(e.target.value)}
                  aria-label="Data da entrevista"
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)] min-h-[38px]"
                />
                <select
                  value={intFormat}
                  onChange={(e) =>
                    setIntFormat(e.target.value as typeof intFormat)
                  }
                  aria-label="Formato da entrevista"
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)] min-h-[38px]"
                >
                  <option value="Online / Vídeo">Online / Vídeo</option>
                  <option value="Presencial">Presencial</option>
                  <option value="Teste Técnico">Teste Técnico</option>
                  <option value="Telefone">Telefone</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddInterview}
                  className="px-3 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold min-h-[38px]"
                >
                  + Registar Entrevista
                </button>
              </div>
              <input
                type="text"
                value={intNotes}
                onChange={(e) => setIntNotes(e.target.value)}
                placeholder="Notas da entrevista (ex: link Teams/Zoom, tópicos técnicos)..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)] min-h-[38px]"
              />
            </div>

            {/* Contacts Section */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <UserPlus className="w-4 h-4 text-[#B5F07A]" />
                <span>Contactos Registados ({editingApp.contacts.length})</span>
              </div>

              {editingApp.contacts.length > 0 && (
                <div className="space-y-1.5">
                  {editingApp.contacts.map((ct) => (
                    <div
                      key={ct.id}
                      className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] flex items-center justify-between"
                    >
                      <span>
                        <strong>{ct.name}</strong> ({ct.role})
                      </span>
                      <span className="font-mono-tabular text-[var(--text-secondary)]">
                        {ct.contactInfo}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                <input
                  type="text"
                  value={ctName}
                  onChange={(e) => setCtName(e.target.value)}
                  placeholder="Nome do contacto"
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)] min-h-[38px]"
                />
                <input
                  type="text"
                  value={ctRole}
                  onChange={(e) => setCtRole(e.target.value)}
                  placeholder="Cargo (ex: RH)"
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)] min-h-[38px]"
                />
                <input
                  type="text"
                  value={ctInfo}
                  onChange={(e) => setCtInfo(e.target.value)}
                  placeholder="Email ou telefone"
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)] min-h-[38px]"
                />
                <button
                  type="button"
                  onClick={handleAddContact}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:border-[#B5F07A] font-semibold min-h-[38px]"
                >
                  + Contacto
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {editingApp.officialUrl && validateSafeUrl(editingApp.officialUrl).valid ? (
                <a
                  href={validateSafeUrl(editingApp.officialUrl).normalizedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#B5F07A] hover:underline font-semibold"
                >
                  <span>Abrir link da vaga</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                className="px-5 py-2 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold min-h-[40px]"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
