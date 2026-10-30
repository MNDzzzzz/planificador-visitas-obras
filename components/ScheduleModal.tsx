'use client';

import React, { useState, useTransition, useEffect, useMemo } from 'react';
import {
  ActionResult,
  CreateVisitInput,
  SiteDTO,
  TechnicianDTO,
  ValidationFailure,
  VisitDTO,
} from '../lib/types';
import {
  calculateEndTime,
  validateVisitScheduling,
  timeToMinutes,
  WORK_DAY_START_MINUTES,
  WORK_DAY_END_MINUTES,
} from '../lib/validation/rules';
import { getOfflineTravelEstimate } from '../lib/geo/routing';
import {
  X,
  Calendar,
  Clock,
  HardHat,
  Building2,
  CheckCircle,
  CheckCircle2,
  FileText,
  ShieldAlert,
  ArrowRight,
  Car,
  Navigation,
  AlertTriangle,
} from 'lucide-react';
import { Language, translations } from '../lib/i18n/translations';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicians: TechnicianDTO[];
  sites: SiteDTO[];
  existingVisits: VisitDTO[];
  onSubmit: (input: CreateVisitInput) => Promise<ActionResult<VisitDTO>>;
  defaultTechnicianId?: string;
  defaultDate?: string;
  language: Language;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  technicians,
  sites,
  existingVisits,
  onSubmit,
  defaultTechnicianId,
  defaultDate,
  language,
}) => {
  const t = translations[language];
  const todayStr = new Date().toISOString().split('T')[0];

  const [technicianId, setTechnicianId] = useState(defaultTechnicianId || (technicians[0]?.id ?? ''));
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '');
  const [date, setDate] = useState(defaultDate || todayStr);
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [notes, setNotes] = useState('');

  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<{
    message: string;
    rule?: 'RULE_A' | 'RULE_B' | 'RULE_C';
    details?: {
      conflictingVisitId?: string;
      conflictingSiteName?: string;
      conflictingInterval?: string;
      requiredGapMinutes?: number;
      actualGapMinutes?: number;
      direction?: 'PREVIOUS' | 'NEXT';
    };
  } | null>(null);

  // Sincronizar defaults al abrir y gestionar accesibilidad (Escape y scroll lock)
  useEffect(() => {
    if (isOpen) {
      if (defaultTechnicianId) setTechnicianId(defaultTechnicianId);
      if (defaultDate) setDate(defaultDate);
      setServerError(null);

      // Bloquear scroll de fondo
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Capturar tecla Escape
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, defaultTechnicianId, defaultDate, onClose]);

  // Mapa de obras para lookup rápido
  const sitesMap = useMemo(() => {
    const map = new Map<string, SiteDTO>();
    sites.forEach((s) => map.set(s.id, s));
    return map;
  }, [sites]);

  const selectedTech = technicians.find((tech) => tech.id === technicianId);
  const selectedSite = sitesMap.get(siteId) || sites.find((site) => site.id === siteId);

  // Cálculo en vivo de hora de fin
  let computedEndTime = '--:--';
  let startMinutes = 0;
  let endMinutes = 0;
  try {
    if (startTime && durationMinutes > 0) {
      computedEndTime = calculateEndTime(startTime, durationMinutes);
      startMinutes = timeToMinutes(startTime);
      endMinutes = startMinutes + durationMinutes;
    }
  } catch {
    computedEndTime = '--:--';
  }

  // Pre-validación cliente en vivo con coordenadas y matriz dinámica
  let clientValidation: ValidationFailure | null = null;
  if (technicianId && siteId && date && startTime && durationMinutes > 0) {
    const result = validateVisitScheduling({
      newVisit: {
        technicianId,
        siteId,
        date,
        startTime,
        durationMinutes,
      },
      existingVisits,
      sitesMap,
    });
    if (!result.isValid) {
      clientValidation = result;
    }
  }

  // Localizar visitas del técnico en esta fecha para cálculo dinámico de ruta y margen
  const techDateVisits = useMemo(() => {
    return existingVisits
      .filter((v) => v.technicianId === technicianId && v.date === date && v.status === 'SCHEDULED')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [existingVisits, technicianId, date]);

  let immediatePrev: VisitDTO | null = null;
  let immediatePrevEnd = -1;
  let immediateNext: VisitDTO | null = null;
  let immediateNextStart = Infinity;

  if (startMinutes > 0 && endMinutes > 0) {
    for (const v of techDateVisits) {
      const vStart = timeToMinutes(v.startTime);
      const vEnd = timeToMinutes(v.endTime);

      if (vEnd <= startMinutes) {
        if (vEnd > immediatePrevEnd) {
          immediatePrevEnd = vEnd;
          immediatePrev = v;
        }
      }
      if (vStart >= endMinutes) {
        if (vStart < immediateNextStart) {
          immediateNextStart = vStart;
          immediateNext = v;
        }
      }
    }
  }

  // Estimaciones dinámicas de traslado con visita anterior y posterior
  const prevSite = immediatePrev ? (immediatePrev.site || sitesMap.get(immediatePrev.siteId)) : null;
  const prevEstimate = immediatePrev && selectedSite && prevSite
    ? getOfflineTravelEstimate(prevSite, selectedSite)
    : null;

  const nextSite = immediateNext ? (immediateNext.site || sitesMap.get(immediateNext.siteId)) : null;
  const nextEstimate = immediateNext && selectedSite && nextSite
    ? getOfflineTravelEstimate(selectedSite, nextSite)
    : null;

  const activeError = serverError || (clientValidation ? {
    message: clientValidation.message,
    rule: clientValidation.rule,
    details: clientValidation.details,
  } : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    startTransition(async () => {
      try {
        const res = await onSubmit({
          technicianId,
          siteId,
          date,
          startTime,
          durationMinutes,
          notes: notes.trim() || undefined,
        });

        if (!res.success) {
          setServerError({
            message: res.error || 'No se pudo programar la visita.',
            rule: res.rule,
            details: res.details as ValidationFailure['details'],
          });
        }
      } catch {
        setServerError({
          message: 'Error de comunicación con el servidor.',
        });
      }
    });
  };

  // Badges corporativos limpios sin mención de "Regla A/B/C"
  const getCorporateRuleBadge = (rule?: 'RULE_A' | 'RULE_B' | 'RULE_C') => {
    switch (rule) {
      case 'RULE_A':
        return {
          title: t.validationOverlapBadge,
          color: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
        };
      case 'RULE_B':
        return {
          title: t.validationTravelBadge,
          color: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
        };
      case 'RULE_C':
        return {
          title: t.validationWorkdayBadge,
          color: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
        };
      default:
        return {
          title: t.validationGeneralBadge,
          color: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto apple-modal-overlay">
      <div className="relative w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Cabecera del Modal */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--border-subtle)] bg-[var(--bg-card-hover)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2997FF]/15 border border-[#2997FF]/30 flex items-center justify-center text-[#2997FF]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                {t.modalTitle}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {t.modalSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="apple-press min-hit-area w-9 h-9 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            title={t.cancelBtn}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* BANNER DE VALIDACIÓN CORPORATIVO */}
          {activeError && (
            <div className="rounded-2xl p-4 bg-rose-500/10 border border-rose-500/30 shadow-inner space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wider uppercase ${getCorporateRuleBadge(activeError.rule).color}`}>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {getCorporateRuleBadge(activeError.rule).title}
                </span>
                <span className="text-[11px] text-rose-500 font-semibold">{t.validationSecurityLock}</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                {activeError.message}
              </p>
              {activeError.details && (
                <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-card-hover)] rounded-xl p-2.5 border border-[var(--border-subtle)] space-y-1">
                  {activeError.details.conflictingSiteName && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-secondary)]">{t.conflictingSiteLabel}</span>
                      <strong className="text-[var(--text-primary)]">{activeError.details.conflictingSiteName}</strong>
                    </div>
                  )}
                  {activeError.details.conflictingInterval && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-secondary)]">{t.conflictingIntervalLabel}</span>
                      <strong className="text-[var(--text-primary)] tabular-numbers">{activeError.details.conflictingInterval}</strong>
                    </div>
                  )}
                  {activeError.details.actualGapMinutes !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-secondary)]">{t.conflictingGapLabel}</span>
                      <span className="text-rose-500 font-semibold tabular-numbers">{activeError.details.actualGapMinutes} min</span>
                      <span className="text-[var(--text-tertiary)]">/ {t.conflictingRequiredGapLabel} {activeError.details.requiredGapMinutes} min</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selector de Técnico */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
              <span>{t.fieldTechnician}</span>
              {selectedTech && (
                <span className="text-[11px] text-[#2997FF]">{selectedTech.specialty}</span>
              )}
            </label>
            <div className="relative">
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                required
                className="w-full min-hit-area px-3.5 py-2.5 bg-[var(--bg-card-hover)] hover:border-[#2997FF]/50 focus:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] outline-none focus:border-[#2997FF] transition-colors cursor-pointer appearance-none"
              >
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    {tech.name} — {tech.specialty}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selector de Obra / Ubicación */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
              <span>{t.fieldSite}</span>
              {selectedSite && (
                <span className="text-[11px] text-[#30D158] font-medium">{selectedSite.municipality}</span>
              )}
            </label>
            <div className="relative">
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                required
                className="w-full min-hit-area px-3.5 py-2.5 bg-[var(--bg-card-hover)] hover:border-[#2997FF]/50 focus:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] outline-none focus:border-[#2997FF] transition-colors cursor-pointer appearance-none"
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    {site.name} ({site.municipality}) — {site.address}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha y Hora de Inicio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">{t.fieldDate}</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full min-hit-area px-3.5 py-2.5 bg-[var(--bg-card-hover)] hover:border-[#2997FF]/50 focus:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] outline-none focus:border-[#2997FF] transition-colors cursor-pointer tabular-numbers"
                />
              </div>
            </div>

            {/* Hora de Inicio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                <span>{t.fieldStartTime}</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  step="300"
                  className="w-full min-hit-area px-3.5 py-2.5 bg-[var(--bg-card-hover)] hover:border-[#2997FF]/50 focus:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] outline-none focus:border-[#2997FF] transition-colors cursor-pointer tabular-numbers"
                />
              </div>
            </div>
          </div>

          {/* Duración con Presets Rápidos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)] font-semibold">{t.fieldDuration}</span>
              <span className="text-[var(--text-primary)] font-bold tabular-numbers">{durationMinutes} {t.fieldDurationHint}</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`apple-press min-hit-area py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer tabular-numbers ${
                    durationMinutes === mins
                      ? 'bg-[#2997FF]/20 border-[#2997FF] text-[#2997FF]'
                      : 'bg-[var(--bg-card-hover)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>

            {/* Preview de Fin de Visita */}
            <div className="flex items-center justify-between text-xs bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2">
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <Clock className="w-3.5 h-3.5 text-[#2997FF]" />
                <span>{t.estimatedEnd}</span>
              </div>
              <div className="flex items-center gap-1 font-bold text-[var(--text-primary)] tabular-numbers">
                <span>{startTime}</span>
                <ArrowRight className="w-3 h-3 text-[var(--text-secondary)]" />
                <span>{computedEndTime}</span>
              </div>
            </div>
          </div>

          {/* TARJETA DE RUTA Y TRASLADO DINÁMICO (Apple Design System) */}
          {immediatePrev && prevEstimate && (
            <div className="rounded-2xl p-3.5 sm:p-4 bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] space-y-2.5 transition-all shadow-sm">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <Car className="w-4 h-4 text-[#2997FF]" />
                  <span>{t.travelEstimated}</span>
                </span>
                
                {prevEstimate.routeSummary && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#2997FF]/10 text-[#2997FF] border border-[#2997FF]/25">
                    <Navigation className="w-3 h-3" />
                    <span>{prevEstimate.routeSummary}</span>
                  </span>
                )}
              </div>

              {/* Origen -> Destino */}
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] flex-wrap">
                <span className="font-semibold text-[var(--text-primary)]">
                  {prevSite?.name} ({prevSite?.municipality})
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#2997FF] shrink-0" />
                <span className="font-semibold text-[var(--text-primary)]">
                  {selectedSite?.name} ({selectedSite?.municipality})
                </span>
              </div>

              {/* Desglose de Tiempo y Comparación de Margen */}
              {prevEstimate.provider === 'same-site' || immediatePrev.siteId === siteId ? (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{t.sameSiteNoTravel}</span>
                </div>
              ) : (
                (() => {
                  const availableGap = startMinutes - immediatePrevEnd;
                  const isMarginOk = availableGap >= prevEstimate.totalRequiredMinutes;

                  return (
                    <div className="space-y-2">
                      {/* Desglose visual: Conducción + Buffer */}
                      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] rounded-xl px-3 py-2 border border-[var(--border-subtle)]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#2997FF]" />
                          <span>
                            {prevEstimate.drivingMinutes} min {t.drivingTime} + {prevEstimate.bufferMinutes} min {t.bufferTime}
                          </span>
                        </div>
                        <span className="font-bold tabular-numbers text-[var(--text-primary)]">
                          = {prevEstimate.totalRequiredMinutes} min {t.travelMarginRequired}
                        </span>
                      </div>

                      {/* Estado del Margen Disponible */}
                      <div
                        className={`flex items-center justify-between text-xs rounded-xl px-3 py-2 border font-semibold ${
                          isMarginOk
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-500'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isMarginOk ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                          )}
                          <span>
                            {isMarginOk ? t.travelMarginOk : t.travelMarginInsufficient}
                          </span>
                        </div>
                        <span className="tabular-numbers">
                          {t.travelMarginAvailable}: {availableGap} min / req: {prevEstimate.totalRequiredMinutes} min
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* Notas de Obra */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              {t.fieldNotes}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.fieldNotesPlaceholder}
              rows={2}
              className="w-full px-3.5 py-2.5 bg-[var(--bg-card-hover)] focus:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[#2997FF] transition-colors resize-none"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="apple-press min-hit-area px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] border border-transparent hover:border-[var(--border-subtle)] cursor-pointer disabled:opacity-50"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={isPending || clientValidation !== null}
              className="apple-press min-hit-area inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2997FF] hover:bg-[#0077ED] disabled:bg-[#2997FF]/40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold shadow-[0_2px_14px_rgba(41,151,255,0.35)] cursor-pointer"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t.validatingBtn}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>{t.confirmScheduleBtn}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
