'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  MapPin,
  Car,
  XCircle,
  FileText,
  Building2,
} from 'lucide-react';
import { SiteDTO, TechnicianDTO, VisitDTO } from '../lib/types';
import { timeToMinutes } from '../lib/validation/rules';
import { getOfflineTravelEstimate } from '../lib/geo/routing';
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
  sites,
  visits,
  selectedDate,
  language,
  onCancelVisit,
}) => {
  const t = translations[language];

  // Estado reactivo para la tarjeta de visita expandida con período de gracia de 250ms
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (visitId: string) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setActiveVisitId(visitId);
  };

  const handleMouseLeave = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setActiveVisitId(null);
    }, 250);
  };

  const handleCardClick = (e: React.MouseEvent, visitId: string) => {
    e.stopPropagation();
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setActiveVisitId((prev) => (prev === visitId ? null : visitId));
  };

  // Limpieza de temporizador al desmontar
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  // Horas de la jornada: 08:00 a 17:00 (Europe/Madrid)
  const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const START_MINUTE = 8 * 60; // 480
  const PIXELS_PER_MINUTE = 1.25; // Escala vertical nítida
  const TOTAL_HEIGHT = (17 - 8) * 60 * PIXELS_PER_MINUTE; // 9 horas * 60 * 1.25 = 675px

  // Filtrar visitas de la fecha seleccionada
  const dateVisits = visits.filter((v) => v.date === selectedDate);

  // Mapa de obras para resolución ultra-rápida
  const sitesMap = React.useMemo(() => {
    const map = new Map<string, SiteDTO>();
    sites.forEach((s) => map.set(s.id, s));
    return map;
  }, [sites]);

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
            {t.timelineSubtitle} • <span className="text-[#2997FF] font-medium">{t.viewDetailsHint}</span>
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
      <div className="overflow-x-auto pb-6">
        <div className="min-w-[840px] p-4 flex">
          {/* Eje de Horas Vertical Sticky (08:00 a 17:00) */}
          <div
            className="w-16 shrink-0 sticky left-0 z-20 pr-2 border-r border-[var(--border-subtle)] bg-[var(--bg-card)]/95 backdrop-blur-md shadow-sm"
            style={{ height: `${TOTAL_HEIGHT + 80}px` }}
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

              // Cálculo dinámico de bloques de traslado con geolocalización y matriz
              const travelBlocks: {
                top: number;
                height: number;
                prevSite: string;
                nextSite: string;
                drivingMinutes: number;
                bufferMinutes: number;
                totalRequiredMinutes: number;
                distanceKm: number;
                routeSummary?: string;
                gapMinutes: number;
              }[] = [];

              for (let i = 0; i < activeVisits.length - 1; i++) {
                const current = activeVisits[i];
                const next = activeVisits[i + 1];

                if (current.siteId !== next.siteId) {
                  const currentSite: SiteDTO = current.site || sitesMap.get(current.siteId) || {
                    id: current.siteId,
                    name: 'Obra',
                    municipality: 'Madrid',
                    address: '',
                  };
                  const nextSite: SiteDTO = next.site || sitesMap.get(next.siteId) || {
                    id: next.siteId,
                    name: 'Obra',
                    municipality: 'Madrid',
                    address: '',
                  };
                  const estimate = getOfflineTravelEstimate(currentSite, nextSite);

                  if (estimate.totalRequiredMinutes > 0) {
                    const endCurrent = timeToMinutes(current.endTime);
                    const startNext = timeToMinutes(next.startTime);
                    const gapMinutes = startNext - endCurrent;

                    if (gapMinutes >= estimate.totalRequiredMinutes) {
                      travelBlocks.push({
                        top: (endCurrent - START_MINUTE) * PIXELS_PER_MINUTE,
                        height: estimate.totalRequiredMinutes * PIXELS_PER_MINUTE,
                        prevSite: currentSite?.name || 'Obra',
                        nextSite: nextSite?.name || 'Obra',
                        drivingMinutes: estimate.drivingMinutes,
                        bufferMinutes: estimate.bufferMinutes,
                        totalRequiredMinutes: estimate.totalRequiredMinutes,
                        distanceKm: estimate.distanceKm,
                        routeSummary: estimate.routeSummary,
                        gapMinutes,
                      });
                    }
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

                  {/* Carril de Tiempo del Técnico (con margen inferior para expansiones en últimas horas) */}
                  <div
                    className="relative flex-1 bg-[var(--bg-card-hover)]/30 border border-[var(--border-subtle)] rounded-xl"
                    style={{ height: `${TOTAL_HEIGHT + 80}px` }}
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

                    {/* Bloques de Traslado Dinámico Rayados (Apple Design) */}
                    {travelBlocks.map((tb, idx) => (
                      <div
                        key={`travel-${idx}`}
                        className="absolute left-1 right-1 rounded-lg border border-dashed border-amber-500/50 p-1 flex items-center justify-center text-center overflow-hidden z-0 pointer-events-none transition-all"
                        style={{
                          top: `${tb.top}px`,
                          height: `${Math.max(tb.height, 26)}px`,
                          background:
                            'repeating-linear-gradient(45deg, rgba(245,158,11,0.12), rgba(245,158,11,0.12) 5px, transparent 5px, transparent 10px)',
                        }}
                        title={`${t.travelEstimated}: ${tb.totalRequiredMinutes} min (${tb.drivingMinutes} min ${t.drivingTime} + ${tb.bufferMinutes} min ${t.bufferTime})${tb.routeSummary ? ` • ${tb.routeSummary}` : ''}`}
                      >
                        <span className="text-[10px] text-amber-600 dark:text-amber-300 font-mono font-semibold flex items-center gap-1 bg-[var(--bg-card)]/90 px-1.5 py-0.5 rounded shadow-sm truncate">
                          <Car className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span className="tabular-numbers">
                            {tb.totalRequiredMinutes}m ({tb.drivingMinutes}m + {tb.bufferMinutes}m)
                          </span>
                        </span>
                      </div>
                    ))}

                    {/* Bloques de Visita con Estado Reactivo y Opacidad 100% */}
                    {techVisits.map((visit) => {
                      const startMins = timeToMinutes(visit.startTime);
                      const duration = visit.durationMinutes;
                      const topPos = (startMins - START_MINUTE) * PIXELS_PER_MINUTE;
                      const baseHeightPx = Math.max(duration * PIXELS_PER_MINUTE, 36);
                      const isCancelled = visit.status === 'CANCELLED';
                      const isExpanded = activeVisitId === visit.id;

                      return (
                        <div
                          key={visit.id}
                          onMouseEnter={() => handleMouseEnter(visit.id)}
                          onMouseLeave={handleMouseLeave}
                          onClick={(e) => handleCardClick(e, visit.id)}
                          className={`absolute left-1.5 right-1.5 transition-all duration-150 ${
                            isExpanded ? 'z-50' : 'z-10'
                          }`}
                          style={{
                            top: `${topPos}px`,
                          }}
                        >
                          {/* Contenedor de la Tarjeta con Fondo 100% Opaco (Cero Mezcla de Texto) */}
                          <div
                            className={`w-full rounded-xl border transition-all duration-200 cursor-pointer ${
                              isExpanded
                                ? 'bg-[var(--bg-card)] border-[#2997FF] shadow-[0_20px_45px_rgba(0,0,0,0.65)] ring-2 ring-[#2997FF]/35 text-[var(--text-primary)]'
                                : isCancelled
                                ? 'bg-[var(--bg-card)]/80 border-dashed border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-65 hover:border-[#2997FF]/50'
                                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)] shadow-sm hover:border-[#2997FF]/50'
                            }`}
                            style={{
                              borderLeftWidth: '4px',
                              borderLeftColor: isCancelled ? 'var(--border-subtle)' : tech.color,
                            }}
                          >
                            {/* Fila en Reposo (Siempre visible, compacta y alineada) */}
                            <div
                              className="px-2.5 py-1.5 flex flex-col justify-between overflow-hidden"
                              style={{
                                height: isExpanded ? 'auto' : `${baseHeightPx}px`,
                                minHeight: '36px',
                              }}
                            >
                              {/* Cabecera: Horario y Duración */}
                              <div className="flex items-center justify-between gap-1 shrink-0">
                                <span className="text-[10px] sm:text-[11px] font-mono font-bold tabular-numbers text-[var(--text-primary)]">
                                  {visit.startTime}–{visit.endTime}
                                </span>

                                {isCancelled ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-500/15 text-[var(--text-tertiary)]">
                                    {t.visitStatusCancelled}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#2997FF]/15 text-[#2997FF] border border-[#2997FF]/25">
                                    {duration}m
                                  </span>
                                )}
                              </div>

                              {/* Título de la Obra */}
                              <div className="flex items-center gap-1.5 min-w-0 my-1">
                                <Building2 className="w-3.5 h-3.5 text-[#2997FF] shrink-0" />
                                <p
                                  className={`text-[11px] sm:text-xs font-semibold text-[var(--text-primary)] ${
                                    isExpanded ? 'whitespace-normal leading-snug' : 'truncate'
                                  }`}
                                >
                                  {visit.site?.name || 'Obra'}
                                </p>
                              </div>
                            </div>

                            {/* Panel Expandido Continuo con 100% de Opacidad y Botón Accesible */}
                            {isExpanded && (
                              <div className="flex flex-col gap-2.5 px-3 pb-3 pt-2 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-b-xl animate-in fade-in duration-150">
                                {/* Municipio y Dirección Completa */}
                                <div className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                                  <MapPin className="w-3.5 h-3.5 text-[#2997FF] shrink-0 mt-0.5" />
                                  <div className="leading-snug">
                                    <span className="font-semibold text-[var(--text-primary)]">
                                      {visit.site?.municipality || 'Madrid'}
                                    </span>
                                    {visit.site?.address && (
                                      <span className="block text-[11px] text-[var(--text-secondary)] mt-0.5">
                                        {visit.site.address}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Notas Técnicas */}
                                {visit.notes && (
                                  <div className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card-hover)] p-2 rounded-xl border border-[var(--border-subtle)]">
                                    <FileText className="w-3.5 h-3.5 text-[#2997FF] shrink-0 mt-0.5" />
                                    <span className="leading-snug text-[var(--text-primary)]">{visit.notes}</span>
                                  </div>
                                )}

                                {/* Barra de Acciones y Cancelar Visita */}
                                {!isCancelled && (
                                  <div className="pt-2 flex items-center justify-between border-t border-[var(--border-subtle)] gap-2">
                                    <span className="text-[10px] text-[var(--text-secondary)]">
                                      {t.cancelledBadge}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onCancelVisit(visit.id);
                                      }}
                                      className="apple-press min-hit-area inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 transition-all cursor-pointer shadow-sm pointer-events-auto"
                                      title={t.cancelActionBtn}
                                    >
                                      <XCircle className="w-4 h-4" />
                                      <span>{t.cancelActionBtn}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
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
