'use client';

import React from 'react';
import { TechnicianDTO } from '../lib/types';
import { Search, Calendar, Filter, X, User } from 'lucide-react';

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
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;
  const hasActiveFilters = selectedTechId !== '' || selectedDate !== '' || selectedStatus !== 'ALL' || searchQuery.trim() !== '';

  return (
    <div className="w-full apple-glass-subtle rounded-2xl p-3 sm:p-4 border border-white/[0.08] shadow-lg mb-6 backdrop-blur-xl">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        
        {/* Fila 1: Filtro de Técnico y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-1">
          {/* Selector de Técnico */}
          <div className="relative w-full sm:w-auto sm:min-w-[220px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#86868B]">
              <User className="w-4 h-4" />
            </div>
            <select
              value={selectedTechId}
              onChange={(e) => onSelectTechId(e.target.value)}
              className="w-full min-hit-area pl-9 pr-8 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.08] border border-white/[0.1] rounded-xl text-xs sm:text-sm text-[#F5F5F7] appearance-none outline-none focus:border-[#2997FF] transition-colors cursor-pointer"
            >
              <option value="" className="bg-[#121418] text-[#F5F5F7]">
                Todos los técnicos ({technicians.length})
              </option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#121418] text-[#F5F5F7]">
                  {t.name} — {t.specialty.split(' ')[0]}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#86868B]">
              <Filter className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Búsqueda por obra o municipio */}
          <div className="relative w-full sm:flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#86868B]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar obra, municipio o notas..."
              className="w-full min-hit-area pl-9 pr-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.08] border border-white/[0.1] rounded-xl text-xs sm:text-sm text-[#F5F5F7] placeholder-[#86868B] outline-none focus:border-[#2997FF] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="apple-press absolute inset-y-0 right-0 pr-3 flex items-center text-[#86868B] hover:text-[#F5F5F7] cursor-pointer"
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
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.1] rounded-xl p-1">
            <button
              onClick={() => onSelectDate(isToday ? '' : todayStr)}
              className={`apple-press px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                isToday
                  ? 'bg-[#2997FF] text-white shadow-sm'
                  : 'text-[#86868B] hover:text-[#F5F5F7]'
              }`}
            >
              Hoy
            </button>
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 absolute left-2 text-[#86868B] pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="pl-7 pr-2 py-1 bg-transparent text-xs text-[#F5F5F7] outline-none cursor-pointer scheme-dark"
                title="Filtrar por fecha específica"
              />
            </div>
            {selectedDate && (
              <button
                onClick={() => onSelectDate('')}
                className="apple-press p-1 text-[#86868B] hover:text-[#F5F5F7] rounded cursor-pointer"
                title="Ver todas las fechas"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Segmented Control Concéntrico: outer rounded-xl (12px) = inner rounded-lg (8px) + padding (4px) */}
          <div className="flex items-center bg-white/[0.04] border border-white/[0.1] rounded-xl p-1 select-none">
            {(
              [
                { id: 'ALL', label: 'Todas' },
                { id: 'SCHEDULED', label: 'Activas' },
                { id: 'CANCELLED', label: 'Canceladas' },
              ] as const
            ).map((tab) => {
              const active = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectStatus(tab.id)}
                  className={`apple-press min-hit-area px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center ${
                    active
                      ? 'bg-white/10 text-[#F5F5F7] shadow-sm font-semibold'
                      : 'text-[#86868B] hover:text-[#F5F5F7]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Botón Reset / Conteo de resultados */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#86868B] px-2 py-1 tabular-numbers">
              {totalResultsCount} {totalResultsCount === 1 ? 'visita' : 'visitas'}
            </span>
            {hasActiveFilters && (
              <button
                onClick={onResetFilters}
                className="apple-press min-hit-area inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs text-[#86868B] hover:text-[#F5F5F7] border border-white/[0.08] cursor-pointer"
                title="Restablecer todos los filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restablecer</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
