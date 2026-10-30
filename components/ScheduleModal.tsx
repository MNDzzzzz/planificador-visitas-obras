'use client';

import React, { useState, useTransition, useEffect } from 'react';
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
  WORK_DAY_START_MINUTES,
  WORK_DAY_END_MINUTES,
} from '../lib/validation/rules';
import {
  X,
  Calendar,
  Clock,
  HardHat,
  Building2,
  AlertTriangle,
  Info,
  CheckCircle,
  FileText,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicians: TechnicianDTO[];
  sites: SiteDTO[];
  existingVisits: VisitDTO[];
  onSubmit: (input: CreateVisitInput) => Promise<ActionResult<VisitDTO>>;
  defaultTechnicianId?: string;
  defaultDate?: string;
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
}) => {
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

  // Sincronizar defaults al abrir
  useEffect(() => {
    if (isOpen) {
      if (defaultTechnicianId) setTechnicianId(defaultTechnicianId);
      if (defaultDate) setDate(defaultDate);
      setServerError(null);
    }
  }, [isOpen, defaultTechnicianId, defaultDate]);

  if (!isOpen) return null;

  // Cálculo en vivo de hora de fin
  let computedEndTime = '--:--';
  try {
    if (startTime && durationMinutes > 0) {
      computedEndTime = calculateEndTime(startTime, durationMinutes);
    }
  } catch {
    computedEndTime = '--:--';
  }

  // Pre-validación cliente en vivo para feedback inmediato
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
    });
    if (!result.isValid) {
      clientValidation = result;
    }
  }

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
      } catch (err) {
        setServerError({
          message: 'Error de comunicación con el servidor.',
        });
      }
    });
  };

  const getRuleBadge = (rule?: 'RULE_A' | 'RULE_B' | 'RULE_C') => {
    switch (rule) {
      case 'RULE_A':
        return {
          title: 'REGLA A • SIN SOLAPAMIENTOS',
          color: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
        };
      case 'RULE_B':
        return {
          title: 'REGLA B • TRASLADO MÍNIMO 30 MIN',
          color: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
        };
      case 'RULE_C':
        return {
          title: 'REGLA C • JORNADA LABORAL 08:00–17:00',
          color: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
        };
      default:
        return {
          title: 'VALIDACIÓN TÉCNICA INCUMPLIDA',
          color: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
        };
    }
  };

  const selectedTech = technicians.find((t) => t.id === technicianId);
  const selectedSite = sites.find((s) => s.id === siteId);

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
                Programar Inspección Técnica
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Comprobación en vivo de solapamientos y tiempo de traslado
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="apple-press min-hit-area w-9 h-9 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* BANNER DE ERROR CON VISUALIZACIÓN DE LA REGLA EXACTA */}
          {activeError && (
            <div className="rounded-2xl p-4 bg-rose-500/10 border border-rose-500/30 shadow-inner space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wider uppercase ${getRuleBadge(activeError.rule).color}`}>
                  <ShieldAlert className="w-3 h-3" />
                  {getRuleBadge(activeError.rule).title}
                </span>
                <span className="text-[11px] text-rose-500 font-semibold">Bloqueo de Seguridad</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                {activeError.message}
              </p>
              {activeError.details && (
                <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-card-hover)] rounded-xl p-2.5 border border-[var(--border-subtle)] space-y-1">
                  {activeError.details.conflictingSiteName && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-secondary)]">Obra en conflicto:</span>
                      <strong className="text-[var(--text-primary)]">{activeError.details.conflictingSiteName}</strong>
                    </div>
                  )}
                  {activeError.details.conflictingInterval && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-secondary)]">Tramo ocupado:</span>
                      <strong className="text-[var(--text-primary)] tabular-numbers">{activeError.details.conflictingInterval}</strong>
                    </div>
                  )}
                  {activeError.details.actualGapMinutes !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-secondary)]">Tiempo de traslado actual:</span>
                      <span className="text-rose-500 font-bold tabular-numbers">{activeError.details.actualGapMinutes} min</span>
                      <span className="text-[var(--text-tertiary)]">/ requerido: mín. {activeError.details.requiredGapMinutes} min</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selector de Técnico */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
              <span>Técnico Responsable</span>
              {selectedTech && (
                <span className="text-[11px] text-[#2997FF] font-medium">{selectedTech.specialty}</span>
              )}
            </label>
            <div className="relative">
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                required
                className="w-full min-hit-area px-3.5 py-2.5 bg-[var(--bg-card-hover)] hover:border-[#2997FF]/50 focus:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] outline-none focus:border-[#2997FF] transition-colors cursor-pointer appearance-none"
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    {t.name} — {t.specialty}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selector de Obra / Ubicación */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
              <span>Obra de Destino</span>
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
                {sites.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                    {s.name} ({s.municipality}) — {s.address}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha y Hora de Inicio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Fecha de la Visita</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full min-hit-area px-3.5 py-2.5 bg-[var(--bg-card-hover)] focus:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] outline-none focus:border-[#2997FF] transition-colors cursor-pointer tabular-numbers"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                <span>Hora de Inicio</span>
                <span className="text-[10px] text-[var(--text-secondary)] tabular-numbers">Jornada 08:00–17:00</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  step="300"
                  className="w-full min-hit-area px-3.5 py-2.5 bg-[var(--bg-card-hover)] focus:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] outline-none focus:border-[#2997FF] transition-colors cursor-pointer tabular-numbers"
                />
              </div>
            </div>
          </div>

          {/* Duración con Presets Rápidos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)] font-semibold">Duración Estimada</span>
              <span className="text-[var(--text-primary)] font-bold tabular-numbers">{durationMinutes} minutos</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`apple-press min-hit-area py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer tabular-numbers ${
                    durationMinutes === mins
                      ? 'bg-[#2997FF] text-white border-[#2997FF] shadow-sm'
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
                <span>Horario previsto de ocupación:</span>
              </div>
              <div className="flex items-center gap-1 font-bold text-[var(--text-primary)] tabular-numbers">
                <span>{startTime}</span>
                <ArrowRight className="w-3 h-3 text-[var(--text-secondary)]" />
                <span>{computedEndTime}</span>
              </div>
            </div>
          </div>

          {/* Notas de Obra (Opcional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Notas de la Inspección (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Revisión de ferralla y encofrados en cota cero..."
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
              className="apple-press min-hit-area px-4 py-2.5 rounded-xl text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] border border-transparent hover:border-[var(--border-subtle)] cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || clientValidation !== null}
              className="apple-press min-hit-area inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2997FF] hover:bg-[#0077ED] disabled:bg-[#2997FF]/40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold shadow-[0_2px_14px_rgba(41,151,255,0.35)] cursor-pointer"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirmar y Programar</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
