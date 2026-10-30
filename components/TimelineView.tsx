'use client';

import React from 'react';
import {
  Clock,
  MapPin,
  Car,
  XCircle,
  FileText,
  Building2,
  Calendar,
} from 'lucide-react';
import { SiteDTO, TechnicianDTO, VisitDTO } from '../lib/types';
import { timeToMinutes } from '../lib/validation/rules';
import { Language, translations } from '../lib/i18n/translations';

interface TimelineViewProps {
  technicians: TechnicianDTO[];
  sites: SiteDTO[];
  visits: VisitDTO[];
  selectedDate: string;
  language: Language;
  onCancelVisit: (visitId: string) => Promise<void>;
  onOpenScheduleForTech?: (technicianId: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  technicians,
  visits,
  selectedDate,
  language,
  onCancelVisit,
}) => {
  const t = translations[language];

  // Horas de la jornada: 08:00 a 17:00 (Europe/Madrid)
  const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const START_MINUTE = 8 * 60; // 480
  const PIXELS_PER_MINUTE = 1.25; // Escala vertical nítida
  const TOTAL_HEIGHT = (17 - 8) * 60 * PIXELS_PER_MINUTE; // 9 horas * 60 * 1.25 = 675px

  // Filtrar visitas de la fecha seleccionada
  const dateVisits = visits.filter((v) => v.date === selectedDate);

  return (
    <div className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Timeline Header Info */}
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-card-hover)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#2997FF]" />
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-tight">
              {t.timelineTitle} ({selectedDate})
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/25">
              08:00 – 17:00 h
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {t.timelineSubtitle} • <span className="text-[#2997FF]">{t.viewDetailsHint}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#2997FF]/25 border border-[#2997FF]/50" />
            <span>{t.visitStatusScheduled}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded border border-dashed border-amber-500/60"
              style={{
                background:
                  'repeating-linear-gradient(45deg, rgba(245,158,11,0.2), rgba(245,158,11,0.2) 4px, transparent 4px, transparent 8px)',
              }}
            />
            <span>{t.travelBlockLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[var(--bg-card-hover)] border border-dashed border-[var(--border-subtle)]" />
            <span>{t.visitStatusCancelled}</span>
          </div>
        </div>
      </div>

      {/* Grid Container con eje horario sticky */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[840px] p-4 flex">
          {/* Eje de Horas Vertical Sticky (08:00 a 17:00) */}
          <div
            className="w-16 shrink-0 sticky left-0 z-20 pr-2 border-r border-[var(--border-subtle)] bg-[var(--bg-card)]/95 backdrop-blur-md shadow-sm"
            style={{ height: `${TOTAL_HEIGHT}px` }}
          >
            {HOURS.map((hour) => {
              const topPos = (hour * 60 - START_MINUTE) * PIXELS_PER_MINUTE;
              return (
                <div
                  key={hour}
                  className="absolute w-full flex items-center justify-end pr-2 text-right -translate-y-2"
                  style={{ top: `${topPos}px` }}
                >
                  <span className="text-[11px] font-mono text-[var(--text-secondary)] tabular-numbers font-semibold">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              );
            })}
          </div>

          {/* Columnas de Técnicos (4 columnas) */}
          <div className="flex-1 grid grid-cols-4 gap-3.5 pl-3">
            {technicians.map((tech) => {
              const techVisits = dateVisits
                .filter((v) => v.technicianId === tech.id)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              const activeVisits = techVisits.filter((v) => v.status === 'SCHEDULED');

              // Cálculo de bloques de traslado obligatorio entre obras diferentes (>= 30 min)
              const travelBlocks: {
                top: number;
                height: number;
                prevSite: string;
                nextSite: string;
                minutes: number;
              }[] = [];

              for (let i = 0; i < activeVisits.length - 1; i++) {
                const current = activeVisits[i];
                const next = activeVisits[i + 1];

                if (current.siteId !== next.siteId) {
                  const endCurrent = timeToMinutes(current.endTime);
                  const startNext = timeToMinutes(next.startTime);
                  const gapMinutes = startNext - endCurrent;

                  if (gapMinutes >= 30) {
                    travelBlocks.push({
                      top: (endCurrent - START_MINUTE) * PIXELS_PER_MINUTE,
                      height: 30 * PIXELS_PER_MINUTE,
                      prevSite: current.site?.name || 'Obra',
                      nextSite: next.site?.name || 'Obra',
                      minutes: gapMinutes,
                    });
                  }
                }
              }

              return (
                <div key={tech.id} className="flex flex-col">
                  {/* Cabecera del Técnico */}
                  <div className="p-2.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] mb-2 flex items-center gap-2.5 shadow-sm">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-inner shrink-0"
                      style={{ backgroundColor: tech.color }}
                    >
                      {tech.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{tech.name}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate">{tech.specialty}</p>
                    </div>
                  </div>

                  {/* Carril de Tiempo del Técnico (overflow-visible para permitir elevación de hover) */}
                  <div
                    className="relative flex-1 bg-[var(--bg-card-hover)]/30 border border-[var(--border-subtle)] rounded-xl"
                    style={{ height: `${TOTAL_HEIGHT}px` }}
                  >
                    {/* Líneas Horarias Horizontales */}
                    {HOURS.map((hour) => {
                      const topPos = (hour * 60 - START_MINUTE) * PIXELS_PER_MINUTE;
                      return (
                        <div
                          key={hour}
                          className="absolute w-full border-t border-[var(--border-subtle)] opacity-40 pointer-events-none"
                          style={{ top: `${topPos}px` }}
                        />
                      );
                    })}

                    {/* Bloques de Traslado Rayados (Regla B) */}
                    {travelBlocks.map((tb, idx) => (
                      <div
                        key={`travel-${idx}`}
                        className="absolute left-1 right-1 rounded-lg border border-dashed border-amber-500/50 p-1 flex items-center justify-center text-center overflow-hidden z-0 pointer-events-none"
                        style={{
                          top: `${tb.top}px`,
                          height: `${tb.height}px`,
                          background:
                            'repeating-linear-gradient(45deg, rgba(245,158,11,0.12), rgba(245,158,11,0.12) 5px, transparent 5px, transparent 10px)',
                        }}
                        title={t.travelBlockTooltip}
                      >
                        <span className="text-[10px] text-amber-600 dark:text-amber-300 font-mono font-semibold flex items-center gap-1 bg-[var(--bg-card)]/90 px-1.5 py-0.5 rounded shadow-sm">
                          <Car className="w-2.5 h-2.5 text-amber-500" />
                          <span>{t.travelBlockLabel}</span>
                        </span>
                      </div>
                    ))}

                    {/* Bloques de Visita con Hover Expandible Apple UI */}
                    {techVisits.map((visit) => {
                      const startMins = timeToMinutes(visit.startTime);
                      const duration = visit.durationMinutes;
                      const topPos = (startMins - START_MINUTE) * PIXELS_PER_MINUTE;
                      const baseHeightPx = Math.max(duration * PIXELS_PER_MINUTE, 36);
                      const isCancelled = visit.status === 'CANCELLED';

                      return (
                        <div
                          key={visit.id}
                          className="group absolute left-1.5 right-1.5 z-10 hover:z-30 transition-all duration-200"
                          style={{
                            top: `${topPos}px`,
                          }}
                        >
                          {/* Tarjeta de Visita:
                              - Estado normal: compacta, altura proporcional a los minutos, sin desbordes.
                              - Estado hover: se expande suavemente hacia el frente con z-40, sombra profunda y detalles completos.
                          */}
                          <div
                            className={`w-full rounded-xl border transition-all duration-200 cursor-pointer ${
                              isCancelled
                                ? 'bg-[var(--bg-card)]/80 border-dashed border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-65 group-hover:opacity-100 group-hover:bg-[var(--bg-card)] group-hover:shadow-xl group-hover:z-40'
                                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)] shadow-sm group-hover:shadow-2xl group-hover:border-[#2997FF] group-hover:ring-1 group-hover:ring-[#2997FF]/40 group-hover:z-40'
                            }`}
                            style={{
                              borderLeftWidth: '3.5px',
                              borderLeftColor: isCancelled ? 'var(--border-subtle)' : tech.color,
                            }}
                          >
                            {/* Contenido en Reposo (Siempre visible, compacto y ordenado) */}
                            <div
                              className="px-2.5 py-1.5 flex flex-col justify-between overflow-hidden"
                              style={{
                                height: `${baseHeightPx}px`,
                              }}
                            >
                              {/* Fila 1: Hora y Duración */}
                              <div className="flex items-center justify-between gap-1 shrink-0">
                                <span className="text-[10px] sm:text-[11px] font-mono font-bold tabular-numbers text-[var(--text-primary)]">
                                  {visit.startTime}–{visit.endTime}
                                </span>

                                {isCancelled ? (
                                  <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-slate-500/15 text-[var(--text-tertiary)]">
                                    {t.visitStatusCancelled}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#2997FF]/15 text-[#2997FF] border border-[#2997FF]/25">
                                    {duration}m
                                  </span>
                                )}
                              </div>

                              {/* Fila 2: Título de la Obra (Truncado con elegancia en reposo) */}
                              <div className="flex items-center gap-1.5 min-w-0 my-auto">
                                <Building2 className="w-3 h-3 text-[#2997FF] shrink-0" />
                                <p className="text-[11px] sm:text-xs font-semibold text-[var(--text-primary)] truncate">
                                  {visit.site?.name || 'Obra'}
                                </p>
                              </div>
                            </div>

                            {/* Contenedor Expandido por Hover (Se revela suavemente al poner el cursor) */}
                            <div className="hidden group-hover:flex flex-col gap-2 px-2.5 pb-2.5 pt-1 border-t border-[var(--border-subtle)] bg-[var(--bg-card-hover)]/60 rounded-b-xl animate-in fade-in duration-150">
                              {/* Municipio / Dirección Completa */}
                              <div className="flex items-start gap-1.5 text-[11px] text-[var(--text-secondary)]">
                                <MapPin className="w-3.5 h-3.5 text-[#2997FF] shrink-0 mt-0.5" />
                                <div className="leading-snug">
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    {visit.site?.municipality || 'Madrid'}
                                  </span>
                                  {visit.site?.address && (
                                    <span className="block text-[10px] text-[var(--text-secondary)]">
                                      {visit.site.address}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Notas Técnicas de la Inspección */}
                              {visit.notes && (
                                <div className="flex items-start gap-1.5 text-[10px] text-[var(--text-secondary)] bg-[var(--bg-card)] p-1.5 rounded-lg border border-[var(--border-subtle)]">
                                  <FileText className="w-3 h-3 text-[var(--text-secondary)] shrink-0 mt-0.5" />
                                  <span className="line-clamp-3 leading-snug">{visit.notes}</span>
                                </div>
                              )}

                              {/* Botón de Cancelación de Visita */}
                              {!isCancelled && (
                                <div className="pt-1 flex items-center justify-between">
                                  <span className="text-[9px] text-[var(--text-secondary)]">
                                    Libera horario al cancelar
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCancelVisit(visit.id);
                                    }}
                                    className="apple-press inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 transition-colors cursor-pointer"
                                    title={t.cancelActionBtn}
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span>{t.cancelActionBtn}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
