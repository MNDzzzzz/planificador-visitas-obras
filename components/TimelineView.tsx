'use client';

import React from 'react';
import {
  Clock,
  HardHat,
  MapPin,
  Car,
  CheckCircle2,
  XCircle,
  FileText,
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

  // Horas del día: 08:00 a 17:00 (Europe/Madrid)
  const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const START_MINUTE = 8 * 60; // 480
  const PIXELS_PER_MINUTE = 1.2; // Escala vertical
  const TOTAL_HEIGHT = (17 - 8) * 60 * PIXELS_PER_MINUTE; // 540 * 1.2 = 648px

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
              {language === 'ca'
                ? `Cronograma Operatiu d'Inspeccions (${selectedDate})`
                : `Cronograma Operativo de Inspecciones (${selectedDate})`}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/25">
              08:00 – 17:00 h
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {language === 'ca'
              ? 'Visualització gràfica d\'ocupació per tècnic i blocs de trasllat obligatori (30 min)'
              : 'Visualización gráfica de ocupación por técnico y bloques de traslado obligatorio (30 min)'}
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
            <span>{language === 'ca' ? 'Trasllat 30 min' : 'Traslado 30 min'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[var(--bg-card-hover)] border border-dashed border-[var(--border-subtle)]" />
            <span>{t.visitStatusCancelled}</span>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px] p-4 flex">
          {/* Eje de Horas Vertical (08:00 a 17:00) */}
          <div
            className="w-16 shrink-0 relative pr-2 border-r border-[var(--border-subtle)]"
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
                  <span className="text-[11px] font-mono text-[var(--text-secondary)] tabular-numbers font-medium">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              );
            })}
          </div>

          {/* Columnas de Técnicos (4 columnas) */}
          <div className="flex-1 grid grid-cols-4 gap-3 pl-3">
            {technicians.map((tech) => {
              const techVisits = dateVisits
                .filter((v) => v.technicianId === tech.id)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              const activeVisits = techVisits.filter((v) => v.status === 'SCHEDULED');

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

                  {/* Carril de Tiempo del Técnico */}
                  <div
                    className="relative flex-1 bg-[var(--bg-card-hover)]/40 border border-[var(--border-subtle)] rounded-xl overflow-hidden"
                    style={{ height: `${TOTAL_HEIGHT}px` }}
                  >
                    {/* Líneas Horarias Horizontales */}
                    {HOURS.map((hour) => {
                      const topPos = (hour * 60 - START_MINUTE) * PIXELS_PER_MINUTE;
                      return (
                        <div
                          key={hour}
                          className="absolute w-full border-t border-[var(--border-subtle)] opacity-40"
                          style={{ top: `${topPos}px` }}
                        />
                      );
                    })}

                    {/* Bloques de Traslado Rayados (Regla B) */}
                    {travelBlocks.map((tb, idx) => (
                      <div
                        key={`travel-${idx}`}
                        className="absolute left-1 right-1 rounded-lg border border-dashed border-amber-500/50 p-1 flex items-center justify-center text-center overflow-hidden z-0"
                        style={{
                          top: `${tb.top}px`,
                          height: `${tb.height}px`,
                          background:
                            'repeating-linear-gradient(45deg, rgba(245,158,11,0.12), rgba(245,158,11,0.12) 5px, transparent 5px, transparent 10px)',
                        }}
                        title={`Traslado obligatorio de 30 min entre ${tb.prevSite} y ${tb.nextSite}`}
                      >
                        <span className="text-[10px] text-amber-600 dark:text-amber-300 font-mono font-medium flex items-center gap-1 bg-[var(--bg-card)]/90 px-1.5 py-0.5 rounded shadow-sm">
                          <Car className="w-2.5 h-2.5 text-amber-500" />
                          <span>30m trasllat</span>
                        </span>
                      </div>
                    ))}

                    {/* Bloques de Visita */}
                    {techVisits.map((visit) => {
                      const startMins = timeToMinutes(visit.startTime);
                      const duration = visit.durationMinutes;
                      const topPos = (startMins - START_MINUTE) * PIXELS_PER_MINUTE;
                      const heightPx = duration * PIXELS_PER_MINUTE;
                      const isCancelled = visit.status === 'CANCELLED';

                      return (
                        <div
                          key={visit.id}
                          className={`absolute left-1.5 right-1.5 rounded-xl border p-2 flex flex-col justify-between transition-all duration-150 z-10 ${
                            isCancelled
                              ? 'bg-[var(--bg-card)]/60 border-dashed border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-60'
                              : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#2997FF]/50 shadow-md'
                          }`}
                          style={{
                            top: `${topPos}px`,
                            height: `${heightPx}px`,
                            borderLeftWidth: isCancelled ? '1px' : '3px',
                            borderLeftColor: isCancelled ? 'var(--border-subtle)' : tech.color,
                          }}
                        >
                          <div className="overflow-hidden">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-[11px] font-mono font-bold tabular-numbers text-[var(--text-primary)]">
                                {visit.startTime}–{visit.endTime}
                              </span>

                              {isCancelled ? (
                                <span className="px-1 py-0.2 rounded text-[9px] bg-slate-500/10 text-[var(--text-tertiary)]">
                                  {t.visitStatusCancelled}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                  {duration}m
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight">
                              {visit.site?.name || 'Obra'}
                            </p>

                            <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-2.5 h-2.5 shrink-0 text-[#2997FF]" />
                              <span>{visit.site?.municipality || 'Sede'}</span>
                            </p>
                          </div>

                          {!isCancelled && (
                            <div className="mt-1 flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                              <span className="text-[10px] text-[var(--text-secondary)] truncate max-w-[120px]">
                                {visit.notes || 'Control calidad'}
                              </span>

                              <button
                                onClick={() => onCancelVisit(visit.id)}
                                title={t.cancelActionBtn}
                                className="text-[10px] text-[var(--text-secondary)] hover:text-rose-500 transition-colors p-0.5 rounded cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
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
