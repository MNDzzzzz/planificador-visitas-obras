'use client';

import React, { useState, useMemo } from 'react';
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
import { CopilotDrawer } from './CopilotDrawer';
import { N8NModal } from './N8NModal';
import { ShieldCheck, Clock, MapPin, CheckCircle, Info, Zap } from 'lucide-react';
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

  // Estados de vista e idioma
  const [language, setLanguage] = useState<Language>('ca'); // Por defecto Català para empresa de Terrassa
  const [currentView, setCurrentView] = useState<'timeline' | 'cards'>('timeline'); // Cronograma por defecto
  const t = translations[language];

  // Estados de filtros
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'SCHEDULED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modales interactivos
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isN8nOpen, setIsN8nOpen] = useState(false);
  const [latestVisitForN8n, setLatestVisitForN8n] = useState<VisitDTO | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'n8n';
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
        // Rollback en caso de fallo
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
    setLatestVisitForN8n(newVisit);

    // Toast informativo con simulación de n8n
    setToastMessage({
      text: language === 'ca'
        ? 'Visita agendada amb èxit. Disparat webhook n8n ➔ Notificat tècnic i reservat laboratori Terrassa.'
        : 'Visita agendada con éxito. Disparado webhook n8n ➔ Notificado técnico y reservado laboratorio Terrassa.',
      type: 'n8n',
    });
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="min-h-screen bg-[#090A0C] text-[#F5F5F7] flex flex-col antialiased selection:bg-[#2997FF]/30 selection:text-white">
      {/* Toast Notification Flotante (Emil Kowalski Toast Pattern) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 transition-all duration-200 transform translate-y-0 opacity-100">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-2xl text-xs sm:text-sm font-medium ${
              toastMessage.type === 'n8n'
                ? 'bg-gradient-to-r from-[#EA580C]/25 to-black/80 border-[#EA580C]/40 text-orange-200'
                : toastMessage.type === 'success'
                ? 'bg-[#30D158]/15 border-[#30D158]/30 text-[#30D158]'
                : 'bg-white/10 border-white/15 text-[#F5F5F7]'
            }`}
          >
            {toastMessage.type === 'n8n' ? (
              <Zap className="w-4 h-4 text-orange-400 shrink-0" />
            ) : toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-[#30D158] shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-[#2997FF] shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header Estilo Apple */}
      <Header
        scheduledCount={scheduledCount}
        cancelledCount={cancelledCount}
        techniciansCount={techniciansCount}
        currentView={currentView}
        onViewChange={setCurrentView}
        language={language}
        onLanguageChange={setLanguage}
        onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenN8n={() => setIsN8nOpen(true)}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Informativo de Reglas y Calidad */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2997FF]/15 border border-[#2997FF]/25 flex items-center justify-center text-[#2997FF] shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-[#F5F5F7]">{t.ruleATitle}</p>
              <p className="text-[#86868B] mt-0.5 leading-relaxed">{t.ruleADesc}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/25 flex items-center justify-center text-[#F59E0B] shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-[#F5F5F7]">{t.ruleBTitle}</p>
              <p className="text-[#86868B] mt-0.5 leading-relaxed">{t.ruleBDesc}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#30D158]/15 border border-[#30D158]/25 flex items-center justify-center text-[#30D158] shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-[#F5F5F7]">{t.ruleCTitle}</p>
              <p className="text-[#86868B] mt-0.5 leading-relaxed">{t.ruleCDesc}</p>
            </div>
          </div>
        </div>

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
        />

        {/* Vista Condicional: Cronograma Visual (Linear Style) o Lista de Tarjetas */}
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
          />
        )}
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
      />

      {/* Drawer LabQA Copilot (RAG + Llamada con IA) */}
      <CopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        language={language}
      />

      {/* Modal Simulador n8n */}
      <N8NModal
        isOpen={isN8nOpen}
        onClose={() => setIsN8nOpen(false)}
        language={language}
        latestVisit={latestVisitForN8n || visits[0]}
      />
    </div>
  );
};
