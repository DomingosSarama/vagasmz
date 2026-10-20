import React, { useState } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  Moon,
  PlusCircle,
  RefreshCw,
  Shield,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ALL_PROFESSIONAL_AREAS,
  MOZAMBIQUE_PROVINCES,
  type ContractType,
  type DataSourceConfig,
  type ExperienceLevel,
  type JobOpportunity,
  type OpportunityKind,
  type ProfessionalArea,
  type ProvinceMZ,
  type WorkMode,
} from '../types/index.ts';
import type { UserPreferencesRecord } from '../db/localDatabase.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { fetchApiJson } from '../utils/apiClient.ts';
import type { extractMetadataFromHtml } from '../utils/careerLogic.ts';

interface DataSourcesAndSettingsViewProps {
  preferences: UserPreferencesRecord;
  sources: DataSourceConfig[];
  isSyncing: boolean;
  syncSummary: string;
  duplicatesMergedTotal: number;
  onUpdatePreferences: (partial: Partial<UserPreferencesRecord>) => Promise<void>;
  onSyncRealSources: () => Promise<void>;
  onImportManualVerifiedJob: (job: JobOpportunity) => Promise<void>;
  onClearLocalData: () => Promise<void>;
  onExportFullBackup?: () => Promise<void>;
  onRestoreFullBackup?: (jsonText: string) => Promise<void>;
}

export const DataSourcesAndSettingsView: React.FC<DataSourcesAndSettingsViewProps> = ({
  preferences,
  sources,
  isSyncing,
  syncSummary,
  duplicatesMergedTotal,
  onUpdatePreferences,
  onSyncRealSources,
  onImportManualVerifiedJob,
  onClearLocalData,
  onExportFullBackup,
  onRestoreFullBackup,
}) => {
  // Manual verified import form
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [province, setProvince] = useState<ProvinceMZ>('Não informado');
  const [city, setCity] = useState('');
  const [area, setArea] = useState<ProfessionalArea>('Outras áreas');
  const [opportunityKind, setOpportunityKind] = useState<OpportunityKind>('Emprego');
  const [contractType, setContractType] = useState<ContractType>('Não informado');
  const [workMode, setWorkMode] = useState<WorkMode>('Não informado');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Não informado');
  const [deadline, setDeadline] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [skills, setSkills] = useState('');
  const [description, setDescription] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [backupStatusMsg, setBackupStatusMsg] = useState('');

  const handleAutoExtractFromUrl = async () => {
    if (!canonicalUrl.trim()) {
      setImportError('Cola primeiro o URL oficial da vaga (https://...) para preencher os campos.');
      return;
    }
    setImportError('');
    setImportSuccess('');
    setIsExtractingUrl(true);

    try {
      const res = await fetchApiJson<{error?:string; extracted?:ReturnType<typeof extractMetadataFromHtml>; normalizedUrl?:string}>('/api/jobs/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: canonicalUrl }),
      });
      const data = res.data;
      if (!res.ok) {
        setImportError(data.error || 'Não foi possível extrair os metadados deste URL.');
        setIsExtractingUrl(false);
        return;
      }

      const ext = data.extracted;
      if (ext) {
        setTitle(ext.title || '');
        setCompany(ext.company || '');
        if (ext.province) setProvince(ext.province);
        if (ext.city) setCity(ext.city);
        if (ext.area) setArea(ext.area);
        if (ext.opportunityKind) {
          setOpportunityKind(ext.opportunityKind);
          if (ext.opportunityKind === 'Estágio') {
            setContractType('Estágio Profissional');
            setExperienceLevel('Estudante / Estágio');
          }
        }
        if (ext.sourceName) setSourceName(ext.sourceName);
        if (ext.skills) setSkills(ext.skills);
        if (ext.description) setDescription(ext.description);
        if (ext.deadline) setDeadline(ext.deadline);
        if (data.normalizedUrl) setCanonicalUrl(data.normalizedUrl);
        setImportSuccess(
          'Metadados recebidos da página. Confirma cargo, empresa, localização e prazo antes de guardar.'
        );
      }
    } catch {
      setImportError('Erro ao contactar o servidor para extrair dados do URL.');
    } finally {
      setIsExtractingUrl(false);
    }
  };

  const handleBackupFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onRestoreFullBackup) return;
    setBackupStatusMsg('');
    try {
      if(file.size > 5 * 1024 * 1024) throw new Error('Ficheiro demasiado grande');
      const text = await file.text();
      await onRestoreFullBackup(text);
      setBackupStatusMsg('Backup completo restaurado com sucesso na base de dados local!');
    } catch {
      setBackupStatusMsg('Ficheiro de backup inválido ou corrompido.');
    } finally {
      e.target.value = '';
    }
  };

  const handleManualImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImportSuccess('');

    try {
      const response = await fetchApiJson<{error?:string; job?:JobOpportunity}>('/api/jobs/validate-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          company,
          province,
          city,
          area,
          opportunityKind,
          contractType,
          workMode,
          experienceLevel,
          deadline,
          salaryRange,
          sourceName,
          canonicalUrl,
          skills,
          description,
        }),
      });

      const data = response.data;
      if (!response.ok) {
        setImportError(data.error || 'Erro ao validar o anúncio.');
        return;
      }

      await onImportManualVerifiedJob(data.job as JobOpportunity);
      setImportSuccess(
        'Anúncio importado; disponibilidade por confirmar. Caso já existisse no catálogo, as fontes foram unificadas automaticamente.'
      );
      setTitle('');
      setCompany('');
      setCanonicalUrl('');
      setDescription('');
      setSkills('');
    } catch {
      setImportError('Erro de ligação ao validar o anúncio.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-[var(--border-color)] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Definições, Fontes Reais & Privacidade
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Configura o tema visual, gere as fontes de recolha de oportunidades, importa URLs verificáveis e instala a aplicação PWA.
          </p>
        </div>
        <PWAInstallButton />
      </div>

      {/* 1. Aparência & Identidade Visual */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-4">
        <h2 className="text-base font-bold text-[var(--text-primary)]">
          1. Aparência (Modo Escuro / Modo Claro)
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onUpdatePreferences({ theme: 'dark' })}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold min-h-[42px] ${
              preferences.theme === 'dark'
                ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--surface-bg)]'
                : 'border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-secondary)]'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Modo Escuro</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdatePreferences({ theme: 'light' })}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold min-h-[42px] ${
              preferences.theme === 'light'
                ? 'border-[var(--accent-green)] text-[var(--text-primary)] bg-[var(--surface-bg)]'
                : 'border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-secondary)]'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Modo Claro</span>
          </button>
        </div>

        <div className="pt-3 border-t border-[var(--border-color)]">
          <label className="inline-flex items-center gap-2.5 text-xs text-[var(--text-primary)] cursor-pointer min-h-[38px]">
            <input
              type="checkbox"
              checked={preferences.includeDemoCatalog}
              onChange={(e) =>
                onUpdatePreferences({ includeDemoCatalog: e.target.checked })
              }
              className="accent-[var(--accent-green)] w-4 h-4"
            />
            <span>
              Incluir vagas de <strong>Exemplo</strong> no catálogo (desmarca para apresentar apenas oportunidades importadas de fontes externas).
            </span>
          </label>
        </div>
      </section>

      {/* 2. Fontes de Oportunidades & Sincronização Manual/Autorizada */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              2. Fontes Oficiais e Sincronização
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Consulta de APIs públicas autorizadas e páginas de carreiras. Vagas duplicadas unificadas: <strong className="text-[var(--accent-green)]">{duplicatesMergedTotal}</strong>.
            </p>
          </div>

          <button
            type="button"
            disabled={isSyncing}
            onClick={onSyncRealSources}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold hover:opacity-90 transition-opacity min-h-[42px] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'A actualizar...' : 'Sincronizar Fontes Agora'}</span>
          </button>
        </div>

        {syncSummary && (
          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs text-[var(--text-primary)]">
            {syncSummary}
          </div>
        )}

        <div className="space-y-2.5">
          {sources.map((src) => (
            <div
              key={src.id}
              className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="space-y-1">
                <div className="font-bold text-[var(--text-primary)]">
                  {src.name}{' '}
                  <span className="font-normal text-[var(--text-muted)]">
                    · {src.category}
                  </span>
                </div>
                <div className="text-[var(--text-secondary)]">{src.statusMessage}</div>
              </div>

              <div className="sm:text-right shrink-0 font-mono-tabular">
                <div
                  className={
                    src.lastStatus === 'sincronizado'
                      ? 'text-[var(--accent-green)] font-semibold'
                      : src.lastStatus === 'indisponivel'
                      ? 'text-amber-400 font-semibold'
                      : 'text-[var(--text-secondary)]'
                  }
                >
                  {src.lastStatus === 'sincronizado'
                    ? 'Sincronizado'
                    : src.lastStatus === 'indisponivel'
                    ? 'Indisponível no momento'
                    : 'Fonte por configurar'}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  {src.lastSyncAt
                    ? `Última consulta: ${src.lastSyncAt.slice(0, 16).replace('T', ' ')}`
                    : 'Sem sincronização prévia'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Importação Manual de Anúncio Oficial com URL Verificável */}
      <section id="manual-import" className="scroll-mt-24 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-[var(--accent-green)]" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            3. Adicionar anúncio ao catálogo
          </h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Adiciona um anúncio ao teu catálogo local. Esta acção não publica na Internet. Cola o link da fonte para preencher os dados e confirma a informação antes de guardar.
        </p>

        <form onSubmit={handleManualImport} className="space-y-3 text-xs">
          {importError && (
            <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300">
              {importError}
            </div>
          )}
          {importSuccess && (
            <div className="p-3 rounded-lg border border-[var(--accent-green)]/50 bg-[var(--surface-bg)] text-[var(--accent-green)] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}

          {/* URL Auto-Extract Bar */}
          <div className="p-3.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] space-y-2">
            <label htmlFor="imp-url" className="block text-[var(--text-secondary)] font-semibold">
              URL Oficial Verificável (https://) *
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="imp-url"
                type="url"
                required
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder="Ex: https://www.cornelder.co.mz/carreiras/engenheiro-redes-beira"
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)] min-h-[40px]"
              />
              <button
                type="button"
                disabled={isExtractingUrl}
                onClick={handleAutoExtractFromUrl}
                className="px-4 py-2 rounded-lg border border-[var(--accent-green)] bg-[var(--card-bg)] text-[var(--accent-green)] font-bold hover:opacity-90 min-h-[40px] whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {isExtractingUrl ? 'A extrair metadados...' : 'Preencher pelo URL'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="imp-title" className="block text-[var(--text-secondary)] mb-1">
                Cargo da Oportunidade *
              </label>
              <input
                id="imp-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Engenheiro de Cibersegurança"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
              />
            </div>
            <div>
              <label htmlFor="imp-company" className="block text-[var(--text-secondary)] mb-1">
                Empresa / Instituição *
              </label>
              <input
                id="imp-company"
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Ex: Banco de Moçambique"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="imp-prov" className="block text-[var(--text-secondary)] mb-1">
                Província
              </label>
              <select
                id="imp-prov"
                value={province}
                onChange={(e) => setProvince(e.target.value as ProvinceMZ)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
              >
                {MOZAMBIQUE_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="imp-city" className="block text-[var(--text-secondary)] mb-1">
                Cidade
              </label>
              <input
                id="imp-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
              />
            </div>
            <div>
              <label htmlFor="imp-area" className="block text-[var(--text-secondary)] mb-1">
                Área Profissional
              </label>
              <select
                id="imp-area"
                value={area}
                onChange={(e) => setArea(e.target.value as ProfessionalArea)}
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
              <label htmlFor="imp-kind" className="block text-[var(--text-secondary)] mb-1">
                Tipo (Estágio / Emprego)
              </label>
              <select
                id="imp-kind"
                value={opportunityKind}
                onChange={(e) => setOpportunityKind(e.target.value as OpportunityKind)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
              >
                <option value="Emprego">Emprego</option>
                <option value="Estágio">Estágio</option>
                <option value="Trainee">Trainee</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="imp-contract" className="block text-[var(--text-secondary)] mb-1">
                Contrato
              </label>
              <select
                id="imp-contract"
                value={contractType}
                onChange={(e) => setContractType(e.target.value as ContractType)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
              >
                <option value="Tempo Inteiro">Tempo Inteiro</option>
                <option value="Estágio Profissional">Estágio Profissional</option>
                <option value="Programa de Trainees">Programa de Trainees</option>
                <option value="Contrato a Prazo">Contrato a Prazo</option>
                <option value="Não informado">Não informado</option>
              </select>
            </div>
            <div>
              <label htmlFor="imp-mode" className="block text-[var(--text-secondary)] mb-1">
                Modalidade
              </label>
              <select
                id="imp-mode"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
              >
                <option value="Presencial">Presencial</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Remoto">Remoto</option>
              </select>
            </div>
            <div>
              <label htmlFor="imp-exp" className="block text-[var(--text-secondary)] mb-1">
                Experiência
              </label>
              <select
                id="imp-exp"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
              >
                <option value="Estudante / Estágio">Estudante / Estágio</option>
                <option value="Júnior / Entry-Level">Júnior / Entry-Level</option>
                <option value="Pleno / Mid-Level">Pleno / Mid-Level</option>
                <option value="Sénior">Sénior</option>
                <option value="Não informado">Não informado</option>
              </select>
            </div>
            <div>
              <label htmlFor="imp-dl" className="block text-[var(--text-secondary)] mb-1">
                Prazo (se divulgado)
              </label>
              <input
                id="imp-dl"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="imp-src" className="block text-[var(--text-secondary)] mb-1">
                Nome da Fonte Oficial
              </label>
              <input
                id="imp-src"
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="Ex: Página Oficial de Carreiras"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
              />
            </div>
            <div>
              <label htmlFor="imp-sal" className="block text-[var(--text-secondary)] mb-1">
                Salário (apenas se divulgado)
              </label>
              <input
                id="imp-sal"
                type="text"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                placeholder="Deixar em branco = Não informado"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
              />
            </div>
            <div>
              <label htmlFor="imp-skills" className="block text-[var(--text-secondary)] mb-1">
                Competências (separadas por vírgula)
              </label>
              <input
                id="imp-skills"
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Ex: SQL, Linux, Redes"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[40px]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="imp-desc" className="block text-[var(--text-secondary)] mb-1">
              Resumo do anúncio
            </label>
            <textarea
              id="imp-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição fidedigna divulgada pela entidade empregadora..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)]"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold min-h-[44px]"
            >
              Validar e Registar Vaga no Catálogo
            </button>
          </div>
        </form>
      </section>

      {/* 4. Base de Dados Local (IndexedDB), Backup Completo & Segurança */}
      <section className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-4 text-xs">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#B5F07A]" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            4. Os teus dados, cópias de segurança e privacidade
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[var(--text-secondary)]">
          <div className="p-3.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] space-y-1">
            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#B5F07A]" />
              <span>Dados Privados no Navegador</span>
            </div>
            <p>
              O teu perfil, vagas guardadas, notas e candidaturas ficam guardados neste navegador, neste dispositivo. O acesso privado ao site exige ligação à Internet e uma sessão válida.
            </p>
          </div>
          <div className="p-3.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] space-y-2">
            <div className="font-semibold text-[var(--text-primary)]">
              Transferir os teus dados (PC ↔ Telemóvel)
            </div>
            <p>
              Exporta as tuas candidaturas, vagas guardadas, perfil e preferências. O ficheiro contém dados pessoais: guarda-o num local seguro. Restaurar uma cópia substitui os dados actuais após validação.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onExportFullBackup && (
                <button
                  type="button"
                  onClick={onExportFullBackup}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:border-[var(--accent-green)] font-semibold min-h-[38px]"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                  <span>Exportar Backup (.json)</span>
                </button>
              )}
              {onRestoreFullBackup && (
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:border-[var(--accent-green)] font-semibold min-h-[38px] cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                  <span>Restaurar Backup (.json)</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={handleBackupFileUpload}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
            {backupStatusMsg && (
              <p className="text-[var(--accent-green)] font-semibold pt-1">
                {backupStatusMsg}
              </p>
            )}
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[var(--text-muted)]">
            Última sincronização offline: {preferences.lastOfflineCatalogSyncAt.slice(0, 16).replace('T', ' ')} · Podes limpar e repor os dados locais a qualquer momento:
          </span>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-red-400 hover:border-red-400 font-semibold min-h-[40px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Repor Base de Dados Local</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await onClearLocalData();
                  setConfirmReset(false);
                }}
                className="px-3.5 py-2 rounded-lg bg-red-600 text-white font-bold min-h-[40px]"
              >
                Confirmar Reposição
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] min-h-[40px]"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
