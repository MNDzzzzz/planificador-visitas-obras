import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  scheduleVisitAction,
  cancelVisitAction,
  getVisitsAction,
  getInitialDataAction,
} from '../lib/actions/visits';

// Mock de revalidatePath para entorno de pruebas Node/Vitest
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Server Actions: Visitas y Cancelaciones', () => {
  const testDate = '2026-11-10';
  const technicianId = 'tech-carlos';
  const siteRozas = 'site-rozas';
  const sitePozuelo = 'site-pozuelo';

  it('permite programar una visita válida', async () => {
    const result = await scheduleVisitAction({
      technicianId,
      siteId: siteRozas,
      date: testDate,
      startTime: '08:00',
      durationMinutes: 60,
      notes: 'Visita de prueba matinal',
    });

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.status).toBe('SCHEDULED');
      expect(result.data.startTime).toBe('08:00');
      expect(result.data.endTime).toBe('09:00');
    }
  });

  it('rechaza una visita solapada con la anterior (Regla A)', async () => {
    // 08:30 a 09:30 solapa con 08:00 a 09:00
    const result = await scheduleVisitAction({
      technicianId,
      siteId: siteRozas,
      date: testDate,
      startTime: '08:30',
      durationMinutes: 60,
    });

    expect(result.success).toBe(false);
    expect(result.rule).toBe('RULE_A');
    expect(result.code).toBe('TECHNICIAN_OVERLAP');
  });

  it('rechaza una visita en obra distinta sin margen de 30 min (Regla B)', async () => {
    // 09:15 a 10:15 en obra distinta: margen 15 min < 30 min
    const result = await scheduleVisitAction({
      technicianId,
      siteId: sitePozuelo,
      date: testDate,
      startTime: '09:15',
      durationMinutes: 60,
    });

    expect(result.success).toBe(false);
    expect(result.rule).toBe('RULE_B');
    expect(result.code).toBe('INSUFFICIENT_TRAVEL_TIME');
  });

  it('cancela una visita, liberando el slot horario de inmediato mientras permanece registrada', async () => {
    // 1. Programamos una visita a las 14:00 - 15:00
    const scheduled = await scheduleVisitAction({
      technicianId,
      siteId: siteRozas,
      date: testDate,
      startTime: '14:00',
      durationMinutes: 60,
      notes: 'Visita a cancelar',
    });

    expect(scheduled.success).toBe(true);
    const visitId = scheduled.data!.id;

    // 2. Cancelamos la visita
    const cancelResult = await cancelVisitAction(visitId);
    expect(cancelResult.success).toBe(true);
    expect(cancelResult.data?.status).toBe('CANCELLED');

    // 3. Verificamos que permanece en el listado
    const allVisits = await getVisitsAction({ technicianId, date: testDate });
    const cancelledRecord = allVisits.find((v) => v.id === visitId);
    expect(cancelledRecord).toBeDefined();
    expect(cancelledRecord?.status).toBe('CANCELLED');

    // 4. Verificamos que el slot está LIBRE de inmediato:
    // Programamos otra visita en el MISMO horario exacto (14:00 - 15:00)
    const rebooked = await scheduleVisitAction({
      technicianId,
      siteId: sitePozuelo, // Incluso en otra obra
      date: testDate,
      startTime: '14:00',
      durationMinutes: 60,
    });

    expect(rebooked.success).toBe(true);
    expect(rebooked.data?.status).toBe('SCHEDULED');
  });

  it('reporta error claro si se intenta cancelar una visita inexistente', async () => {
    const result = await cancelVisitAction('visita-que-no-existe-xyz');
    expect(result.success).toBe(false);
    expect(result.error).toContain('no encontrada');
  });

  it('rechaza visitas fuera de jornada laboral (Regla C: < 08:00 o > 17:00)', async () => {
    const tooEarly = await scheduleVisitAction({
      technicianId,
      siteId: siteRozas,
      date: testDate,
      startTime: '07:30',
      durationMinutes: 45,
    });
    expect(tooEarly.success).toBe(false);
    expect(tooEarly.rule).toBe('RULE_C');
    expect(tooEarly.code).toBe('OUTSIDE_WORKING_HOURS');

    const tooLate = await scheduleVisitAction({
      technicianId,
      siteId: siteRozas,
      date: testDate,
      startTime: '16:30',
      durationMinutes: 60, // Finalizaría a las 17:30
    });
    expect(tooLate.success).toBe(false);
    expect(tooLate.rule).toBe('RULE_C');
    expect(tooLate.code).toBe('OUTSIDE_WORKING_HOURS');
  });

  it('verifica desplazamiento bidireccional al insertar una visita intermedia (Regla B)', async () => {
    const isolatedDate = '2026-11-20';
    // Visita 1: 08:30 - 09:30 (siteRozas)
    await scheduleVisitAction({
      technicianId,
      siteId: siteRozas,
      date: isolatedDate,
      startTime: '08:30',
      durationMinutes: 60,
    });

    // Visita 2: 12:00 - 13:00 (sitePozuelo)
    await scheduleVisitAction({
      technicianId,
      siteId: sitePozuelo,
      date: isolatedDate,
      startTime: '12:00',
      durationMinutes: 60,
    });

    // Intento de inserción en otra obra (siteRozas) de 11:45 a 12:45 -> solaparía
    // Intento de inserción en siteRozas de 10:00 a 11:45 -> fin 11:45, gap con 12:00 es 15 min (< 30 min)
    const failNextDirection = await scheduleVisitAction({
      technicianId,
      siteId: siteRozas,
      date: isolatedDate,
      startTime: '10:00',
      durationMinutes: 105, // Fin a las 11:45 -> Solo 15 min de margen hacia Pozuelo
    });

    expect(failNextDirection.success).toBe(false);
    expect(failNextDirection.rule).toBe('RULE_B');
    expect(failNextDirection.code).toBe('INSUFFICIENT_TRAVEL_TIME');
    expect((failNextDirection.details as { direction?: string })?.direction).toBe('NEXT');

    // Inserción válida con 30 min de margen a ambos lados: 10:00 a 11:00
    // Gap anterior: 10:00 - 09:30 = 30 min (OK)
    // Gap posterior: 12:00 - 11:00 = 60 min (OK)
    const validBetween = await scheduleVisitAction({
      technicianId,
      siteId: siteRozas,
      date: isolatedDate,
      startTime: '10:00',
      durationMinutes: 60,
    });

    expect(validBetween.success).toBe(true);
  });

  it('carga datos iniciales completos estructurados', async () => {
    const initialData = await getInitialDataAction();
    expect(initialData.technicians.length).toBeGreaterThan(0);
    expect(initialData.sites.length).toBeGreaterThan(0);
    expect(initialData.visits.length).toBeGreaterThan(0);
  });
});
