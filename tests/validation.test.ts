import { describe, it, expect } from 'vitest';
import {
  validateVisitScheduling,
  timeToMinutes,
  minutesToTime,
  calculateEndTime,
} from '../lib/validation/rules';
import { createVisitSchema, cancelVisitSchema } from '../lib/validation/schemas';
import { VisitDTO } from '../lib/types';

describe('Motor de Validación de Visitas a Obras', () => {
  const dummyTechnicianId = 'tech-1';
  const dummyOtherTechnicianId = 'tech-2';
  const siteAId = 'site-A';
  const siteBId = 'site-B';
  const testDate = '2026-11-02'; // Lunes

  const baseScheduledVisit: VisitDTO = {
    id: 'visit-1',
    technicianId: dummyTechnicianId,
    siteId: siteAId,
    site: {
      id: siteAId,
      name: 'Residencial Las Rozas',
      municipality: 'Las Rozas de Madrid',
      address: 'Calle Mayor 1',
    },
    date: testDate,
    startTime: '10:00',
    durationMinutes: 60,
    endTime: '11:00',
    status: 'SCHEDULED',
  };

  describe('Utilidades de Tiempo', () => {
    it('convierte correctamente HH:mm a minutos desde medianoche', () => {
      expect(timeToMinutes('08:00')).toBe(480);
      expect(timeToMinutes('17:00')).toBe(1020);
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('12:30')).toBe(750);
    });

    it('convierte minutos a formato HH:mm legible', () => {
      expect(minutesToTime(480)).toBe('08:00');
      expect(minutesToTime(1020)).toBe('17:00');
      expect(minutesToTime(750)).toBe('12:30');
    });

    it('calcula la hora de fin sumando la duración', () => {
      expect(calculateEndTime('08:30', 90)).toBe('10:00');
      expect(calculateEndTime('15:00', 60)).toBe('16:00');
    });
  });

  describe('Regla C: Jornada Laboral (08:00 a 17:00 en Europe/Madrid)', () => {
    it('permite una visita válida dentro del horario laboral', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '09:00',
          durationMinutes: 60,
        },
        existingVisits: [],
      });

      expect(result.isValid).toBe(true);
    });

    it('permite una visita que inicia exactamente a las 08:00', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '08:00',
          durationMinutes: 60,
        },
        existingVisits: [],
      });

      expect(result.isValid).toBe(true);
    });

    it('permite una visita que termina exactamente a las 17:00', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '15:00',
          durationMinutes: 120, // Termina a las 17:00
        },
        existingVisits: [],
      });

      expect(result.isValid).toBe(true);
    });

    it('rechaza una visita que comienza antes de las 08:00 (ej. 07:45)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '07:45',
          durationMinutes: 60,
        },
        existingVisits: [],
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_C');
        expect(result.code).toBe('OUTSIDE_WORKING_HOURS');
        expect(result.message).toContain('08:00');
      }
    });

    it('rechaza una visita que finaliza después de las 17:00 (ej. 16:30 + 60 min -> 17:30)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '16:30',
          durationMinutes: 60, // Terminaría a las 17:30
        },
        existingVisits: [],
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_C');
        expect(result.code).toBe('OUTSIDE_WORKING_HOURS');
        expect(result.message).toContain('17:00');
      }
    });

    it('rechaza una visita que comienza a las 07:59 (límite crítico off-by-one de 1 minuto antes)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '07:59',
          durationMinutes: 60,
        },
        existingVisits: [],
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_C');
        expect(result.code).toBe('OUTSIDE_WORKING_HOURS');
      }
    });

    it('rechaza una visita que finaliza a las 17:01 (límite crítico off-by-one de 1 minuto después)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '16:01',
          durationMinutes: 60, // Terminaría a las 17:01
        },
        existingVisits: [],
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_C');
        expect(result.code).toBe('OUTSIDE_WORKING_HOURS');
      }
    });

    it('permite una jornada laboral completa continua (08:00 a 17:00, 540 minutos)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '08:00',
          durationMinutes: 540, // 9 horas completas
        },
        existingVisits: [],
      });

      expect(result.isValid).toBe(true);
    });

    it('rechaza formato de hora inválido sin ceros o fuera de rango (ej. "9:00", "25:00")', () => {
      const resultBadPadding = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '9:00',
          durationMinutes: 60,
        },
        existingVisits: [],
      });
      expect(resultBadPadding.isValid).toBe(false);
      if (!resultBadPadding.isValid) {
        expect(resultBadPadding.code).toBe('INVALID_TIME_FORMAT');
      }

      const resultOutOfRange = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '25:00',
          durationMinutes: 60,
        },
        existingVisits: [],
      });
      expect(resultOutOfRange.isValid).toBe(false);
      if (!resultOutOfRange.isValid) {
        expect(resultOutOfRange.code).toBe('INVALID_TIME_FORMAT');
      }
    });

    it('rechaza duración menor o igual a 0 y valores negativos', () => {
      const resultZero = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '10:00',
          durationMinutes: 0,
        },
        existingVisits: [],
      });

      expect(resultZero.isValid).toBe(false);
      if (!resultZero.isValid) {
        expect(resultZero.code).toBe('INVALID_DURATION');
      }

      const resultNegative = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '10:00',
          durationMinutes: -30,
        },
        existingVisits: [],
      });

      expect(resultNegative.isValid).toBe(false);
      if (!resultNegative.isValid) {
        expect(resultNegative.code).toBe('INVALID_DURATION');
      }
    });
  });

  describe('Regla A: Sin Solapamientos del Técnico', () => {
    it('rechaza una visita con coincidencia horaria exacta (10:00 a 11:00)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '10:00',
          durationMinutes: 60,
        },
        existingVisits: [baseScheduledVisit],
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_A');
        expect(result.code).toBe('TECHNICIAN_OVERLAP');
      }
    });

    it('rechaza una visita que empieza dentro de una existente (10:30 a 11:30)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '10:30',
          durationMinutes: 60,
        },
        existingVisits: [baseScheduledVisit],
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_A');
        expect(result.code).toBe('TECHNICIAN_OVERLAP');
      }
    });

    it('rechaza una visita que termina dentro de una existente (09:30 a 10:30)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '09:30',
          durationMinutes: 60,
        },
        existingVisits: [baseScheduledVisit],
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_A');
        expect(result.code).toBe('TECHNICIAN_OVERLAP');
      }
    });

    it('rechaza una visita que engloba completamente a otra (09:30 a 11:30)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '09:30',
          durationMinutes: 120,
        },
        existingVisits: [baseScheduledVisit],
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_A');
        expect(result.code).toBe('TECHNICIAN_OVERLAP');
      }
    });

    it('rechaza una visita que queda completamente contenida en el interior de una existente (10:15 a 10:45 dentro de 10:00 a 11:00)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '10:15',
          durationMinutes: 30, // 10:15 a 10:45
        },
        existingVisits: [baseScheduledVisit], // 10:00 a 11:00
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_A');
        expect(result.code).toBe('TECHNICIAN_OVERLAP');
      }
    });

    it('permite modificar una visita existente en su propio horario mediante excludeVisitId', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '10:00',
          durationMinutes: 60,
        },
        existingVisits: [baseScheduledVisit], // Tiene id: 'visit-1'
        excludeVisitId: 'visit-1', // Se excluye a sí misma
      });

      expect(result.isValid).toBe(true);
    });

    it('rechaza colisión si el excludeVisitId no corresponde a la visita solapada', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '10:00',
          durationMinutes: 60,
        },
        existingVisits: [baseScheduledVisit],
        excludeVisitId: 'otra-visita-distinta',
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_A');
        expect(result.code).toBe('TECHNICIAN_OVERLAP');
      }
    });

    it('permite visitas simultáneas si pertenecen a TÉCNICOS DIFERENTES', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyOtherTechnicianId, // Técnico 2
          siteId: siteBId,
          date: testDate,
          startTime: '10:00',
          durationMinutes: 60,
        },
        existingVisits: [baseScheduledVisit], // Técnico 1
      });

      expect(result.isValid).toBe(true);
    });

    it('permite visitas si están en FECHAS DIFERENTES', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: '2026-11-03', // Día siguiente
          startTime: '10:00',
          durationMinutes: 60,
        },
        existingVisits: [baseScheduledVisit],
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('Regla B: Tiempos de Desplazamiento', () => {
    it('permite visitas consecutivas en la MISMA OBRA sin margen (0 minutos)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId, // Misma obra que baseScheduledVisit
          date: testDate,
          startTime: '11:00', // Empieza justo al terminar la anterior a las 11:00
          durationMinutes: 60,
        },
        existingVisits: [baseScheduledVisit],
      });

      expect(result.isValid).toBe(true);
    });

    it('permite visitas consecutivas en OBRAS DIFERENTES con al menos 30 min de margen', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteBId, // Obra diferente
          date: testDate,
          startTime: '11:30', // 30 minutos de traslado desde las 11:00
          durationMinutes: 60,
        },
        existingVisits: [baseScheduledVisit],
      });

      expect(result.isValid).toBe(true);
    });

    it('rechaza visita en OBRA DIFERENTE si el margen posterior es menor a 30 min (ej. 20 min)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteBId, // Obra diferente
          date: testDate,
          startTime: '11:20', // Solo 20 minutos tras las 11:00
          durationMinutes: 60,
        },
        existingVisits: [baseScheduledVisit],
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_B');
        expect(result.code).toBe('INSUFFICIENT_TRAVEL_TIME');
        expect(result.message).toContain('30 minutos');
        expect(result.details?.actualGapMinutes).toBe(20);
      }
    });

    it('rechaza visita en OBRA DIFERENTE con margen posterior exacto de 29 minutos (frontera off-by-one)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteBId, // Obra diferente
          date: testDate,
          startTime: '11:29', // Exactamente 29 minutos tras las 11:00
          durationMinutes: 60,
        },
        existingVisits: [baseScheduledVisit],
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_B');
        expect(result.code).toBe('INSUFFICIENT_TRAVEL_TIME');
        expect(result.details?.actualGapMinutes).toBe(29);
        expect(result.details?.direction).toBe('PREVIOUS');
      }
    });

    it('rechaza visita en OBRA DIFERENTE si el margen anterior hacia la siguiente es menor a 30 min', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteBId, // Obra diferente
          date: testDate,
          startTime: '08:30',
          durationMinutes: 75, // Termina a las 09:45 -> Solo 15 min antes de las 10:00
        },
        existingVisits: [baseScheduledVisit], // Empieza a las 10:00
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_B');
        expect(result.code).toBe('INSUFFICIENT_TRAVEL_TIME');
        expect(result.details?.actualGapMinutes).toBe(15);
        expect(result.details?.direction).toBe('NEXT');
      }
    });

    it('rechaza visita en OBRA DIFERENTE con margen anterior exacto de 29 minutos (frontera off-by-one hacia siguiente)', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteBId, // Obra diferente
          date: testDate,
          startTime: '08:31',
          durationMinutes: 60, // Termina a las 09:31 -> Exactamente 29 min antes de las 10:00
        },
        existingVisits: [baseScheduledVisit], // Empieza a las 10:00
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_B');
        expect(result.code).toBe('INSUFFICIENT_TRAVEL_TIME');
        expect(result.details?.actualGapMinutes).toBe(29);
        expect(result.details?.direction).toBe('NEXT');
      }
    });

    it('permite visita en OBRA DIFERENTE con margen anterior exacto de 30 minutos', () => {
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteBId, // Obra diferente
          date: testDate,
          startTime: '08:30',
          durationMinutes: 60, // Termina a las 09:30 -> Exactamente 30 min antes de las 10:00
        },
        existingVisits: [baseScheduledVisit], // Empieza a las 10:00
      });

      expect(result.isValid).toBe(true);
    });

    it('permite encadenar tres visitas consecutivas en la MISMA OBRA con 0 minutos de margen', () => {
      const prevVisit: VisitDTO = {
        id: 'v-prev',
        technicianId: dummyTechnicianId,
        siteId: siteAId,
        date: testDate,
        startTime: '09:00',
        durationMinutes: 60,
        endTime: '10:00',
        status: 'SCHEDULED',
      };

      const nextVisit: VisitDTO = {
        id: 'v-next',
        technicianId: dummyTechnicianId,
        siteId: siteAId,
        date: testDate,
        startTime: '11:00',
        durationMinutes: 60,
        endTime: '12:00',
        status: 'SCHEDULED',
      };

      // Nueva visita de 10:00 a 11:00 en la misma obra siteA
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '10:00',
          durationMinutes: 60,
        },
        existingVisits: [prevVisit, nextVisit],
      });

      expect(result.isValid).toBe(true);
    });

    it('rechaza inserción asimétrica (0 min con obra igual previa, pero 25 min con obra diferente posterior)', () => {
      const prevSameSite: VisitDTO = {
        id: 'v-prev-same',
        technicianId: dummyTechnicianId,
        siteId: siteAId,
        date: testDate,
        startTime: '09:00',
        durationMinutes: 60,
        endTime: '10:00',
        status: 'SCHEDULED',
      };

      const nextDiffSite: VisitDTO = {
        id: 'v-next-diff',
        technicianId: dummyTechnicianId,
        siteId: siteBId, // Obra B
        date: testDate,
        startTime: '11:25', // Comienza a las 11:25
        durationMinutes: 60,
        endTime: '12:25',
        status: 'SCHEDULED',
      };

      // Nueva visita en siteA de 10:00 a 11:00
      // Con v-prev-same (siteA): 0 min gap -> OK
      // Con v-next-diff (siteB): 11:25 - 11:00 = 25 min (< 30 min) -> Debe fallar hacia NEXT
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteAId,
          date: testDate,
          startTime: '10:00',
          durationMinutes: 60,
        },
        existingVisits: [prevSameSite, nextDiffSite],
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_B');
        expect(result.code).toBe('INSUFFICIENT_TRAVEL_TIME');
        expect(result.details?.actualGapMinutes).toBe(25);
        expect(result.details?.direction).toBe('NEXT');
      }
    });

    it('comprueba el margen en AMBAS direcciones si se inserta entre dos visitas', () => {
      const visitEarly: VisitDTO = {
        id: 'v-early',
        technicianId: dummyTechnicianId,
        siteId: siteAId,
        date: testDate,
        startTime: '08:30',
        durationMinutes: 60,
        endTime: '09:30',
        status: 'SCHEDULED',
      };

      const visitLate: VisitDTO = {
        id: 'v-late',
        technicianId: dummyTechnicianId,
        siteId: siteBId,
        date: testDate,
        startTime: '13:00',
        durationMinutes: 60,
        endTime: '14:00',
        status: 'SCHEDULED',
      };

      // Inserción en Obra C de 10:30 a 12:00
      // Gap con v-early: 10:30 - 09:30 = 60 min (>=30 min) -> OK
      // Gap con v-late: 13:00 - 12:00 = 60 min (>=30 min) -> OK
      const passResult = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: 'site-C',
          date: testDate,
          startTime: '10:30',
          durationMinutes: 90, // Fin: 12:00
        },
        existingVisits: [visitEarly, visitLate],
      });
      expect(passResult.isValid).toBe(true);

      // Inserción en Obra C de 10:30 a 12:45
      // Gap con v-late: 13:00 - 12:45 = 15 min (< 30 min) -> FAILS
      const failResult = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: 'site-C',
          date: testDate,
          startTime: '10:30',
          durationMinutes: 135, // Fin: 12:45
        },
        existingVisits: [visitEarly, visitLate],
      });
      expect(failResult.isValid).toBe(false);
      if (!failResult.isValid) {
        expect(failResult.rule).toBe('RULE_B');
        expect(failResult.details?.actualGapMinutes).toBe(15);
      }
    });
  });

  describe('Impacto de Visitas CANCELADAS', () => {
    it('una visita CANCELADA NO provoca solapamiento (libera el horario del técnico)', () => {
      const cancelledVisit: VisitDTO = {
        ...baseScheduledVisit,
        id: 'cancelled-1',
        status: 'CANCELLED',
      };

      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteBId,
          date: testDate,
          startTime: '10:00', // Mismo horario exacto que la cancelada
          durationMinutes: 60,
        },
        existingVisits: [cancelledVisit],
      });

      expect(result.isValid).toBe(true);
    });

    it('una visita CANCELADA NO exige margen de desplazamiento de 30 minutos', () => {
      const cancelledVisit: VisitDTO = {
        ...baseScheduledVisit,
        id: 'cancelled-1',
        endTime: '10:00',
        status: 'CANCELLED',
      };

      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteBId, // Obra diferente
          date: testDate,
          startTime: '10:10', // Solo 10 minutos después de la cancelada
          durationMinutes: 60,
        },
        existingVisits: [cancelledVisit],
      });

      expect(result.isValid).toBe(true);
    });

    it('ignora visita cancelada intermedia y valida el margen contra la visita activa real más cercana', () => {
      const activeEarly: VisitDTO = {
        id: 'v-active-early',
        technicianId: dummyTechnicianId,
        siteId: siteAId,
        date: testDate,
        startTime: '08:00',
        durationMinutes: 60,
        endTime: '09:00',
        status: 'SCHEDULED',
      };

      const cancelledMid: VisitDTO = {
        id: 'v-cancelled-mid',
        technicianId: dummyTechnicianId,
        siteId: siteAId,
        date: testDate,
        startTime: '09:30',
        durationMinutes: 30,
        endTime: '10:00',
        status: 'CANCELLED',
      };

      // Nueva visita en siteB a las 10:00 (duración 60 min, fin 11:00)
      // La cancelada de 09:30 a 10:00 debe ser ignorada.
      // La visita activa anterior más cercana es v-active-early (fin 09:00).
      // Margen con v-active-early: 10:00 - 09:00 = 60 min (>=30 min) -> VÁLIDO
      const result = validateVisitScheduling({
        newVisit: {
          technicianId: dummyTechnicianId,
          siteId: siteBId,
          date: testDate,
          startTime: '10:00',
          durationMinutes: 60,
        },
        existingVisits: [activeEarly, cancelledMid],
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('Esquemas Zod y Contratos de Entrada (Silent Failure Hunter)', () => {
    it('valida con éxito un input válido para creación de visita', () => {
      const input = {
        technicianId: 'tech-1',
        siteId: 'site-A',
        date: '2026-11-02',
        startTime: '09:00',
        durationMinutes: 60,
        notes: 'Revisión estructural',
      };

      const result = createVisitSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.technicianId).toBe('tech-1');
        expect(result.data.durationMinutes).toBe(60);
      }
    });

    it('falla si falta el técnico o la obra requeridos', () => {
      const missingTech = createVisitSchema.safeParse({
        technicianId: '',
        siteId: 'site-A',
        date: '2026-11-02',
        startTime: '09:00',
        durationMinutes: 60,
      });
      expect(missingTech.success).toBe(false);

      const missingSite = createVisitSchema.safeParse({
        technicianId: 'tech-1',
        siteId: '',
        date: '2026-11-02',
        startTime: '09:00',
        durationMinutes: 60,
      });
      expect(missingSite.success).toBe(false);
    });

    it('falla con formato de fecha no ISO (YYYY-MM-DD)', () => {
      const result = createVisitSchema.safeParse({
        technicianId: 'tech-1',
        siteId: 'site-A',
        date: '02/11/2026', // Formato español con barras
        startTime: '09:00',
        durationMinutes: 60,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('YYYY-MM-DD');
      }
    });

    it('falla con duración superior a 540 minutos (jornada máxima)', () => {
      const result = createVisitSchema.safeParse({
        technicianId: 'tech-1',
        siteId: 'site-A',
        date: '2026-11-02',
        startTime: '08:00',
        durationMinutes: 541,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('540 minutos');
      }
    });

    it('valida el esquema de cancelación exigiendo visitId no vacío', () => {
      const valid = cancelVisitSchema.safeParse({ visitId: 'vis-123' });
      expect(valid.success).toBe(true);

      const invalid = cancelVisitSchema.safeParse({ visitId: '' });
      expect(invalid.success).toBe(false);
    });
  });
});
