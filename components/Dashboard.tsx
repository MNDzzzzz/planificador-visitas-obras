'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CreateVisitInput,
  SiteDTO,
  TechnicianDTO,
  VisitDTO,
} from '../lib/types';
import { cancelVisitAction, scheduleVisitAction } from '../lib/actions/visits';
import { Header } from './Header';
import { FilterBar } from './FilterBar';
import { VisitsList } from './VisitsList';
import { TimelineView } from './TimelineView';
import { ScheduleModal } from './ScheduleModal';
import { CopilotPanel } from './CopilotPanel';
import { CheckCircle, Info } from 'lucide-react';
import { Language, translations } from '../lib/i18n/translations';

interface DashboardProps {
  initialData: {
    technicians: TechnicianDTO[];
    sites: SiteDTO[];
    visits: VisitDTO[];
  };
}

export const Dashboard: React.FC<DashboardProps> = ({ initialData }) => {
  const [technicians] = useState<TechnicianDTO[]>(initialData.technicians);
  const [sites] = useState<SiteDTO[]>(initialData.sites);
  const [visits, setVisits] = useState<VisitDTO[]>(initialData.visits);

  // Estados de vista, idioma y tema
  const [language, setLanguage] = useState<Language>('es');
  const [currentView, setCurrentView] = useState<'timeline' | 'cards'>('timeline');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const t = translations[language];

  // Sincronizar tema con la clase html
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Estados de filtros
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'SCHEDULED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modales interactivos
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info';
  } | null>(null);

  // Estadísticas globales
  const scheduledCount = useMemo(
    () => visits.filter((v) => v.status === 'SCHEDULED').length,
    [visits]
  );
  const cancelledCount = useMemo(
    () => visits.filter((v) => v.status === 'CANCELLED').length,
    [visits]
  );
  const techniciansCount = technicians.length;

  // Filtrado de visitas en memoria interactivo
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (selectedTechId && v.technicianId !== selectedTechId) return false;
      if (selectedDate && v.date !== selectedDate) return false;
      if (selectedStatus !== 'ALL' && v.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const siteMatch = v.site?.name.toLowerCase().includes(query);
        const municipalityMatch = v.site?.municipality.toLowerCase().includes(query);
        const techMatch = v.technician?.name.toLowerCase().includes(query);
        const notesMatch = v.notes?.toLowerCase().includes(query);
        if (!siteMatch && !municipalityMatch && !techMatch && !notesMatch) return false;
      }
      return true;
    });
  }, [visits, selectedTechId, selectedDate, selectedStatus, searchQuery]);

  const handleResetFilters = () => {
    setSelectedTechId('');
    setSelectedDate(todayStr);
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  // Optimistic UI para Cancelar Visita
  const handleCancelVisit = async (visitId: string) => {
    const previousVisits = [...visits];

    // Actualización optimista inmediata
    setVisits((prev) =>
      prev.map((v) => (v.id === visitId ? { ...v, status: 'CANCELLED' } : v))
    );

    try {
      const result = await cancelVisitAction(visitId);
      if (!result.success) {
        setVisits(previousVisits);
        alert(result.error || 'Error al cancelar la visita.');
      } else {
        setToastMessage({
          text: language === 'ca'
            ? 'Visita cancel·lada amb èxit. L\'horari del tècnic ha quedat alliberat per a noves assignacions.'
            : 'Visita cancelada con éxito. El tramo horario del técnico ha quedado liberado para nuevas asignaciones.',
          type: 'info',
        });
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch {
      setVisits(previousVisits);
      alert('Error de conexión al cancelar la visita.');
    }
  };

  // Programar nueva visita con actualización de estado
  const handleScheduleSuccess = (newVisit: VisitDTO) => {
    setVisits((prev) =>
      [...prev, newVisit].sort((a, b) => {
        const cmpDate = a.date.localeCompare(b.date);
        if (cmpDate !== 0) return cmpDate;
        return a.startTime.localeCompare(b.startTime);
      })
    );
    setIsScheduleModalOpen(false);

    // Toast informativo de confirmación
    setToastMessage({
      text: language === 'ca'
        ? 'Visita agendada amb èxit.'
        : 'Visita agendada con éxito.',
      type: 'success',
    });
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col antialiased transition-colors duration-200">
      {/* Toast Notification Flotante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 transition-all duration-200 transform translate-y-0 opacity-100">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-2xl text-xs sm:text-sm font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)]'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-[#2997FF] shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header Estilo Apple con Selector de Tema */}
      <Header
        scheduledCount={scheduledCount}
        cancelledCount={cancelledCount}
        techniciansCount={techniciansCount}
        currentView={currentView}
        onViewChange={setCurrentView}
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
      />

      {/* Main Content: Full-Width 100% Canvas con Grid Dividido (8 cols / 4 cols) */}
      <main className="w-full flex-1 px-4 sm:px-6 lg:px-8 xl:px-10 py-5">
        <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Columna Principal Izquierda (8 de 12 en desktop): Filtros y Visitas */}
          <div className="xl:col-span-8 space-y-6">
            {/* Barra de Filtros Segmentada */}
            <FilterBar
              technicians={technicians}
              selectedTechId={selectedTechId}
              onSelectTechId={setSelectedTechId}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              selectedStatus={selectedStatus}
              onSelectStatus={setSelectedStatus}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalResultsCount={filteredVisits.length}
              onResetFilters={handleResetFilters}
              language={language}
            />

            {/* Vista Condicional: Cronograma Visual o Lista de Tarjetas */}
            {currentView === 'timeline' ? (
              <TimelineView
                technicians={technicians}
                sites={sites}
                visits={visits}
                selectedDate={selectedDate || todayStr}
                language={language}
                onCancelVisit={handleCancelVisit}
              />
            ) : (
              <VisitsList
                visits={filteredVisits}
                onCancelVisit={handleCancelVisit}
                onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
                language={language}
              />
            )}
          </div>

          {/* Columna Derecha Fija (4 de 12 en desktop): Panel Persistente Copilot IA RAG */}
          <div className="xl:col-span-4 xl:sticky xl:top-20">
            <CopilotPanel language={language} />
          </div>

        </div>
      </main>

      {/* Modal Sheet "Programar Visita" */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        technicians={technicians}
        sites={sites}
        existingVisits={visits}
        onSubmit={async (input) => {
          const res = await scheduleVisitAction(input);
          if (res.success && res.data) {
            handleScheduleSuccess(res.data);
          }
          return res;
        }}
        defaultDate={selectedDate || todayStr}
        language={language}
      />
    </div>
  );
};
