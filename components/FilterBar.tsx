'use client';

import React from 'react';
import { TechnicianDTO } from '../lib/types';
import { Search, Calendar, Filter, X, User } from 'lucide-react';
import { Language, translations } from '../lib/i18n/translations';

interface FilterBarProps {
  technicians: TechnicianDTO[];
  selectedTechId: string;
  onSelectTechId: (techId: string) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedStatus: 'ALL' | 'SCHEDULED' | 'CANCELLED';
  onSelectStatus: (status: 'ALL' | 'SCHEDULED' | 'CANCELLED') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onResetFilters: () => void;
  totalResultsCount: number;
  language: Language;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  technicians,
  selectedTechId,
  onSelectTechId,
  selectedDate,
  onSelectDate,
  selectedStatus,
  onSelectStatus,
  searchQuery,
  onSearchChange,
  onResetFilters,
  totalResultsCount,
  language,
}) => {
  const t = translations[language];
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;
  const hasActiveFilters =
    selectedTechId !== '' || selectedDate !== '' || selectedStatus !== 'ALL' || searchQuery.trim() !== '';

  const statusTabs = [
    { id: 'ALL' as const, label: t.statusAll },
    { id: 'SCHEDULED' as const, label: t.statusScheduled },
    { id: 'CANCELLED' as const, label: t.statusCancelled },
  ];

  return (
    <div className="w-full bg-[var(--bg-card)] rounded-[22px] p-3.5 sm:p-4 border border-[var(--border-subtle)] shadow-sm backdrop-blur-xl">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        
        {/* Fila 1: Filtro de Técnico y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-1">
          {/* Selector de Técnico */}
          <div className="relative w-full sm:w-auto sm:min-w-[230px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
              <User className="w-4 h-4" />
            </div>
            <select
              value={selectedTechId}
              onChange={(e) => onSelectTechId(e.target.value)}
              className="w-full min-hit-area pl-9 pr-8 py-2.5 bg-[var(--bg-card-hover)] hover:border-[#2997FF]/50 focus:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] appearance-none outline-none focus:border-[#2997FF] transition-colors cursor-pointer"
            >
              <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                {t.filterAllTechs} ({technicians.length})
              </option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                  {tech.name} — {tech.specialty.split(' ')[0]}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
              <Filter className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Búsqueda por obra, municipio o notas */}
          <div className="relative w-full sm:flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.filterSearchPlaceholder}
              className="w-full min-hit-area pl-9 pr-4 py-2.5 bg-[var(--bg-card-hover)] focus:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[#2997FF] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="apple-press absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Fila 2: Selector de Fecha + Segmented Control de Estado */}
        <div className="flex flex-wrap items-center gap-2.5 justify-between lg:justify-end">
          
          {/* Selector de Fecha */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] rounded-xl p-1">
            <button
              onClick={() => onSelectDate(isToday ? '' : todayStr)}
              className={`apple-press px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                isToday
                  ? 'bg-[#2997FF] text-white shadow-sm font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.filterTodayBtn}
            </button>
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 absolute left-2 text-[var(--text-secondary)] pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="pl-7 pr-2 py-1 bg-transparent text-xs text-[var(--text-primary)] outline-none cursor-pointer"
                title="Filtrar por fecha específica"
              />
            </div>
            {selectedDate && (
              <button
                onClick={() => onSelectDate('')}
                className="apple-press p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded cursor-pointer"
                title="Ver todas las fechas"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Segmented Control de Estado */}
          <div className="flex items-center bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] rounded-xl p-1 select-none">
            {statusTabs.map((tab) => {
              const active = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectStatus(tab.id)}
                  className={`apple-press min-hit-area px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center ${
                    active
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Conteo de resultados y botón Restablecer */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)] px-2 py-1 tabular-numbers font-medium">
              {totalResultsCount}{' '}
              {totalResultsCount === 1 ? t.filterVisitSingular : t.filterVisitPlural}
            </span>
            {hasActiveFilters && (
              <button
                onClick={onResetFilters}
                className="apple-press min-hit-area inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] cursor-pointer"
                title={t.filterResetTitle}
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.filterReset}</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
