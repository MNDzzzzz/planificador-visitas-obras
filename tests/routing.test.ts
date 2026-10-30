import { describe, it, expect } from 'vitest';
import {
  getOfflineTravelEstimate,
  getTravelEstimate,
  calculateHaversineDistanceKm,
  estimateDrivingMinutesFromDistance,
  officialSites,
  DEFAULT_BUFFER_MINUTES,
  ROAD_TORTUOSITY_FACTOR,
} from '../lib/geo/routing';
import { validateVisitScheduling } from '../lib/validation/rules';
import { getEstimatedTravelAction } from '../lib/actions/visits';
import { SiteDTO, VisitDTO } from '../lib/types';

describe('Servicio de Rutas, Geolocalización y Traslado Dinámico (Regla B)', () => {
  const terrassaSite = officialSites.find((s) => s.id === 'site-terrassa-nord')!;
  const sabadellSite = officialSites.find((s) => s.id === 'site-sabadell-centre')!;
  const rubiSite = officialSites.find((s) => s.id === 'site-rubi-industrial')!;
  const santCugatSite = officialSites.find((s) => s.id === 'site-santcugat-parc')!;
  const granollersSite = officialSites.find((s) => s.id === 'site-granollers-est')!;
  const mataroSite = officialSites.find((s) => s.id === 'site-mataro-mar')!;

  describe('Cálculo Geodésico y Cinemático Haversine con Tortuosidad Vial 1.32', () => {
    it('calcula distancia geodésica coherente entre Terrassa y Sabadell (~8-10 km en línea recta)', () => {
      const dist = calculateHaversineDistanceKm(
        terrassaSite.latitude!,
        terrassaSite.longitude!,
        sabadellSite.latitude!,
        sabadellSite.longitude!
      );
      expect(dist).toBeGreaterThan(5);
      expect(dist).toBeLessThan(12);
    });

    it('la constante ROAD_TORTUOSITY_FACTOR está fijada estrictamente en 1.32', () => {
      expect(ROAD_TORTUOSITY_FACTOR).toBe(1.32);
    });

    it('calcula la distancia vial aplicando exactamente el factor de tortuosidad 1.32 sobre la distancia geodésica', () => {
      // Vic a Manresa (municipios reales de Cataluña fuera de la matriz interurbana)
      const vicCoords = { lat: 41.9304, lon: 2.2543 };
      const manresaCoords = { lat: 41.7289, lon: 1.8266 };

      const geoKm = calculateHaversineDistanceKm(
        vicCoords.lat,
        vicCoords.lon,
        manresaCoords.lat,
        manresaCoords.lon
      );
      const expectedRoadKm = Math.round(geoKm * ROAD_TORTUOSITY_FACTOR * 10) / 10;

      const vicSite: SiteDTO = {
        id: 'site-vic',
        name: 'Obra Vic Osona',
        municipality: 'Vic',
        address: 'Rambla Hospital 10',
        latitude: vicCoords.lat,
        longitude: vicCoords.lon,
      };

      const manresaSite: SiteDTO = {
        id: 'site-manresa',
        name: 'Nau Bages Manresa',
        municipality: 'Manresa',
        address: 'Carretera de Cardona 40',
        latitude: manresaCoords.lat,
        longitude: manresaCoords.lon,
      };

      const estimate = getOfflineTravelEstimate(vicSite, manresaSite);
      expect(estimate.distanceKm).toBe(expectedRoadKm);
      expect(estimate.provider).toBe('haversine');
      expect(estimate.routeSummary).toContain('Ruta calculada por geolocalización');
    });

    it('aplica el modelo cinemático de velocidades medias según la distancia del tramo', () => {
      // > 20 km -> 68 km/h (Autovía)
      const distHighway = 34; // 34 km / 68 km/h = 0.5 h = 30 min
      expect(estimateDrivingMinutesFromDistance(distHighway)).toBe(30);

      // Entre 7 y 20 km -> 48 km/h (Vía rápida / periurbana)
      const distPeriurban = 16; // 16 km / 48 km/h = 0.333 h = 20 min
      expect(estimateDrivingMinutesFromDistance(distPeriurban)).toBe(20);

      // <= 7 km -> 35 km/h (Urbano denso)
      const distUrban = 3.5; // 3.5 km / 35 km/h = 0.1 h = 6 min
      expect(estimateDrivingMinutesFromDistance(distUrban)).toBe(6);

      // Distancia mínima con conducción piso de 5 minutos
      const distMinimal = 0.5; // 0.5 km / 35 km/h = ~1 min -> piso 5 min
      expect(estimateDrivingMinutesFromDistance(distMinimal)).toBe(5);

      // Desplazamiento nulo
      expect(estimateDrivingMinutesFromDistance(0.01)).toBe(0);
    });
  });

  describe('Buffer Estricto de 5 Minutos (Estacionamiento, Descarga y Custodia de Probetas)', () => {
    it('la constante DEFAULT_BUFFER_MINUTES está definida estrictamente en 5 minutos', () => {
      expect(DEFAULT_BUFFER_MINUTES).toBe(5);
    });

    it('suma exactamente 5 minutos de buffer al tiempo de conducción en rutas de matriz', () => {
      const estimate = getOfflineTravelEstimate(terrassaSite, sabadellSite);
      expect(estimate.drivingMinutes).toBe(14);
      expect(estimate.bufferMinutes).toBe(5);
      expect(estimate.totalRequiredMinutes).toBe(19);
    });

    it('permite parametrizar el buffer y suma el valor especificado', () => {
      const estimateWith10 = getOfflineTravelEstimate(terrassaSite, sabadellSite, 10);
      expect(estimateWith10.drivingMinutes).toBe(14);
      expect(estimateWith10.bufferMinutes).toBe(10);
      expect(estimateWith10.totalRequiredMinutes).toBe(24);

      const estimateWith0 = getOfflineTravelEstimate(terrassaSite, sabadellSite, 0);
      expect(estimateWith0.drivingMinutes).toBe(14);
      expect(estimateWith0.bufferMinutes).toBe(0);
      expect(estimateWith0.totalRequiredMinutes).toBe(14);
    });

    it('el buffer es estrictamente 0 en la misma obra (same-site) sin importar el buffer parametrizado', () => {
      const estimateSame = getOfflineTravelEstimate(terrassaSite, terrassaSite, 15);
      expect(estimateSame.drivingMinutes).toBe(0);
      expect(estimateSame.bufferMinutes).toBe(0);
      expect(estimateSame.totalRequiredMinutes).toBe(0);
      expect(estimateSame.provider).toBe('same-site');
    });
  });

  describe('Matriz Calibrada Offline (Vallès y Cataluña)', () => {
    it('devuelve 0 min para la misma obra (same-site)', () => {
      const estimate = getOfflineTravelEstimate(terrassaSite, terrassaSite);
      expect(estimate.drivingMinutes).toBe(0);
      expect(estimate.bufferMinutes).toBe(0);
      expect(estimate.totalRequiredMinutes).toBe(0);
      expect(estimate.distanceKm).toBe(0);
      expect(estimate.provider).toBe('same-site');
    });

    it('calcula tiempo calibrado entre Terrassa y Sabadell (14 min conducción + 5 min buffer = 19 min)', () => {
      const estimate = getOfflineTravelEstimate(terrassaSite, sabadellSite);
      expect(estimate.drivingMinutes).toBe(14);
      expect(estimate.bufferMinutes).toBe(5);
      expect(estimate.totalRequiredMinutes).toBe(19);
      expect(estimate.distanceKm).toBe(10.5);
      expect(estimate.provider).toBe('offline-matrix');
      expect(estimate.routeSummary).toContain('C-58');
    });

    it('calcula tiempo calibrado entre Terrassa y Rubí (15 min conducción + 5 min buffer = 20 min)', () => {
      const estimate = getOfflineTravelEstimate(terrassaSite, rubiSite);
      expect(estimate.drivingMinutes).toBe(15);
      expect(estimate.bufferMinutes).toBe(5);
      expect(estimate.totalRequiredMinutes).toBe(20);
      expect(estimate.distanceKm).toBe(11.2);
      expect(estimate.provider).toBe('offline-matrix');
      expect(estimate.routeSummary).toContain('C-16');
    });

    it('calcula tiempo calibrado simétrico entre Sabadell y Rubí (16 min conducción + 5 min buffer = 21 min)', () => {
      const estimateForward = getOfflineTravelEstimate(sabadellSite, rubiSite);
      const estimateReverse = getOfflineTravelEstimate(rubiSite, sabadellSite);

      expect(estimateForward.drivingMinutes).toBe(16);
      expect(estimateForward.totalRequiredMinutes).toBe(21);
      expect(estimateReverse.drivingMinutes).toBe(16);
      expect(estimateReverse.totalRequiredMinutes).toBe(21);
      expect(estimateForward.routeSummary).toContain('AP-7');
    });

    it('calcula tiempo calibrado entre Sabadell y Sant Cugat (17 min + 5 min buffer = 22 min)', () => {
      const estimate = getOfflineTravelEstimate(sabadellSite, santCugatSite);
      expect(estimate.drivingMinutes).toBe(17);
      expect(estimate.bufferMinutes).toBe(5);
      expect(estimate.totalRequiredMinutes).toBe(22);
      expect(estimate.provider).toBe('offline-matrix');
      expect(estimate.routeSummary).toContain('AP-7');
    });

    it('calcula tiempo calibrado entre Granollers y Mataró vía Túnel de Parpers (18 min + 5 min = 23 min)', () => {
      const estimate = getOfflineTravelEstimate(granollersSite, mataroSite);
      expect(estimate.drivingMinutes).toBe(18);
      expect(estimate.bufferMinutes).toBe(5);
      expect(estimate.totalRequiredMinutes).toBe(23);
      expect(estimate.routeSummary).toContain('C-60');
    });
  });

  describe('Municipios Fuera de la Matriz (Cinemática Haversine con Tortuosidad 1.32)', () => {
    it('resuelve trayecto interurbano no tabulado mediante Haversine + tortuosidad 1.32 (Vic a Manresa)', () => {
      const vicSite: SiteDTO = {
        id: 'site-vic-osona',
        name: 'Pavelló Esportiu Vic',
        municipality: 'Vic',
        address: 'Carrer de Sant Pere 12',
        latitude: 41.9304,
        longitude: 2.2543,
      };

      const manresaSite: SiteDTO = {
        id: 'site-manresa-centre',
        name: 'Edifici Tecnològic Manresa',
        municipality: 'Manresa',
        address: 'Passeig de Pere III 80',
        latitude: 41.7289,
        longitude: 1.8266,
      };

      const estimate = getOfflineTravelEstimate(vicSite, manresaSite);
      expect(estimate.provider).toBe('haversine');
      expect(estimate.drivingMinutes).toBeGreaterThan(30);
      expect(estimate.bufferMinutes).toBe(5);
      expect(estimate.totalRequiredMinutes).toBe(estimate.drivingMinutes + 5);
      expect(estimate.distanceKm).toBeGreaterThan(40);
    });

    it('resuelve trayecto periurbano no tabulado (7 < roadKm <= 20) aplicando velocidad de 48 km/h', () => {
      // Coordenadas sintéticas separadas aproximadamente 9 km geodésicos -> ~11.9 km viales
      const siteOrigin: SiteDTO = {
        id: 'site-girona-peri-1',
        name: 'Polígon Salt',
        municipality: 'Salt',
        address: 'Carrer Major 50',
        latitude: 41.9750,
        longitude: 2.7800,
      };

      const siteDest: SiteDTO = {
        id: 'site-girona-peri-2',
        name: 'Nau Cassà',
        municipality: 'Cassa de la Selva',
        address: 'Carretera Provincial 2',
        latitude: 41.8850,
        longitude: 2.8750,
      };

      const estimate = getOfflineTravelEstimate(siteOrigin, siteDest);
      expect(estimate.provider).toBe('haversine');
      expect(estimate.distanceKm).toBeGreaterThan(7);
      expect(estimate.distanceKm).toBeLessThanOrEqual(20);
      expect(estimate.bufferMinutes).toBe(5);
      expect(estimate.totalRequiredMinutes).toBe(estimate.drivingMinutes + 5);
    });
  });

  describe('Fallbacks Seguros ante Obras Sin Coordenadas o Datos Faltantes', () => {
    it('aplica fallback a 30 min normativos (25 min conducción + 5 min buffer) si las obras no tienen coordenadas ni matriz', () => {
      const dummyA: SiteDTO = { id: 'dummy-1', name: 'Obra X', municipality: 'Pueblo Remoto', address: 'Calle 1' };
      const dummyB: SiteDTO = { id: 'dummy-2', name: 'Obra Y', municipality: 'Pueblo Distante', address: 'Calle 2' };
      const estimate = getOfflineTravelEstimate(dummyA, dummyB);

      expect(estimate.totalRequiredMinutes).toBe(30);
      expect(estimate.drivingMinutes).toBe(25);
      expect(estimate.bufferMinutes).toBe(5);
      expect(estimate.distanceKm).toBe(18.0);
      expect(estimate.provider).toBe('haversine');
      expect(estimate.routeSummary).toContain('Margen estándar por defecto');
    });

    it('aplica fallback normativo de 30 min si el origen tiene coordenadas pero el destino NO', () => {
      const dummyWithoutCoords: SiteDTO = {
        id: 'dummy-no-coords',
        name: 'Obra Sin GPS',
        municipality: 'Población Desconocida',
        address: 'Camino Rural s/n',
      };

      const estimate = getOfflineTravelEstimate(terrassaSite, dummyWithoutCoords);
      expect(estimate.totalRequiredMinutes).toBe(30);
      expect(estimate.provider).toBe('haversine');
    });

    it('aplica fallback normativo de 30 min si el origen NO tiene coordenadas pero el destino SÍ', () => {
      const dummyWithoutCoords: SiteDTO = {
        id: 'dummy-no-coords-2',
        name: 'Obra Sin GPS 2',
        municipality: 'Población Desconocida 2',
        address: 'Polígono Sin Número',
      };

      const estimate = getOfflineTravelEstimate(dummyWithoutCoords, sabadellSite);
      expect(estimate.totalRequiredMinutes).toBe(30);
      expect(estimate.provider).toBe('haversine');
    });

    it('gestiona con seguridad municipios vacíos, nulos o desconocidos sin lanzar excepciones runtime', () => {
      const emptySiteA: SiteDTO = {
        id: 'empty-1',
        name: 'Obra Sin Municipio A',
        municipality: '',
        address: 'Dirección A',
      };

      const unknownSiteB: SiteDTO = {
        id: 'unknown-2',
        name: 'Obra Municipio Desconocido B',
        municipality: 'Desconocido',
        address: 'Dirección B',
      };

      expect(() => getOfflineTravelEstimate(emptySiteA, unknownSiteB)).not.toThrow();
      const estimate = getOfflineTravelEstimate(emptySiteA, unknownSiteB);
      expect(estimate.totalRequiredMinutes).toBe(30);
    });

    it('resuelve trayecto intraurbano estándar (10 min conducción + 5 min buffer = 15 min) en el mismo municipio sin coordenadas', () => {
      const intraSite1: SiteDTO = {
        id: 'intra-t-1',
        name: 'Obra Centro Terrassa',
        municipality: 'Terrassa',
        address: 'Raval de Montserrat 14',
      };

      const intraSite2: SiteDTO = {
        id: 'intra-t-2',
        name: 'Obra Can Roca Terrassa',
        municipality: 'Terrassa',
        address: 'Avinguda del Parlament 5',
      };

      const estimate = getOfflineTravelEstimate(intraSite1, intraSite2);
      expect(estimate.drivingMinutes).toBe(10);
      expect(estimate.bufferMinutes).toBe(5);
      expect(estimate.totalRequiredMinutes).toBe(15);
      expect(estimate.provider).toBe('offline-matrix');
      expect(estimate.routeSummary).toContain('Trayecto urbano en Terrassa');
    });
  });

  describe('Casos de Visitas Consecutivas en la Misma Obra (0 min Requerido)', () => {
    const testDate = '2026-11-15';
    const technicianId = 'tech-carlos';

    it('getTravelEstimate async resuelve de inmediato sin invocar API para la misma obra', async () => {
      const res = await getTravelEstimate(sabadellSite, sabadellSite);
      expect(res.totalRequiredMinutes).toBe(0);
      expect(res.drivingMinutes).toBe(0);
      expect(res.bufferMinutes).toBe(0);
      expect(res.provider).toBe('same-site');
    });

    it('permite programar visitas consecutivas en la misma obra con exactamente 0 minutos de separación', () => {
      const existingVisits: VisitDTO[] = [
        {
          id: 'v-terrassa-1',
          technicianId,
          siteId: terrassaSite.id,
          site: terrassaSite,
          date: testDate,
          startTime: '09:00',
          durationMinutes: 60,
          endTime: '10:00',
          status: 'SCHEDULED',
        },
      ];

      const sitesMap = new Map<string, SiteDTO>([[terrassaSite.id, terrassaSite]]);

      // Nueva visita en la MISMA obra Terrassa de 10:00 a 11:00 (0 min de margen)
      const result = validateVisitScheduling({
        newVisit: {
          technicianId,
          siteId: terrassaSite.id,
          date: testDate,
          startTime: '10:00',
          durationMinutes: 60,
        },
        existingVisits,
        sitesMap,
      });

      expect(result.isValid).toBe(true);
    });

    it('permite encadenar tres visitas consecutivas en la misma obra con 0 min de margen entre todas', () => {
      const visitEarly: VisitDTO = {
        id: 'v-terrassa-early',
        technicianId,
        siteId: terrassaSite.id,
        site: terrassaSite,
        date: testDate,
        startTime: '08:30',
        durationMinutes: 60,
        endTime: '09:30',
        status: 'SCHEDULED',
      };

      const visitLate: VisitDTO = {
        id: 'v-terrassa-late',
        technicianId,
        siteId: terrassaSite.id,
        site: terrassaSite,
        date: testDate,
        startTime: '10:30',
        durationMinutes: 60,
        endTime: '11:30',
        status: 'SCHEDULED',
      };

      const sitesMap = new Map<string, SiteDTO>([[terrassaSite.id, terrassaSite]]);

      // Inserción en la misma obra de 09:30 a 10:30 (0 min con early y 0 min con late)
      const result = validateVisitScheduling({
        newVisit: {
          technicianId,
          siteId: terrassaSite.id,
          date: testDate,
          startTime: '09:30',
          durationMinutes: 60,
        },
        existingVisits: [visitEarly, visitLate],
        sitesMap,
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('Validación Bidireccional de la Regla B Dinámica (Sabadell - Terrassa - Rubí)', () => {
    const testDate = '2026-11-15';
    const technicianId = 'tech-carlos';

    const sitesMap = new Map<string, SiteDTO>([
      [sabadellSite.id, sabadellSite],
      [terrassaSite.id, terrassaSite],
      [rubiSite.id, rubiSite],
    ]);

    // Visita 1 previa: Sabadell de 08:30 a 09:30 (fin a las 09:30). Requiere 19 min hacia Terrassa.
    const visitPrevSabadell: VisitDTO = {
      id: 'v-prev-sabadell',
      technicianId,
      siteId: sabadellSite.id,
      site: sabadellSite,
      date: testDate,
      startTime: '08:30',
      durationMinutes: 60,
      endTime: '09:30',
      status: 'SCHEDULED',
    };

    // Visita 3 posterior: Rubí de 13:00 a 14:00 (inicio a las 13:00). Requiere 20 min desde Terrassa hacia Rubí.
    const visitNextRubi: VisitDTO = {
      id: 'v-next-rubi',
      technicianId,
      siteId: rubiSite.id,
      site: rubiSite,
      date: testDate,
      startTime: '13:00',
      durationMinutes: 60,
      endTime: '14:00',
      status: 'SCHEDULED',
    };

    const existingVisits = [visitPrevSabadell, visitNextRubi];

    it('permite visita intermedia en Terrassa con margen holgado en ambas direcciones (10:00 a 11:30)', () => {
      // Gap con Sabadell: 10:00 - 09:30 = 30 min (>= 19 min requerido) -> OK
      // Gap con Rubí: 13:00 - 11:30 = 90 min (>= 20 min requerido) -> OK
      const result = validateVisitScheduling({
        newVisit: {
          technicianId,
          siteId: terrassaSite.id,
          date: testDate,
          startTime: '10:00',
          durationMinutes: 90, // Fin: 11:30
        },
        existingVisits,
        sitesMap,
      });

      expect(result.isValid).toBe(true);
    });

    it('permite visita intermedia en Terrassa en la frontera EXACTA del margen anterior (19 min con Sabadell: 09:49 a 11:00)', () => {
      // Gap anterior: 09:49 - 09:30 = exactamente 19 min (== 19 min requerido) -> OK
      // Gap posterior: 13:00 - 11:00 = 120 min (>= 20 min requerido) -> OK
      const result = validateVisitScheduling({
        newVisit: {
          technicianId,
          siteId: terrassaSite.id,
          date: testDate,
          startTime: '09:49',
          durationMinutes: 71, // Fin: 11:00
        },
        existingVisits,
        sitesMap,
      });

      expect(result.isValid).toBe(true);
    });

    it('rechaza visita intermedia en Terrassa en la frontera OFF-BY-ONE anterior (18 min con Sabadell: 09:48 a 11:00)', () => {
      // Gap anterior: 09:48 - 09:30 = 18 min (< 19 min requerido) -> FAILS PREVIOUS
      const result = validateVisitScheduling({
        newVisit: {
          technicianId,
          siteId: terrassaSite.id,
          date: testDate,
          startTime: '09:48',
          durationMinutes: 72, // Fin: 11:00
        },
        existingVisits,
        sitesMap,
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_B');
        expect(result.code).toBe('INSUFFICIENT_TRAVEL_TIME');
        expect(result.details?.direction).toBe('PREVIOUS');
        expect(result.details?.requiredGapMinutes).toBe(19);
        expect(result.details?.actualGapMinutes).toBe(18);
        expect(result.details?.conflictingSiteName).toBe('Residencial Parc Central Sabadell');
        expect(result.message).toContain('19 minutos');
        expect(result.message).toContain('14 min conducción + 5 min margen');
      }
    });

    it('permite visita intermedia en Terrassa en la frontera EXACTA del margen posterior (20 min con Rubí: 10:30 a 12:40)', () => {
      // Gap anterior: 10:30 - 09:30 = 60 min (>= 19 min requerido) -> OK
      // Gap posterior: 13:00 - 12:40 = exactamente 20 min (== 20 min requerido para Terrassa -> Rubí) -> OK
      const result = validateVisitScheduling({
        newVisit: {
          technicianId,
          siteId: terrassaSite.id,
          date: testDate,
          startTime: '10:30',
          durationMinutes: 130, // Fin: 12:40
        },
        existingVisits,
        sitesMap,
      });

      expect(result.isValid).toBe(true);
    });

    it('rechaza visita intermedia en Terrassa en la frontera OFF-BY-ONE posterior (19 min con Rubí: 10:30 a 12:41)', () => {
      // Gap anterior: 10:30 - 09:30 = 60 min (>= 19 min requerido) -> OK
      // Gap posterior: 13:00 - 12:41 = 19 min (< 20 min requerido para Terrassa -> Rubí) -> FAILS NEXT
      const result = validateVisitScheduling({
        newVisit: {
          technicianId,
          siteId: terrassaSite.id,
          date: testDate,
          startTime: '10:30',
          durationMinutes: 131, // Fin: 12:41
        },
        existingVisits,
        sitesMap,
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.rule).toBe('RULE_B');
        expect(result.code).toBe('INSUFFICIENT_TRAVEL_TIME');
        expect(result.details?.direction).toBe('NEXT');
        expect(result.details?.requiredGapMinutes).toBe(20);
        expect(result.details?.actualGapMinutes).toBe(19);
        expect(result.details?.conflictingSiteName).toBe('Polígon Industrial La Llana (Nau Logística)');
        expect(result.message).toContain('20 minutos');
        expect(result.message).toContain('15 min conducción + 5 min margen');
        expect(result.message).toContain('C-16');
      }
    });

    it('evalúa en orden estricto PREVIOUS primero si ambos sentidos incumplen', () => {
      // Inicio 09:40 (gap 10 min < 19 min con Sabadell)
      // Fin 12:50 (gap 10 min < 20 min con Rubí)
      const result = validateVisitScheduling({
        newVisit: {
          technicianId,
          siteId: terrassaSite.id,
          date: testDate,
          startTime: '09:40',
          durationMinutes: 190, // Fin: 12:50
        },
        existingVisits,
        sitesMap,
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.details?.direction).toBe('PREVIOUS');
        expect(result.details?.requiredGapMinutes).toBe(19);
      }
    });
  });

  describe('Server Action: getEstimatedTravelAction', () => {
    it('calcula estimación completa entre obras oficiales', async () => {
      const result = await getEstimatedTravelAction(terrassaSite.id, sabadellSite.id);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.drivingMinutes).toBe(14);
      expect(result.data?.bufferMinutes).toBe(5);
      expect(result.data?.totalRequiredMinutes).toBe(19);
      expect(result.data?.distanceKm).toBe(10.5);
    });

    it('devuelve estimación same-site para misma obra con 0 min requeridos', async () => {
      const result = await getEstimatedTravelAction(terrassaSite.id, terrassaSite.id);
      expect(result.success).toBe(true);
      expect(result.data?.totalRequiredMinutes).toBe(0);
      expect(result.data?.drivingMinutes).toBe(0);
      expect(result.data?.bufferMinutes).toBe(0);
      expect(result.data?.provider).toBe('same-site');
    });

    it('devuelve error si los IDs de obra son inválidos o vacíos', async () => {
      const result1 = await getEstimatedTravelAction('', sabadellSite.id);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('especificar');

      const result2 = await getEstimatedTravelAction(terrassaSite.id, '');
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('especificar');
    });

    it('devuelve error si una obra no existe en los registros', async () => {
      const result = await getEstimatedTravelAction('obra-inexistente-xyz', sabadellSite.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('no fueron encontradas');
    });
  });
});
