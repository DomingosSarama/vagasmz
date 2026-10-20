import React, { useState } from 'react';
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import {
  ALL_PROFESSIONAL_AREAS,
  MOZAMBIQUE_PROVINCES,
  type ContractType,
  type ExperienceLevel,
  type JobFilterState,
  type OpportunityKind,
  type ProfessionalArea,
  type ProvinceMZ,
  type WorkMode,
} from '../types/index.ts';

interface SearchAndFiltersBarProps {
  filters: JobFilterState;
  totalResults: number;
  onChangeFilters: (next: Partial<JobFilterState>) => void;
  onResetFilters: () => void;
  lockOpportunityKind?: OpportunityKind;
}

export const SearchAndFiltersBar: React.FC<SearchAndFiltersBarProps> = ({
  filters,
  totalResults,
  onChangeFilters,
  onResetFilters,
  lockOpportunityKind,
}) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <section
      aria-label="Pesquisa e filtros de oportunidades"
      className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-4"
    >
      {/* Top Row: Search Input + Sort + Toggle Filters + Reset */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1">
          <label htmlFor="vagasmz-search-input" className="sr-only">
            Pesquisar cargo, empresa, competência, tecnologia ou cidade
          </label>
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="vagasmz-search-input"
            type="search"
            value={filters.query}
            onChange={(e) => onChangeFilters({ query: e.target.value })}
            placeholder="Pesquisar cargo, empresa, tecnologia (ex: React, Cibersegurança, SQL, Maputo, Beira)..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)] min-h-[42px]"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChangeFilters({ query: '' })}
              aria-label="Limpar texto da pesquisa"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[var(--surface-bg)] px-3 py-2 rounded-xl border border-[var(--border-color)]">
            <label htmlFor="sort-select" className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
              Ordenar por:
            </label>
            <select
              id="sort-select"
              value={filters.sortBy}
              onChange={(e) =>
                onChangeFilters({ sortBy: e.target.value as JobFilterState['sortBy'] })
              }
              className="bg-transparent text-xs font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="recent" className="bg-[var(--card-bg)] text-[var(--text-primary)]">Mais recentes</option>
              <option value="deadline" className="bg-[var(--card-bg)] text-[var(--text-primary)]">Prazo mais próximo</option>
              <option value="match" className="bg-[var(--card-bg)] text-[var(--text-primary)]">Melhor correspondência</option>
              <option value="company" className="bg-[var(--card-bg)] text-[var(--text-primary)]">Nome da empresa (A-Z)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors min-h-[42px] whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
          </button>

          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[42px] whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {/* Filter Dropdowns Grid */}
      {showFilters && (
        <div className="space-y-4 pt-2 border-t border-[var(--border-color)]">
          {/* Row 1 of Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label htmlFor="filter-province" className="block text-xs text-[var(--text-secondary)] mb-1">
                Província / Localização MZ
              </label>
              <select
                id="filter-province"
                value={filters.province}
                onChange={(e) =>
                  onChangeFilters({ province: e.target.value as ProvinceMZ | 'Todas' })
                }
                className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] min-h-[40px]"
              >
                <option value="Todas">Todas as províncias</option>
                {MOZAMBIQUE_PROVINCES.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-area" className="block text-xs text-[var(--text-secondary)] mb-1">
                Área Profissional
              </label>
              <select
                id="filter-area"
                value={filters.area}
                onChange={(e) =>
                  onChangeFilters({ area: e.target.value as ProfessionalArea | 'Todas' })
                }
                className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] min-h-[40px]"
              >
                <option value="Todas">Todas as áreas</option>
                {ALL_PROFESSIONAL_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-kind" className="block text-xs text-[var(--text-secondary)] mb-1">
                Tipo de Oportunidade
              </label>
              <select
                id="filter-kind"
                disabled={!!lockOpportunityKind}
                value={lockOpportunityKind || filters.opportunityKind}
                onChange={(e) =>
                  onChangeFilters({ opportunityKind: e.target.value as OpportunityKind | 'Todos' })
                }
                className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] min-h-[40px] disabled:opacity-60"
              >
                <option value="Todos">Estágios, Trainees e Empregos</option>
                <option value="Estágio">Apenas Estágios</option>
                <option value="Trainee">Programas de Trainees</option>
                <option value="Emprego">Emprego Profissional</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-workmode" className="block text-xs text-[var(--text-secondary)] mb-1">
                Modalidade de Trabalho
              </label>
              <select
                id="filter-workmode"
                value={filters.workMode}
                onChange={(e) =>
                  onChangeFilters({ workMode: e.target.value as WorkMode | 'Todos' })
                }
                className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] min-h-[40px]"
              >
                <option value="Todos">Presencial, Híbrido ou Remoto</option>
                <option value="Presencial">Presencial</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Remoto">Remoto</option>
              </select>
            </div>
          </div>

          {/* Row 2 of Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label htmlFor="filter-exp" className="block text-xs text-[var(--text-secondary)] mb-1">
                Nível de Experiência
              </label>
              <select
                id="filter-exp"
                value={filters.experienceLevel}
                onChange={(e) =>
                  onChangeFilters({ experienceLevel: e.target.value as ExperienceLevel | 'Todos' })
                }
                className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] min-h-[40px]"
              >
                <option value="Todos">Todos os níveis</option>
                <option value="Estudante / Estágio">Estudante / Estágio</option>
                <option value="Júnior / Entry-Level">Júnior / Entry-Level</option>
                <option value="Pleno / Mid-Level">Pleno / Mid-Level</option>
                <option value="Sénior">Sénior</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-contract" className="block text-xs text-[var(--text-secondary)] mb-1">
                Tipo de Contrato
              </label>
              <select
                id="filter-contract"
                value={filters.contractType}
                onChange={(e) =>
                  onChangeFilters({ contractType: e.target.value as ContractType | 'Todos' })
                }
                className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] min-h-[40px]"
              >
                <option value="Todos">Qualquer contrato</option>
                <option value="Estágio Profissional">Estágio Profissional</option>
                <option value="Programa de Trainees">Programa de Trainees</option>
                <option value="Tempo Inteiro">Tempo Inteiro</option>
                <option value="Contrato a Prazo">Contrato a Prazo</option>
                <option value="Consultoria / Freelance">Consultoria / Freelance</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-city" className="block text-xs text-[var(--text-secondary)] mb-1">
                Cidade (ex: Maputo, Beira, Nampula)
              </label>
              <input
                id="filter-city"
                type="text"
                value={filters.city}
                onChange={(e) => onChangeFilters({ city: e.target.value })}
                placeholder="Qualquer cidade..."
                className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] min-h-[40px]"
              />
            </div>

            <div>
              <label htmlFor="filter-pub" className="block text-xs text-[var(--text-secondary)] mb-1">
                Data de Publicação
              </label>
              <select
                id="filter-pub"
                value={filters.publishedWithinDays}
                onChange={(e) => {
                  const val = e.target.value;
                  onChangeFilters({ publishedWithinDays: val === 'all' ? 'all' : Number(val) });
                }}
                className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] min-h-[40px]"
              >
                <option value="all">Qualquer data</option>
                <option value="3">Últimos 3 dias</option>
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
              </select>
            </div>
          </div>

          {/* Checkboxes & Result Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onlyActiveDeadlines}
                  onChange={(e) => onChangeFilters({ onlyActiveDeadlines: e.target.checked })}
                  className="rounded border-[var(--border-color)] accent-[var(--text-primary)] cursor-pointer"
                />
                <span className="text-[var(--text-secondary)]">Ocultar prazos expirados</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onlyDisclosedSalary}
                  onChange={(e) => onChangeFilters({ onlyDisclosedSalary: e.target.checked })}
                  className="rounded border-[var(--border-color)] accent-[var(--text-primary)] cursor-pointer"
                />
                <span className="text-[var(--text-secondary)]">Apenas com salário divulgado</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.includeDemo}
                  onChange={(e) => onChangeFilters({ includeDemo: e.target.checked })}
                  className="rounded border-[var(--border-color)] accent-[var(--text-primary)] cursor-pointer"
                />
                <span className="text-[var(--text-secondary)]">Mostrar registos de Demonstração identificados</span>
              </label>
            </div>

            <div className="font-mono-tabular text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">
              {totalResults} {totalResults === 1 ? 'oportunidade encontrada' : 'oportunidades encontradas'}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
