'use client';

import React from 'react';
import { VisitDTO } from '../lib/types';
import {
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  XCircle,
  CheckCircle2,
  HardHat,
  ArrowRight,
  FileText,
  Building2,
  CalendarPlus,
} from 'lucide-react';

interface VisitsListProps {
  visits: VisitDTO[];
  onCancelVisit: (visitId: string) => Promise<void>;
  onOpenScheduleModal: () => void;
  cancellingId?: string | null;
}

export const VisitsList: React.FC<VisitsListProps> = ({
  visits,
  onCancelVisit,
  onOpenScheduleModal,
  cancellingId,
}) => {
  if (visits.length === 0) {
    return (
      <div className="w-full bg-[var(--bg-card)] rounded-3xl p-8 sm:p-12 text-center border border-[var(--border-subtle)] my-6 flex flex-col items-center justify-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] mb-4">
          <CalendarPlus className="w-8 h-8 text-[#2997FF]" />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)] mb-2">
          No hay visitas para mostrar
        </h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6 leading-relaxed">
          No se encontraron visitas que coincidan con los filtros seleccionados o aún no hay actividades agendadas en esta fecha.
        </p>
        <button
          onClick={onOpenScheduleModal}
          className="apple-press min-hit-area inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2997FF] hover:bg-[#0077ED] text-white text-sm font-medium shadow-[0_2px_14px_rgba(41,151,255,0.35)] cursor-pointer"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Programar Nueva Visita</span>
        </button>
      </div>
    );
  }

  // Ordenar cronológicamente
  const sortedVisits = [...visits].sort((a, b) => {
    const cmpDate = a.date.localeCompare(b.date);
    if (cmpDate !== 0) return cmpDate;
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="space-y-4">
      {sortedVisits.map((visit, index) => {
        const isCancelled = visit.status === 'CANCELLED';
        const isCancelling = cancellingId === visit.id;

        // Calcular si hay una visita anterior del mismo técnico en la misma fecha
        const prevVisit = sortedVisits
          .slice(0, index)
          .reverse()
          .find((v) => v.technicianId === visit.technicianId && v.date === visit.date && v.status === 'SCHEDULED');

        let travelBadge = null;
        if (prevVisit && !isCancelled) {
          const [prevEndH, prevEndM] = prevVisit.endTime.split(':').map(Number);
          const [currStartH, currStartM] = visit.startTime.split(':').map(Number);
          const gapMinutes = currStartH * 60 + currStartM - (prevEndH * 60 + prevEndM);
          const isSameSite = prevVisit.siteId === visit.siteId;

          travelBadge = (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 mb-2">
              <ArrowRight className="w-3.5 h-3.5 text-[#2997FF]" />
              {isSameSite ? (
                <span>Misma obra consecutiva (0 min traslado requerido)</span>
              ) : (
                <span>
                  Margen con obra anterior: <strong className="tabular-numbers text-[var(--text-primary)] font-semibold">{gapMinutes} min</strong> (traslado mín. 30 min cumplido)
                </span>
              )}
            </div>
          );
        }

        return (
          <div key={visit.id} className="flex flex-col">
            {travelBadge}
            <div
              className={`rounded-2xl p-4 sm:p-5 border transition-all shadow-sm ${
                isCancelled
                  ? 'border-[var(--border-subtle)] opacity-60 bg-[var(--bg-card)]/50'
                  : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[#2997FF]/40 hover:shadow-md'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Columna Izquierda: Horario y Técnico */}
                <div className="flex items-start gap-4 flex-1">
                  {/* Badge de Horario con Tabular Nums */}
                  <div
                    className={`flex flex-col items-center justify-center min-w-[95px] px-3 py-2.5 rounded-xl border ${
                      isCancelled
                        ? 'bg-[var(--bg-card-hover)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                        : 'bg-[#2997FF]/10 border-[#2997FF]/25 text-[#2997FF]'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-sm tabular-numbers">
                      <span>{visit.startTime}</span>
                      <span>–</span>
                      <span>{visit.endTime}</span>
                    </div>
                    <span className="text-[11px] font-medium text-[var(--text-secondary)] tabular-numbers mt-0.5">
                      {visit.durationMinutes} min
                    </span>
                  </div>

                  {/* Datos del Técnico y Obra */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: visit.technician?.color || '#3B82F6' }}
                        />
                        <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                          {visit.technician?.name || 'Técnico asignado'}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">•</span>
                      <span className="text-xs text-[var(--text-secondary)] truncate">
                        {visit.technician?.specialty}
                      </span>
                    </div>

                    {/* Nombre de la Obra y Municipio */}
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] flex-wrap">
                      <Building2 className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                      <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {visit.site?.name || 'Obra no especificada'}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">•</span>
                      <div className="flex items-center gap-1 text-[var(--text-secondary)] truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-[#2997FF]" />
                        <span className="truncate">{visit.site?.municipality || 'Sede'}</span>
                      </div>
                    </div>

                    {/* Notas adicionales */}
                    {visit.notes && (
                      <div className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)] pt-1">
                        <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--text-secondary)]" />
                        <span className="italic line-clamp-1">{visit.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Estado, Fecha y Acciones */}
                <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[var(--border-subtle)]">
                  {/* Fecha de la visita */}
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span className="tabular-numbers font-medium text-[var(--text-primary)]">
                      {visit.date}
                    </span>
                  </div>

                  {/* Estado */}
                  {isCancelled ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-[var(--text-secondary)] border border-[var(--border-subtle)] select-none">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancelada</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/25 select-none">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Programada</span>
                    </span>
                  )}

                  {/* Botón de Cancelar Visita (libera horario) */}
                  {!isCancelled && (
                    <button
                      onClick={() => onCancelVisit(visit.id)}
                      disabled={isCancelling}
                      className="apple-press min-hit-area inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 border border-rose-500/25 cursor-pointer disabled:opacity-50 transition-colors"
                      title="Cancelar visita y liberar de inmediato el tramo horario del técnico"
                    >
                      {isCancelling ? 'Cancelando...' : 'Cancelar'}
                    </button>
                  )}
                </div>

              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
