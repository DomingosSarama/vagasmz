import React, { useState } from 'react';
import { Check, Download, RotateCcw, Save } from 'lucide-react';
import {
  ALL_PROFESSIONAL_AREAS,
  MOZAMBIQUE_PROVINCES,
  type ContractType,
  type ExperienceLevel,
  type ProfessionalArea,
  type ProvinceMZ,
  type UserProfile,
} from '../types/index.ts';
import { DEFAULT_USER_PROFILE } from '../data/seedCatalog.ts';
import { sanitizeText } from '../utils/careerLogic.ts';

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (next: UserProfile) => Promise<void>;
}

const CONTRACT_OPTIONS: ContractType[] = [
  'Estágio Profissional',
  'Programa de Trainees',
  'Tempo Inteiro',
  'Contrato a Prazo',
  'Consultoria / Freelance',
];

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onSaveProfile }) => {
  const [name, setName] = useState(profile.name);
  const [education, setEducation] = useState(profile.education);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    profile.experienceLevel
  );
  const [areas, setAreas] = useState<ProfessionalArea[]>(profile.areasOfInterest);
  const [provinces, setProvinces] = useState<ProvinceMZ[]>(profile.preferredProvinces);
  const [skillsInput, setSkillsInput] = useState(profile.skills.join(', '));
  const [contracts, setContracts] = useState<ContractType[]>(profile.preferredContracts);
  const [interestedInInternships, setInterestedInInternships] = useState(
    profile.interestedInInternships
  );
  const [openToRemote, setOpenToRemote] = useState(profile.openToRemote);
  const [savedToast, setSavedToast] = useState(false);

  const toggleArea = (area: ProfessionalArea) => {
    setAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const toggleProvince = (prov: ProvinceMZ) => {
    setProvinces((prev) =>
      prev.includes(prov) ? prev.filter((p) => p !== prov) : [...prev, prov]
    );
  };

  const toggleContract = (ct: ContractType) => {
    setContracts((prev) =>
      prev.includes(ct) ? prev.filter((c) => c !== ct) : [...prev, ct]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSkills = skillsInput
      .split(',')
      .map((s) => sanitizeText(s, 50))
      .filter(Boolean);

    const updated: UserProfile = {
      id: 'default',
      name: sanitizeText(name, 120),
      education: sanitizeText(education, 200),
      experienceLevel,
      areasOfInterest: areas,
      preferredProvinces: provinces,
      skills: parsedSkills,
      preferredContracts: contracts,
      interestedInInternships,
      openToRemote,
      updatedAt: new Date().toISOString(),
    };

    await onSaveProfile(updated);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleExportProfile = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VagasMZ_Perfil_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetProfile = async () => {
    const reset: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      name: '',
      updatedAt: new Date().toISOString(),
    };
    setName(reset.name);
    setEducation(reset.education);
    setExperienceLevel(reset.experienceLevel);
    setAreas(reset.areasOfInterest);
    setProvinces(reset.preferredProvinces);
    setSkillsInput(reset.skills.join(', '));
    setContracts(reset.preferredContracts);
    setInterestedInInternships(reset.interestedInInternships);
    setOpenToRemote(reset.openToRemote);
    await onSaveProfile(reset);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Perfil Profissional
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Guardado localmente no teu dispositivo (sem necessidade de criar conta). Define os critérios usados nas recomendações heurísticas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportProfile}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-green)] min-h-[44px]"
          >
            <Download className="w-4 h-4 text-[var(--accent-green)]" />
            <span>Exportar Perfil (JSON)</span>
          </button>

          <button
            type="button"
            onClick={handleResetProfile}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs font-medium text-[var(--text-secondary)] hover:text-red-400 min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Repor Padrão</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <section className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            1. Identificação e Formação Académica
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label htmlFor="prof-name" className="block text-[var(--text-secondary)] mb-1">
                Nome (Opcional — usado apenas localmente e em PDF)
              </label>
              <input
                id="prof-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Edson Macamo"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[42px]"
              />
            </div>

            <div>
              <label htmlFor="prof-edu" className="block text-[var(--text-secondary)] mb-1">
                Formação Académica / Instituição
              </label>
              <input
                id="prof-edu"
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="Ex: Engenharia Informática (UEM / ISUTC / UniLúrio)"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[42px]"
              />
            </div>

            <div>
              <label htmlFor="prof-exp" className="block text-[var(--text-secondary)] mb-1">
                Nível de Experiência Actual
              </label>
              <select
                id="prof-exp"
                value={experienceLevel}
                onChange={(e) =>
                  setExperienceLevel(
                    e.target.value as ExperienceLevel
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-primary)] min-h-[42px]"
              >
                <option value="Não informado">Não informado</option>
                <option value="Estudante / Estágio">Estudante / Estágio</option>
                <option value="Júnior / Entry-Level">Júnior / Entry-Level</option>
                <option value="Pleno / Mid-Level">Pleno / Mid-Level</option>
                <option value="Sénior">Sénior</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="prof-skills" className="block text-xs text-[var(--text-secondary)] mb-1">
              Tecnologias e Competências (separadas por vírgula)
            </label>
            <input
              id="prof-skills"
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="Ex: TypeScript, React, SQL, Linux, Redes TCP/IP, Python, Contabilidade PGC-NIRF"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs text-[var(--text-primary)] min-h-[42px]"
            />
          </div>
        </section>

        {/* Areas of Interest */}
        <section className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-3">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            2. Áreas Profissionais de Interesse
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Selecciona as áreas que pretendes acompanhar no Dashboard e nas recomendações:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {ALL_PROFESSIONAL_AREAS.map((area) => {
              const active = areas.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors min-h-[38px] ${
                    active
                      ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--surface-bg)]'
                      : 'border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
        </section>

        {/* Provinces & Work Preferences */}
        <section className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            3. Localizações em Moçambique e Preferências de Contrato
          </h2>

          <div className="flex flex-wrap gap-2">
            {MOZAMBIQUE_PROVINCES.map((prov) => {
              const active = provinces.includes(prov);
              return (
                <button
                  key={prov}
                  type="button"
                  onClick={() => toggleProvince(prov)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors min-h-[38px] ${
                    active
                      ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--surface-bg)]'
                      : 'border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {prov}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[var(--border-color)]">
            <span className="block text-xs text-[var(--text-secondary)] mb-2">
              Tipos de contrato preferidos:
            </span>
            <div className="flex flex-wrap gap-2">
              {CONTRACT_OPTIONS.map((ct) => {
                const active = contracts.includes(ct);
                return (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => toggleContract(ct)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors min-h-[38px] ${
                      active
                        ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--surface-bg)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {ct}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-color)] flex flex-wrap gap-6 text-xs text-[var(--text-primary)]">
            <label className="inline-flex items-center gap-2 cursor-pointer min-h-[38px]">
              <input
                type="checkbox"
                checked={interestedInInternships}
                onChange={(e) => setInterestedInInternships(e.target.checked)}
                className="accent-[var(--accent-green)] w-4 h-4"
              />
              <span>Tenho especial interesse em Estágios Profissionais e Programas de Trainees</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer min-h-[38px]">
              <input
                type="checkbox"
                checked={openToRemote}
                onChange={(e) => setOpenToRemote(e.target.checked)}
                className="accent-[var(--accent-green)] w-4 h-4"
              />
              <span>Disponível para oportunidades de Trabalho Remoto</span>
            </label>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          {savedToast && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-green)]">
              <Check className="w-4 h-4" />
              Perfil guardado localmente e recomendações actualizadas!
            </span>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold hover:opacity-90 transition-opacity min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Perfil Profissional</span>
          </button>
        </div>
      </form>
    </div>
  );
};
