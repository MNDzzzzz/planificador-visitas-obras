import {
  CreateVisitInput,
  SiteDTO,
  ValidationResult,
  VisitDTO,
} from '../types';
import { getOfflineTravelEstimate, officialSites } from '../geo/routing';

// Constantes de jornada laboral (Europe/Madrid)
export const WORK_DAY_START_MINUTES = 8 * 60; // 08:00 -> 480 minutos
export const WORK_DAY_END_MINUTES = 17 * 60; // 17:00 -> 1020 minutos
export const MIN_TRAVEL_MINUTES_DIFFERENT_SITES = 30;
export const MIN_TRAVEL_MINUTES_SAME_SITE = 0;

/**
 * Resuelve los datos de una obra buscando en el mapa provisto, en la visita o en el catálogo oficial
 */
function resolveSite(
  siteId: string,
  visitSite?: SiteDTO,
  sitesMap?: Map<string, SiteDTO>
): SiteDTO {
  if (visitSite && visitSite.id === siteId) return visitSite;
  if (sitesMap && sitesMap.has(siteId)) return sitesMap.get(siteId)!;
  const official = officialSites.find((s) => s.id === siteId);
  if (official) return official;

  return {
    id: siteId,
    name: visitSite?.name || `Obra (${siteId})`,
    municipality: visitSite?.municipality || 'Desconocido',
    address: visitSite?.address || '',
  };
}

/**
 * Convierte un string en formato 'HH:mm' a minutos desde la medianoche.
 */
export function timeToMinutes(timeStr: string): number {
  const trimmed = timeStr.trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (!match) {
    throw new Error(`Formato de hora inválido: "${timeStr}". Debe ser "HH:mm".`);
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  return hours * 60 + minutes;
}

/**
 * Convierte minutos desde la medianoche a string en formato 'HH:mm'.
 */
export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(totalMinutes, 24 * 60 - 1));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Calcula la hora de fin sumando la duración en minutos a la hora de inicio.
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMins = timeToMinutes(startTime);
  const endMins = startMins + durationMinutes;
  return minutesToTime(endMins);
}

export interface ValidateVisitParams {
  newVisit: CreateVisitInput;
  existingVisits: VisitDTO[];
  excludeVisitId?: string; // Para edición: omitir la propia visita que se está modificando
  sitesMap?: Map<string, SiteDTO>;
}

/**
 * Motor puro de validación para programación de visitas a obras.
 * Ejecuta en orden estricto las reglas de negocio:
 * 1. Formato y duración válida.
 * 2. Regla C: Jornada Laboral (08:00 - 17:00 en Europe/Madrid).
 * 3. Regla A: Sin solapamientos del técnico.
 * 4. Regla B: Desplazamiento mínimo de 30 minutos entre obras diferentes (0 si es la misma).
 */
export function validateVisitScheduling({
  newVisit,
  existingVisits,
  excludeVisitId,
  sitesMap,
}: ValidateVisitParams): ValidationResult {
  // 1. Validación de Formato y Duración
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(newVisit.startTime.trim())) {
    return {
      isValid: false,
      rule: 'RULE_C',
      code: 'INVALID_TIME_FORMAT',
      message: `El formato de hora de inicio "${newVisit.startTime}" no es válido. Debe tener formato HH:mm (ej. 09:30).`,
    };
  }

  if (
    !newVisit.durationMinutes ||
    !Number.isInteger(newVisit.durationMinutes) ||
    newVisit.durationMinutes <= 0
  ) {
    return {
      isValid: false,
      rule: 'RULE_C',
      code: 'INVALID_DURATION',
      message: 'La duración de la visita debe ser un número entero mayor a 0 minutos.',
    };
  }

  const startMinutes = timeToMinutes(newVisit.startTime);
  const endMinutes = startMinutes + newVisit.durationMinutes;
  const computedEndTime = minutesToTime(endMinutes);

  // 2. REGLA C: Jornada Laboral (08:00 a 17:00 Europe/Madrid)
  if (startMinutes < WORK_DAY_START_MINUTES) {
    return {
      isValid: false,
      rule: 'RULE_C',
      code: 'OUTSIDE_WORKING_HOURS',
      message: `La visita no puede comenzar a las ${newVisit.startTime}. La jornada laboral comienza a las 08:00 (Europe/Madrid).`,
    };
  }

  if (startMinutes >= WORK_DAY_END_MINUTES) {
    return {
      isValid: false,
      rule: 'RULE_C',
      code: 'OUTSIDE_WORKING_HOURS',
      message: `La visita no puede comenzar a las ${newVisit.startTime}. La jornada laboral finaliza a las 17:00 (Europe/Madrid).`,
    };
  }

  if (endMinutes > WORK_DAY_END_MINUTES) {
    return {
      isValid: false,
      rule: 'RULE_C',
      code: 'OUTSIDE_WORKING_HOURS',
      message: `La visita finalizaría a las ${computedEndTime}, superando el límite de la jornada laboral establecido a las 17:00 (Europe/Madrid).`,
    };
  }

  // Filtrar visitas relevantes:
  // - Mismo técnico
  // - Misma fecha
  // - Estado SCHEDULED (las canceladas liberan el horario)
  // - Excluir la visita en edición si aplica
  const activeVisits = existingVisits.filter((v) => {
    if (excludeVisitId && v.id === excludeVisitId) return false;
    if (v.status !== 'SCHEDULED') return false;
    if (v.technicianId !== newVisit.technicianId) return false;
    if (v.date !== newVisit.date) return false;
    return true;
  });

  // 3. REGLA A: Sin Solapamientos
  // Dos intervalos [startA, endA) y [startB, endB) se solapan si:
  // max(startA, startB) < min(endA, endB)
  for (const visit of activeVisits) {
    const vStart = timeToMinutes(visit.startTime);
    const vEnd = timeToMinutes(visit.endTime);

    const isOverlapping = Math.max(startMinutes, vStart) < Math.min(endMinutes, vEnd);

    if (isOverlapping) {
      const siteName = visit.site?.name || 'otra obra';
      return {
        isValid: false,
        rule: 'RULE_A',
        code: 'TECHNICIAN_OVERLAP',
        message: `El técnico ya tiene una visita programada en ese horario en "${siteName}" (${visit.startTime} a ${visit.endTime}). No se permiten solapamientos horarios.`,
        details: {
          conflictingVisitId: visit.id,
          conflictingSiteName: siteName,
          conflictingInterval: `${visit.startTime} - ${visit.endTime}`,
        },
      };
    }
  }

  // 4. REGLA B: Desplazamiento mínimo (30 min si obras diferentes, 0 min si misma obra consecutiva)
  // Localizamos la visita inmediatamente anterior y la posterior
  let immediatePrev: VisitDTO | null = null;
  let immediatePrevEnd = -1;

  let immediateNext: VisitDTO | null = null;
  let immediateNextStart = Infinity;

  for (const visit of activeVisits) {
    const vStart = timeToMinutes(visit.startTime);
    const vEnd = timeToMinutes(visit.endTime);

    // Visitas previas que terminan antes o justo al inicio de la nueva
    if (vEnd <= startMinutes) {
      if (vEnd > immediatePrevEnd) {
        immediatePrevEnd = vEnd;
        immediatePrev = visit;
      }
    }

    // Visitas posteriores que empiezan después o justo al fin de la nueva
    if (vStart >= endMinutes) {
      if (vStart < immediateNextStart) {
        immediateNextStart = vStart;
        immediateNext = visit;
      }
    }
  }

  // Validar desplazamiento con la visita anterior (Regla B Dinámica)
  if (immediatePrev) {
    const prevSite = resolveSite(immediatePrev.siteId, immediatePrev.site, sitesMap);
    const currentSite = resolveSite(newVisit.siteId, undefined, sitesMap);

    const travelEstimate = getOfflineTravelEstimate(prevSite, currentSite);
    const requiredMargin = travelEstimate.totalRequiredMinutes;
    const actualMargin = startMinutes - immediatePrevEnd;

    if (actualMargin < requiredMargin) {
      const prevSiteName = prevSite.name || 'la obra previa';
      const detailBreakdown =
        travelEstimate.drivingMinutes > 0
          ? ` (${travelEstimate.drivingMinutes} min conducción + ${travelEstimate.bufferMinutes} min margen)`
          : '';
      const routeText = travelEstimate.routeSummary ? ` [${travelEstimate.routeSummary}]` : '';

      return {
        isValid: false,
        rule: 'RULE_B',
        code: 'INSUFFICIENT_TRAVEL_TIME',
        message: `Tiempo de desplazamiento insuficiente: se requieren al menos ${requiredMargin} minutos de traslado desde "${prevSiteName}"${detailBreakdown}${routeText} (termina a las ${immediatePrev.endTime}). Margen actual disponible: ${actualMargin} minutos.`,
        details: {
          conflictingVisitId: immediatePrev.id,
          conflictingSiteName: prevSiteName,
          requiredGapMinutes: requiredMargin,
          actualGapMinutes: actualMargin,
          direction: 'PREVIOUS',
          travelEstimate,
        },
      };
    }
  }

  // Validar desplazamiento con la visita posterior (Regla B Dinámica)
  if (immediateNext) {
    const currentSite = resolveSite(newVisit.siteId, undefined, sitesMap);
    const nextSite = resolveSite(immediateNext.siteId, immediateNext.site, sitesMap);

    const travelEstimate = getOfflineTravelEstimate(currentSite, nextSite);
    const requiredMargin = travelEstimate.totalRequiredMinutes;
    const actualMargin = immediateNextStart - endMinutes;

    if (actualMargin < requiredMargin) {
      const nextSiteName = nextSite.name || 'la obra posterior';
      const detailBreakdown =
        travelEstimate.drivingMinutes > 0
          ? ` (${travelEstimate.drivingMinutes} min conducción + ${travelEstimate.bufferMinutes} min margen)`
          : '';
      const routeText = travelEstimate.routeSummary ? ` [${travelEstimate.routeSummary}]` : '';

      return {
        isValid: false,
        rule: 'RULE_B',
        code: 'INSUFFICIENT_TRAVEL_TIME',
        message: `Tiempo de desplazamiento insuficiente: se requieren al menos ${requiredMargin} minutos de traslado hacia "${nextSiteName}"${detailBreakdown}${routeText} (comienza a las ${immediateNext.startTime}). Margen actual disponible: ${actualMargin} minutos.`,
        details: {
          conflictingVisitId: immediateNext.id,
          conflictingSiteName: nextSiteName,
          requiredGapMinutes: requiredMargin,
          actualGapMinutes: actualMargin,
          direction: 'NEXT',
          travelEstimate,
        },
      };
    }
  }

  // Todas las reglas han sido satisfechas
  return { isValid: true };
}
