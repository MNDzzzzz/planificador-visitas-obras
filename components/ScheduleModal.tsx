'use client';

import React, { useState, useTransition, useEffect } from 'react';
import {
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
  onSubmit: (input: CreateVisitInput) => Promise<{
    success: boolean;
    error?: string;
    rule?: 'RULE_A' | 'RULE_B' | 'RULE_C';
    details?: any;
  }>;
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
    details?: any;
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

  // Error a mostrar: el del servidor si falló el submit, o el del cliente en vivo si existe
  const activeError = serverError || (clientValidation ? {
    message: clientValidation.message,
    rule: clientValidation.rule,
    details: clientValidation.details,
  } : null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const input: CreateVisitInput = {
      technicianId,
      siteId,
      date,
      startTime,
      durationMinutes,
      notes: notes.trim() || undefined,
    };

    startTransition(async () => {
      const res = await onSubmit(input);
      if (!res.success) {
        setServerError({
          message: res.error || 'Ocurrió un error al registrar la visita.',
          rule: res.rule,
          details: res.details,
        });
      } else {
        onClose();
      }
    });
  };

  const getRuleBadge = (rule?: 'RULE_A' | 'RULE_B' | 'RULE_C') => {
    switch (rule) {
      case 'RULE_A':
        return {
          title: 'REGLA A • SIN SOLAPAMIENTOS',
          color: 'bg-[#FF453A]/15 text-[#FF453A] border-[#FF453A]/30',
        };
      case 'RULE_B':
        return {
          title: 'REGLA B • DESPLAZAMIENTO MÍNIMO 30 MIN',
          color: 'bg-[#FF9F0A]/15 text-[#FF9F0A] border-[#FF9F0A]/30',
        };
      case 'RULE_C':
        return {
          title: 'REGLA C • JORNADA LABORAL 08:00–17:00',
          color: 'bg-[#FF453A]/15 text-[#FF453A] border-[#FF453A]/30',
        };
      default:
        return {
          title: 'VALIDACIÓN TÉCNICA INCUMPLIDA',
          color: 'bg-[#FF453A]/15 text-[#FF453A] border-[#FF453A]/30',
        };
    }
  };

  const selectedTech = technicians.find((t) => t.id === technicianId);
  const selectedSite = sites.find((s) => s.id === siteId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto apple-modal-overlay">
      {/* Contenedor Modal: radio concéntrico rounded-3xl (24px) */}
      <div className="relative w-full max-w-xl bg-[#121418] border border-white/[0.12] rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden my-8">
        
        {/* Cabecera del Modal */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2997FF]/15 border border-[#2997FF]/30 flex items-center justify-center text-[#2997FF]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#F5F5F7]">
                Programar Inspección Técnica
              </h2>
              <p className="text-xs text-[#86868B]">
                Comprobación en vivo de solapamientos y tiempo de traslado
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="apple-press min-hit-area w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-[#86868B] hover:text-[#F5F5F7] cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* BANNER DE ERROR CON VISUALIZACIÓN DE LA REGLA EXACTA */}
          {activeError && (
            <div className="rounded-2xl p-4 bg-[#FF453A]/10 border border-[#FF453A]/30 shadow-inner space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wider uppercase ${getRuleBadge(activeError.rule).color}`}>
                  <ShieldAlert className="w-3 h-3" />
                  {getRuleBadge(activeError.rule).title}
                </span>
                <span className="text-[11px] text-[#FF453A] font-semibold">Bloqueo de Seguridad</span>
              </div>
              <p className="text-xs sm:text-sm text-[#F5F5F7] leading-relaxed">
                {activeError.message}
              </p>
              {activeError.details && (
                <div className="text-[11px] text-[#86868B] bg-black/40 rounded-xl p-2.5 border border-white/[0.05] space-y-1">
                  {activeError.details.conflictingSiteName && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/60">Obra en conflicto:</span>
                      <strong className="text-white">{activeError.details.conflictingSiteName}</strong>
                    </div>
                  )}
                  {activeError.details.conflictingInterval && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/60">Tramo ocupado:</span>
                      <strong className="text-white tabular-numbers">{activeError.details.conflictingInterval}</strong>
                    </div>
                  )}
                  {activeError.details.actualGapMinutes !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/60">Tiempo de traslado actual:</span>
                      <span className="text-[#FF453A] font-semibold tabular-numbers">{activeError.details.actualGapMinutes} min</span>
                      <span className="text-white/40">/ requerido: mín. {activeError.details.requiredGapMinutes} min</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selector de Técnico */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#86868B] flex items-center justify-between">
              <span>Técnico Responsable</span>
              {selectedTech && (
                <span className="text-[11px] text-[#2997FF]">{selectedTech.specialty}</span>
              )}
            </label>
            <div className="relative">
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                required
                className="w-full min-hit-area px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/[0.1] rounded-xl text-xs sm:text-sm text-[#F5F5F7] outline-none focus:border-[#2997FF] transition-colors cursor-pointer appearance-none"
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#121418] text-[#F5F5F7]">
                    {t.name} — {t.specialty}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selector de Obra / Ubicación */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#86868B] flex items-center justify-between">
              <span>Obra de Destino</span>
              {selectedSite && (
                <span className="text-[11px] text-[#30D158]">{selectedSite.municipality}</span>
              )}
            </label>
            <div className="relative">
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                required
                className="w-full min-hit-area px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/[0.1] rounded-xl text-xs sm:text-sm text-[#F5F5F7] outline-none focus:border-[#2997FF] transition-colors cursor-pointer appearance-none"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#121418] text-[#F5F5F7]">
                    {s.name} ({s.municipality}) — {s.address}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha y Hora de Inicio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#86868B]">Fecha de la Visita</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full min-hit-area px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/[0.1] rounded-xl text-xs sm:text-sm text-[#F5F5F7] outline-none focus:border-[#2997FF] transition-colors scheme-dark cursor-pointer tabular-numbers"
                />
              </div>
            </div>

            {/* Hora de Inicio */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#86868B] flex items-center justify-between">
                <span>Hora de Inicio</span>
                <span className="text-[10px] text-[#86868B] tabular-numbers">Jornada 08:00–17:00</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  step="300"
                  className="w-full min-hit-area px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/[0.1] rounded-xl text-xs sm:text-sm text-[#F5F5F7] outline-none focus:border-[#2997FF] transition-colors scheme-dark cursor-pointer tabular-numbers"
                />
              </div>
            </div>
          </div>

          {/* Duración con Presets Rápidos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#86868B] font-medium">Duración Estimada</span>
              <span className="text-[#F5F5F7] font-semibold tabular-numbers">{durationMinutes} minutos</span>
            </div>
            
            {/* Presets concéntricos: outer rounded-xl = inner rounded-lg + padding */}
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`apple-press min-hit-area py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer tabular-numbers ${
                    durationMinutes === mins
                      ? 'bg-[#2997FF]/20 border-[#2997FF] text-[#2997FF]'
                      : 'bg-white/[0.03] border-white/[0.08] text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/[0.06]'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>

            {/* Preview de Fin de Visita con Tabular Nums */}
            <div className="flex items-center justify-between text-xs bg-white/[0.03] border border-white/[0.07] rounded-xl px-3.5 py-2">
              <div className="flex items-center gap-1.5 text-[#86868B]">
                <Clock className="w-3.5 h-3.5 text-[#2997FF]" />
                <span>Horario previsto de ocupación:</span>
              </div>
              <div className="flex items-center gap-1 font-semibold text-[#F5F5F7] tabular-numbers">
                <span>{startTime}</span>
                <ArrowRight className="w-3 h-3 text-[#86868B]" />
                <span>{computedEndTime}</span>
              </div>
            </div>
          </div>

          {/* Notas de Obra (Opcional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#86868B]">
              Notas de la Inspección (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Revisión de ferralla y encofrados en cota cero..."
              rows={2}
              className="w-full px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/[0.1] rounded-xl text-xs sm:text-sm text-[#F5F5F7] placeholder-[#86868B] outline-none focus:border-[#2997FF] transition-colors resize-none"
            />
          </div>

          {/* Botones de Acción (Hit target min 44px + Microinteracción Apple 0.975) */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="apple-press min-hit-area px-4 py-2.5 rounded-xl text-xs sm:text-sm text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || clientValidation !== null}
              className="apple-press min-hit-area inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2997FF] hover:bg-[#0077ED] disabled:bg-[#2997FF]/40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium shadow-[0_2px_14px_rgba(41,151,255,0.35)] cursor-pointer"
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
