import { restoreBackup, mergeCatalog } from './db/backup.ts';
import { fetchApiJson } from './utils/apiClient.ts';
import { jobSchema, parseImportedJobs } from './utils/validation.ts';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppSidebar, AppTopBar } from './components/AppChrome.tsx';
import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  Compass,
  GraduationCap,
  Home,
  Menu,
  Moon,
  Settings,
  Sun,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import type {
  ActivePage,
  CompanyRecord,
  DataSourceConfig,
  JobApplicationRecord,
  JobFilterState,
  JobOpportunity,
  SavedJobRecord,
  UserProfile,
} from './types/index.ts';
import {
  db,
  initializeLocalDatabase,
  type UserPreferencesRecord,
} from './db/localDatabase.ts';
import {
  DEFAULT_USER_PROFILE,
  DEMONSTRATION_JOBS,
  INITIAL_DATA_SOURCES,
  VERIFIED_COMPANIES_MZ,
} from './data/seedCatalog.ts';
import {
  computeJobMatch,
  deduplicateAndMergeJobs,
  filterAndSortJobs,
  generateCareerAlerts,
} from './utils/careerLogic.ts';
import { useOnlineStatus } from './hooks/useOnlineStatus.ts';
import { DashboardView } from './components/DashboardView.tsx';
import { SearchAndFiltersBar } from './components/SearchAndFiltersBar.tsx';
import { JobCard } from './components/JobCard.tsx';
import { JobDetailModal } from './components/JobDetailModal.tsx';
import { ApplicationsManagerView } from './components/ApplicationsManagerView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { DataSourcesAndSettingsView } from './components/DataSourcesAndSettingsView.tsx';
import {
  AlertsView,
  CompaniesView,
  SavedJobsView,
} from './components/SecondaryViews.tsx';
import { EmptyStateIllustration } from './components/VisualElements.tsx';

const DEFAULT_FILTERS: JobFilterState = {
  query: '',
  province: 'Todas',
  city: '',
  area: 'Todas',
  contractType: 'Todos',
  opportunityKind: 'Todos',
  workMode: 'Todos',
  experienceLevel: 'Todos',
  publishedWithinDays: 'all',
  onlyActiveDeadlines: true,
  onlyDisclosedSalary: false,
  includeDemo: false,
  sortBy: 'recent',
};

export default function App() {
  const isOnline = useOnlineStatus();
  const [isLoading, setIsLoading] = useState(true);
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [importRequested, setImportRequested] = useState(false);

  // Persisted state from IndexedDB
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJobRecord[]>([]);
  const [applications, setApplications] = useState<JobApplicationRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [preferences, setPreferences] = useState<UserPreferencesRecord>({
    id: 'default',
    theme: 'dark',
    includeDemoCatalog: false,
    lastOfflineCatalogSyncAt: new Date().toISOString(),
    pushNotificationsOptIn: false,
  });
  const [companies, setCompanies] = useState<CompanyRecord[]>(VERIFIED_COMPANIES_MZ);
  const [sources, setSources] = useState<DataSourceConfig[]>(INITIAL_DATA_SOURCES);
  const pendingSaves = useRef(new Set<string>());
  const preferenceOverrides = useRef<Partial<UserPreferencesRecord>>({});

  // Interactive UI states
  const [filters, setFilters] = useState<JobFilterState>(DEFAULT_FILTERS);
  const [selectedJob, setSelectedJob] = useState<JobOpportunity | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState('');
  const [duplicatesMergedTotal, setDuplicatesMergedTotal] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  // Load from IndexedDB on mount and immediately sync real-time feeds
  useEffect(() => {
    let mounted = true;
    const networkAbort = new AbortController();
    (async () => {
      try {
        const data = await initializeLocalDatabase();
        if (!mounted) return;
        // Apply the saved theme before waiting for network synchronization.
        setPreferences({ ...data.preferences, ...preferenceOverrides.current });
        setJobs(data.jobs);
        setSavedJobs(data.savedJobs);
        setApplications(data.applications);
        setProfile(data.profile);
        setCompanies(data.companies);
        setSources(data.sources);
        setFilters(prev => ({...prev, includeDemo: preferenceOverrides.current.includeDemoCatalog ?? data.preferences.includeDemoCatalog}));
        setIsLoading(false);
        setIsSyncing(true);

        let currentSources = data.sources;

        try {
          const syncRes = await fetchApiJson('/api/sources/sync', { method: 'POST', signal: networkAbort.signal });
          if (!mounted) return;
          if (syncRes.ok) {
            const payload = syncRes.data as {
              syncedAt: string;
              jobs: JobOpportunity[];
              sourceReports: Array<{
                id: string;
                status: 'sincronizado' | 'indisponivel' | 'por_configurar';
                message: string;
                count: number;
                syncedAt: string;
              }>;
            };

            if (payload.jobs && payload.jobs.length > 0) {
              await mergeCatalog([...DEMONSTRATION_JOBS, ...parseImportedJobs(payload.jobs)]);

            }

            currentSources = (await db.sources.toArray()).map((src) => {
                const rep = payload.sourceReports.find((r) => r.id === src.id);
                if (!rep) return src;
                return {
                  ...src,
                  lastSyncAt: rep.syncedAt,
                  lastStatus: rep.status,
                  statusMessage: rep.message,
                  itemsCollected: rep.count,
                };
              });
            await db.sources.bulkPut(currentSources);
          }
        } catch {
          // Keep the explicit user preference offline; never enable examples automatically.
        } finally {
          if (mounted) setIsSyncing(false);
        }

        if (!mounted) return;
        const deduped = deduplicateAndMergeJobs(await db.jobs.toArray());
        if (!mounted) return;
        setJobs(deduped.mergedJobs);
        if (deduped.duplicatesMergedCount > 0) {
          setDuplicatesMergedTotal((c) => c + deduped.duplicatesMergedCount);
        }
        setSources(await db.sources.toArray());
        setIsLoading(false);
      } catch {
        if (!mounted) return;
        setIsLoading(false);
        showToast('O navegador não permitiu carregar os dados locais. Verifica as permissões de armazenamento.');
      }
    })();
    return () => {
      mounted = false;
      networkAbort.abort();
    };
  }, []);

  // Sync theme class on <html>
  useEffect(() => {
    const html = document.documentElement;
    if (preferences.theme === 'light') {
      html.classList.remove('dark');
      html.classList.add('light');
      document.body.style.backgroundColor = '#FAFAF8';
      document.body.style.color = '#111111';
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
      document.body.style.backgroundColor = '#000000';
      document.body.style.color = '#FFFFFF';
    }
  }, [preferences.theme]);

  const savedSet = useMemo(
    () => new Set(savedJobs.map((s) => s.jobId)),
    [savedJobs]
  );

  const applicationJobIds = useMemo(
    () => new Set(applications.map((a) => a.jobId).filter(Boolean) as string[]),
    [applications]
  );

  const alerts = useMemo(
    () =>
      generateCareerAlerts(
        jobs,
        Array.from(savedSet),
        applications,
        profile
      ),
    [jobs, savedSet, applications, profile]
  );

  const filteredJobs = useMemo(
    () => filterAndSortJobs(jobs, filters, profile),
    [jobs, filters, profile]
  );

  const internshipFilteredJobs = useMemo(
    () =>
      filterAndSortJobs(
        jobs,
        { ...filters, opportunityKind: 'Estágio' },
        profile
      ),
    [jobs, filters, profile]
  );

  const handleToggleSaveJob = async (jobId: string) => {
    if (pendingSaves.current.has(jobId)) return;
    pendingSaves.current.add(jobId);
    try {
      let removed = false;
      await db.transaction('rw', db.savedJobs, async () => {
        if(await db.savedJobs.get(jobId)) {await db.savedJobs.delete(jobId); removed = true;}
        else await db.savedJobs.put({jobId,savedAt:new Date().toISOString(),customArea:jobs.find(j => j.id === jobId)?.area});
      });
      setSavedJobs(await db.savedJobs.toArray());
      showToast(removed ? 'Vaga removida das vagas guardadas.' : 'Vaga guardada nos teus favoritos.');
    } catch { showToast('Não foi possível guardar a alteração. Tenta novamente.'); }
    finally { pendingSaves.current.delete(jobId); }
  };

  const handleUpdateSavedNote = async (jobId: string, notes: string) => {
    const existing = savedJobs.find((s) => s.jobId === jobId);
    const updated: SavedJobRecord = existing
      ? { ...existing, notes }
      : { jobId, savedAt: new Date().toISOString(), notes };
    await db.savedJobs.put(updated);
    setSavedJobs((prev) => {
      const idx = prev.findIndex((s) => s.jobId === jobId);
      if (idx === -1) return [updated, ...prev];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
    showToast('Nota pessoal guardada na vaga favorita.');
  };

  const handleTrackOrConvertApplication = async (job: JobOpportunity) => {
    const existing = applications.find((a) => a.jobId === job.id);
    if (existing) {
      setActivePage('candidaturas');
      showToast(`A abrir candidatura para "${job.title}".`);
      return;
    }

    const nowIso = new Date().toISOString();
    const newApp: JobApplicationRecord = {
      id: `app-${crypto.randomUUID()}`,
      jobId: job.id,
      isDemo: job.isDemo,
      jobTitle: job.title,
      company: job.company,
      location: job.location,
      area: job.area,
      officialUrl: job.sources[0]?.canonicalUrl || '',
      status: 'Pretendo candidatar-me',
      appliedDate: nowIso.slice(0, 10),
      deadline: job.deadline || 'Não informado',
      notes: '',
      nextAction: 'Preparar CV e carta de motivação para submeter antes do prazo.',
      contacts: [],
      interviews: [],
      isExternal: false,
      updatedAt: nowIso,
      history: [{ status: 'Pretendo candidatar-me', timestamp: nowIso }],
    };

    await db.applications.put(newApp);
    setApplications((prev) => [newApp, ...prev]);
    showToast(`"${job.title}" adicionada às tuas candidaturas!`);
    setActivePage('candidaturas');
  };

  const handleSaveApplication = async (app: JobApplicationRecord) => {
    await db.applications.put(app);
    setApplications((prev) => {
      const idx = prev.findIndex((item) => item.id === app.id);
      if (idx === -1) return [app, ...prev];
      const clone = [...prev];
      clone[idx] = app;
      return clone;
    });
    showToast('Candidatura actualizada e guardada localmente.');
  };

  const handleDeleteApplication = async (id: string) => {
    await db.applications.delete(id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
    showToast('Candidatura removida.');
  };

  const handleSaveProfile = async (nextProfile: UserProfile) => {
    await db.profiles.put(nextProfile);
    setProfile(nextProfile);
    showToast('Perfil profissional actualizado.');
  };

  const handleAddSkillToProfile = async (skill: string) => {
    const clean = skill.trim();
    if (!clean) return;
    if (profile.skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      showToast(`"${clean}" já faz parte do teu perfil.`);
      return;
    }
    const nextProfile: UserProfile = {
      ...profile,
      skills: [...profile.skills, clean],
      updatedAt: new Date().toISOString(),
    };
    await db.profiles.put(nextProfile);
    setProfile(nextProfile);
    showToast(`Competência "${clean}" adicionada ao teu Perfil Profissional!`);
  };

  const handleUpdatePreferences = async (
    partial: Partial<UserPreferencesRecord>
  ) => {
    // Visual feedback is immediate, even if storage is slow or unavailable.
    // A late initial feed response must not undo the user's latest choice.
    preferenceOverrides.current = { ...preferenceOverrides.current, ...partial };
    setPreferences(current => ({ ...current, ...partial }));
    if (typeof partial.includeDemoCatalog === 'boolean') {
      setFilters((prev) => ({
        ...prev,
        includeDemo: partial.includeDemoCatalog!,
      }));
    }
    try {
      await db.transaction('rw', db.preferences, async () => {
        const stored = await db.preferences.get('default');
        await db.preferences.put({ ...preferences, ...stored, ...partial, id: 'default' });
      });
    } catch {
      showToast('Preferência aplicada nesta sessão. Não foi possível guardá-la no navegador.');
    }
  };

  const handleSyncRealSources = async () => {
    setIsSyncing(true);
    setSyncSummary('');
    try {
      const res = await fetchApiJson('/api/sources/sync', { method: 'POST' });
      if (!res.ok) {
        setSyncSummary('Não foi possível concluir a sincronização neste momento.');
        setIsSyncing(false);
        return;
      }

      const payload = res.data as {
        syncedAt: string;
        jobs: JobOpportunity[];
        sourceReports: Array<{
          id: string;
          status: 'sincronizado' | 'indisponivel' | 'por_configurar';
          message: string;
          count: number;
          syncedAt: string;
        }>;
      };

      const deduped = await mergeCatalog(parseImportedJobs(payload.jobs));
      setJobs(deduped.mergedJobs);
      setDuplicatesMergedTotal((c) => c + deduped.duplicatesMergedCount);

      const updatedSources = sources.map((src) => {
        const rep = payload.sourceReports.find((r) => r.id === src.id);
        if (!rep) return src;
        return {
          ...src,
          lastSyncAt: rep.syncedAt,
          lastStatus: rep.status,
          statusMessage: rep.message,
          itemsCollected: rep.count,
        };
      });

      await db.sources.bulkPut(updatedSources);
      setSources(updatedSources);

      await handleUpdatePreferences({
        lastOfflineCatalogSyncAt: payload.syncedAt,
      });

      const realAdded = payload.jobs.length;
      const summaryMsg =
        realAdded > 0
          ? `Sincronização concluída: ${realAdded} anúncios recolhidos de feeds e APIs externas (${deduped.duplicatesMergedCount} duplicados unificados).`
          : `Consulta concluída (${payload.syncedAt.slice(11, 16)}): as fontes externas foram consultadas; vê o estado detalhado de cada fonte abaixo.`;

      setSyncSummary(summaryMsg);
      showToast(summaryMsg);
    } catch {
      setSyncSummary(
        'Sem ligação às APIs externas neste momento. O catálogo local permanece disponível.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportManualVerifiedJob = async (incomingJob: JobOpportunity) => {
    const deduped = await mergeCatalog([jobSchema.parse(incomingJob)]);
    setJobs(deduped.mergedJobs);
    if (deduped.duplicatesMergedCount > 0) {
      setDuplicatesMergedTotal((c) => c + deduped.duplicatesMergedCount);
    }
    showToast('Anúncio importado. Confirma os detalhes na fonte.');
  };

  const handleClearLocalData = async () => {
    await db.transaction('rw', db.tables, async () => {for(const table of db.tables) await table.clear();});
    preferenceOverrides.current = {};
    const reinit = await initializeLocalDatabase();
    setJobs(reinit.jobs);
    setSavedJobs(reinit.savedJobs);
    setApplications(reinit.applications);
    setProfile(reinit.profile);
    setPreferences(reinit.preferences);
    setCompanies(reinit.companies); setSources(reinit.sources);
    setFilters(DEFAULT_FILTERS); setSelectedJob(null);
    showToast('Base de dados local reposta com os valores iniciais.');
  };

  const handleExportFullBackup = async () => {
    const backupPayload = {
      app: 'VagasMZ',
      version: 2,
      companies,
      sources,
      exportedAt: new Date().toISOString(),
      profile,
      preferences,
      savedJobs,
      applications,
      jobs,
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VagasMZ_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup completo (.json) exportado com sucesso.');
  };

  const handleRestoreFullBackup = async (jsonText: string) => {
    const restored = await restoreBackup(jsonText);
    setProfile(restored.profile); setPreferences(restored.preferences);
    preferenceOverrides.current = restored.preferences;
    setFilters(prev => ({...prev,includeDemo:restored.preferences.includeDemoCatalog}));
    setSavedJobs(restored.savedJobs); setApplications(restored.applications); setJobs(restored.jobs);
    if(restored.companies) setCompanies(restored.companies);
    if(restored.sources) setSources(restored.sources);
    setSelectedJob(null);
    showToast('Backup completo restaurado com sucesso!');
  };

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [activePage]);

  useEffect(() => {
    if (importRequested && activePage === 'definicoes' && !isLoading) {
      document.getElementById('manual-import')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('imp-url')?.focus({ preventScroll: true });
      setImportRequested(false);
    }
  }, [importRequested, activePage, isLoading]);

  const sidebarGroups: Array<{
    groupTitle: string;
    items: Array<{
      id: ActivePage;
      label: string;
      icon: React.FC<{ className?: string }>;
      count?: number;
    }>;
  }> = [
    {
      groupTitle: 'DESCOBRIR',
      items: [
        { id: 'dashboard', label: 'Visão geral', icon: Home },
        {
          id: 'explorar',
          label: 'Explorar vagas',
          icon: Compass,
          count: filteredJobs.length,
        },
        {
          id: 'estagios',
          label: 'Estágios',
          icon: GraduationCap,
          count: internshipFilteredJobs.length,
        },
        {
          id: 'empresas',
          label: 'Empresas',
          icon: Building2,
          count: companies.length,
        },
      ],
    },
    {
      groupTitle: 'A MINHA CARREIRA',
      items: [
        {
          id: 'guardadas',
          label: 'Guardadas',
          icon: Bookmark,
          count: savedJobs.length,
        },
        {
          id: 'candidaturas',
          label: 'Candidaturas',
          icon: Briefcase,
          count: applications.length,
        },
        {
          id: 'alertas',
          label: 'Alertas',
          icon: Bell,
          count: alerts.length,
        },
      ],
    },
    {
      groupTitle: 'CONTA',
      items: [
        { id: 'perfil', label: 'Perfil', icon: User },
        { id: 'definicoes', label: 'Definições', icon: Settings },
      ],
    },
  ];

  return (
    <div className="app-shell">
      <AppSidebar activePage={activePage} onNavigate={setActivePage} onImport={() => { setActivePage('definicoes'); setImportRequested(true); }} />

      {/* Main Content Area */}
      <div className="app-content">
        <AppTopBar theme={preferences.theme} online={isOnline} profileName={profile.name} menuOpen={mobileMenuOpen} onToggleMenu={() => setMobileMenuOpen(value => !value)} onTheme={theme => { void handleUpdatePreferences({ theme }); }} onSearch={query => { setFilters(previous => ({ ...previous, query })); setActivePage('explorar'); }} onNavigate={setActivePage} />

        {/* Offline Banner */}
        {!isOnline && (
          <div
            role="status"
            className="px-4 py-2 bg-[var(--surface-bg)] border-b border-amber-500/40 text-xs text-amber-300 flex items-center justify-between gap-2"
          >
            <span className="inline-flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5" />
              <span>
                Modo Offline — A apresentar catálogo e candidaturas guardadas no navegador.
              </span>
            </span>
            <span className="font-mono-tabular">
              Última consulta: {preferences.lastOfflineCatalogSyncAt.slice(0, 16).replace('T', ' ')}
            </span>
          </div>
        )}

        {/* Mobile Slide-Over Menu Drawer for All Grouped Sections */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex"
            role="dialog"
            aria-modal="true"
            aria-label="Menu completo de navegação"
          >
            <div className="w-72 max-w-[85vw] bg-[var(--bg-secondary)] border-r border-[var(--border-color)] p-5 flex flex-col justify-between h-full overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <span className="font-display text-base font-bold text-[var(--text-primary)]">
                    VagasMZ
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Fechar menu"
                    className="p-2 rounded-lg text-[var(--text-secondary)] min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5">
                  {sidebarGroups.map((group) => (
                    <div key={group.groupTitle} className="space-y-1">
                      <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        {group.groupTitle}
                      </div>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activePage === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActivePage(item.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium min-h-[42px] ${
                              isActive
                                ? 'bg-[var(--surface-bg)] text-[var(--text-primary)] font-semibold border border-[var(--border-color)]'
                                : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            <span className="inline-flex items-center gap-2.5">
                              <Icon
                                className={`w-4 h-4 ${
                                  isActive
                                    ? 'text-[var(--accent-green)]'
                                    : 'text-[var(--text-secondary)]'
                                }`}
                              />
                              <span>{item.label}</span>
                            </span>
                            {typeof item.count === 'number' && item.count > 0 && (
                              <span className="font-mono-tabular text-xs text-[var(--text-muted)]">
                                {item.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div
              className="flex-1"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
          </div>
        )}

        {/* Main Content Viewport */}
        <main className={`app-main ${activePage === 'dashboard' ? 'app-main-dashboard' : ''}`}>
          {isLoading ? (
            <div className="space-y-4 animate-pulse" aria-busy="true">
              <div className="h-44 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)]" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-44 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)]" />
                <div className="h-44 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)]" />
              </div>
            </div>
          ) : (
            <>
              {activePage === 'dashboard' && (
                <DashboardView
                  jobs={jobs.filter((j) => filters.includeDemo || !j.isDemo)}
                  savedRecords={savedJobs}
                  applications={applications}
                  profile={profile}
                  sources={sources}
                  isSyncing={isSyncing}
                  onSelectJob={setSelectedJob}
                  onToggleSave={handleToggleSaveJob}
                  onTrackApplication={handleTrackOrConvertApplication}
                  onNavigate={setActivePage}
                  onQuickSearch={(patch) =>
                    setFilters((prev) => ({
                      ...DEFAULT_FILTERS,
                      includeDemo: prev.includeDemo,
                      ...patch,
                    }))
                  }
                  onSyncSources={handleSyncRealSources}
                />
              )}

              {activePage === 'explorar' && (
                <div className="space-y-6">
                  <div className="border-b border-[var(--border-color)] pb-5">
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                      Explorar vagas
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      Pesquisa por cargo, tecnologia, empresa, província ou cidade em Moçambique.
                    </p>
                  </div>

                  <SearchAndFiltersBar
                    filters={filters}
                    totalResults={filteredJobs.length}
                    onChangeFilters={(patch) =>
                      setFilters((prev) => ({ ...prev, ...patch }))
                    }
                    onResetFilters={() =>
                      setFilters({
                        ...DEFAULT_FILTERS,
                        includeDemo: preferences.includeDemoCatalog,
                      })
                    }
                  />

                  {filteredJobs.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-10 text-center space-y-3">
                      <EmptyStateIllustration />
                      <p className="font-display text-base font-bold text-[var(--text-primary)]">
                        Nenhuma oportunidade corresponde aos filtros seleccionados.
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                        Experimenta remover filtros restritivos, pesquisar por outra província ou activar a visualização de todo o catálogo.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            ...DEFAULT_FILTERS,
                            includeDemo: true,
                          })
                        }
                        className="px-4 py-2.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold min-h-[40px]"
                      >
                        Remover todos os filtros
                      </button>
                    </div>
                  ) : (
                    <div className="catalog-grid">
                      {filteredJobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          isSaved={savedSet.has(job.id)}
                          hasApplication={applicationJobIds.has(job.id)}
                          matchResult={computeJobMatch(job, profile)}
                          onSelectJob={setSelectedJob}
                          onToggleSave={handleToggleSaveJob}
                          onTrackApplication={handleTrackOrConvertApplication}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activePage === 'estagios' && (
                <div className="space-y-6">
                  <div className="border-b border-[var(--border-color)] pb-5">
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                      Estágios Profissionais &amp; Curriculares
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      Oportunidades dedicadas a estudantes universitários, finalistas e recém-graduados em Moçambique.
                    </p>
                  </div>

                  <SearchAndFiltersBar
                    filters={{ ...filters, opportunityKind: 'Estágio' }}
                    totalResults={internshipFilteredJobs.length}
                    lockOpportunityKind="Estágio"
                    onChangeFilters={(patch) =>
                      setFilters((prev) => ({
                        ...prev,
                        ...patch,
                        opportunityKind: 'Estágio',
                      }))
                    }
                    onResetFilters={() =>
                      setFilters({
                        ...DEFAULT_FILTERS,
                        opportunityKind: 'Estágio',
                        includeDemo: preferences.includeDemoCatalog,
                      })
                    }
                  />

                  {internshipFilteredJobs.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-10 text-center space-y-3">
                      <EmptyStateIllustration />
                      <p className="font-display text-base font-bold text-[var(--text-primary)]">
                        Nenhum estágio encontrado para os filtros actuais.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            ...DEFAULT_FILTERS,
                            opportunityKind: 'Estágio',
                            includeDemo: true,
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold min-h-[40px]"
                      >
                        Limpar filtros de estágios
                      </button>
                    </div>
                  ) : (
                    <div className="catalog-grid">
                      {internshipFilteredJobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          isSaved={savedSet.has(job.id)}
                          hasApplication={applicationJobIds.has(job.id)}
                          matchResult={computeJobMatch(job, profile)}
                          onSelectJob={setSelectedJob}
                          onToggleSave={handleToggleSaveJob}
                          onTrackApplication={handleTrackOrConvertApplication}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activePage === 'guardadas' && (
                <SavedJobsView
                  jobs={jobs}
                  savedRecords={savedJobs}
                  applicationJobIds={applicationJobIds}
                  onSelectJob={setSelectedJob}
                  onRemoveSaved={handleToggleSaveJob}
                  onConvertToApplication={handleTrackOrConvertApplication}
                  onUpdateSavedNote={handleUpdateSavedNote}
                />
              )}

              {activePage === 'candidaturas' && (
                <ApplicationsManagerView
                  applications={applications}
                  profile={profile}
                  onSaveApplication={handleSaveApplication}
                  onDeleteApplication={handleDeleteApplication}
                />
              )}

              {activePage === 'empresas' && (
                <CompaniesView
                  companies={companies}
                  jobs={jobs.filter(j => preferences.includeDemoCatalog || !j.isDemo)}
                  onFilterByCompany={(companyName) => {
                    setFilters({
                      ...DEFAULT_FILTERS,
                      query: companyName,
                      includeDemo: preferences.includeDemoCatalog,
                    });
                    setActivePage('explorar');
                  }}
                />
              )}

              {activePage === 'alertas' && (
                <AlertsView
                  alerts={alerts}
                  jobs={jobs}
                  onSelectJob={setSelectedJob}
                  onGoToApplications={() => setActivePage('candidaturas')}
                />
              )}

              {activePage === 'perfil' && (
                <ProfileView
                  profile={profile}
                  onSaveProfile={handleSaveProfile}
                />
              )}

              {activePage === 'definicoes' && (
                <DataSourcesAndSettingsView
                  preferences={preferences}
                  sources={sources}
                  isSyncing={isSyncing}
                  syncSummary={syncSummary}
                  duplicatesMergedTotal={duplicatesMergedTotal}
                  onUpdatePreferences={handleUpdatePreferences}
                  onSyncRealSources={handleSyncRealSources}
                  onImportManualVerifiedJob={handleImportManualVerifiedJob}
                  onClearLocalData={handleClearLocalData}
                  onExportFullBackup={handleExportFullBackup}
                  onRestoreFullBackup={handleRestoreFullBackup}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Compact Mobile Bottom Navigation Bar (Main Sections + Menu for Rest) */}
      <nav
        aria-label="Navegação inferior móvel"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-md border-t border-[var(--border-color)] grid grid-cols-5 items-center h-16 pb-safe"
      >
        {[
          { id: 'dashboard' as const, label: 'Visão geral', icon: Home },
          { id: 'explorar' as const, label: 'Explorar', icon: Compass },
          { id: 'estagios' as const, label: 'Estágios', icon: GraduationCap },
          { id: 'candidaturas' as const, label: 'Candidaturas', icon: Briefcase },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activePage === tab.id && !mobileMenuOpen;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActivePage(tab.id);
                setMobileMenuOpen(false);
              }}
              className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] transition-colors ${
                isActive
                  ? 'text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? 'text-[var(--accent-green)]' : ''
                }`}
              />
              <span className="text-[10px] font-medium mt-1 truncate">
                {tab.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] transition-colors ${
            mobileMenuOpen
              ? 'text-[var(--text-primary)] font-semibold'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1 truncate">Menu</span>
        </button>
      </nav>

      {/* Job Details Modal */}
      <JobDetailModal
        job={selectedJob}
        profile={profile}
        isSaved={selectedJob ? savedSet.has(selectedJob.id) : false}
        hasApplication={selectedJob ? applicationJobIds.has(selectedJob.id) : false}
        matchResult={selectedJob ? computeJobMatch(selectedJob, profile) : undefined}
        onClose={() => setSelectedJob(null)}
        onToggleSave={handleToggleSaveJob}
        onTrackApplication={handleTrackOrConvertApplication}
        onAddSkillToProfile={handleAddSkillToProfile}
      />

      {/* Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 right-4 z-50 px-4 py-3 rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-bg)] text-xs font-semibold text-[var(--text-primary)] shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
