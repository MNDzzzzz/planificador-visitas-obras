/**
 * Servicio de Rutas, Geolocalización y Cálculo Dinámico de Tiempos de Traslado
 * Integra Google Maps Distance Matrix API con fallback transparente a matriz calibrada
 * de municipios del Vallès / Cataluña y cinemática Haversine con tortuosidad vial.
 */

import { SiteDTO, TravelEstimate } from '../types';

// Buffer estándar de tiempo logístico para aparcamiento, descarga y custodia de probetas
export const DEFAULT_BUFFER_MINUTES = 5;

// Tortuosidad vial media para carreteras metropolitanas (distancia real / geodésica)
export const ROAD_TORTUOSITY_FACTOR = 1.32;

/**
 * Catálogo maestro de obras con geolocalización GPS real
 */
export const officialSites: SiteDTO[] = [
  // Vallès Occidental, Oriental y Área Metropolitana de Barcelona
  {
    id: 'site-terrassa-nord',
    name: 'Hospital Universitari de Terrassa (Ampliación)',
    municipality: 'Terrassa',
    address: 'Carretera de Torrebonica s/n',
    latitude: 41.5642,
    longitude: 2.0468,
  },
  {
    id: 'site-sabadell-centre',
    name: 'Residencial Parc Central Sabadell',
    municipality: 'Sabadell',
    address: 'Carrer de Francesc Eiximenis 24',
    latitude: 41.5431,
    longitude: 2.1124,
  },
  {
    id: 'site-rubi-industrial',
    name: 'Polígon Industrial La Llana (Nau Logística)',
    municipality: 'Rubí',
    address: 'Passeig de la Riera 142',
    latitude: 41.4982,
    longitude: 2.0256,
  },
  {
    id: 'site-santcugat-parc',
    name: 'Edifici Corporatiu Sant Cugat Trade Center',
    municipality: 'Sant Cugat del Vallès',
    address: 'Avinguda de les Corts Catalanes 8',
    latitude: 41.4746,
    longitude: 2.0782,
  },
  {
    id: 'site-granollers-est',
    name: 'Complex Esportiu i Cívic Granollers Nord',
    municipality: 'Granollers',
    address: 'Carrer de Girona 88',
    latitude: 41.6145,
    longitude: 2.2934,
  },
  {
    id: 'site-barcelona-22at',
    name: 'Torre d’Oficines i R+D Districte 22@',
    municipality: 'Barcelona',
    address: 'Carrer de Pallars 180',
    latitude: 41.4018,
    longitude: 2.1963,
  },
  {
    id: 'site-mataro-mar',
    name: 'Promoció Habitatges Port de Mataró',
    municipality: 'Mataró',
    address: 'Passeig Marítim 32',
    latitude: 41.5342,
    longitude: 2.4489,
  },

  // Obras de compatibilidad con coordenadas
  {
    id: 'site-rozas',
    name: 'Residencial Monte Rozas',
    municipality: 'Las Rozas de Madrid',
    address: 'Calle Camilo José Cela 14',
    latitude: 40.4925,
    longitude: -3.8741,
  },
  {
    id: 'site-pozuelo',
    name: 'Parque Empresarial Mirador',
    municipality: 'Pozuelo de Alarcón',
    address: 'Vía de las Dos Castillas 33',
    latitude: 40.4354,
    longitude: -3.8136,
  },
  {
    id: 'site-getafe',
    name: 'Polígono Logístico Los Gavilanes',
    municipality: 'Getafe',
    address: 'Avenida de las Trece Rosas 8',
    latitude: 40.3082,
    longitude: -3.7327,
  },
  {
    id: 'site-alcobendas',
    name: 'Edificio Sanitario Norte',
    municipality: 'Alcobendas',
    address: 'Paseo de la Chopera 45',
    latitude: 40.5475,
    longitude: -3.6421,
  },
  {
    id: 'site-alcala',
    name: 'Rehabilitación Edificio Siglo XVIII',
    municipality: 'Alcalá de Henares',
    address: 'Calle Mayor 62',
    latitude: 40.4820,
    longitude: -3.3599,
  },
  {
    id: 'site-sanse',
    name: 'Centro Tecnológico Infantas',
    municipality: 'San Sebastián de los Reyes',
    address: 'Avenida de Europa 12',
    latitude: 40.5470,
    longitude: -3.6260,
  },
];

/**
 * Matriz estática de tiempos de conducción y distancias interurbanas calibradas
 * Estructura de clave simétrica: "MUNICIPIO_A|MUNICIPIO_B"
 */
interface MatrixRouteData {
  drivingMinutes: number;
  distanceKm: number;
  roadName: string;
}

const INTERURBAN_MATRIX: Record<string, MatrixRouteData> = {
  // Vallès y Cataluña
  'TERRASSA|SABADELL': { drivingMinutes: 14, distanceKm: 10.5, roadName: 'C-58' },
  'TERRASSA|RUBI': { drivingMinutes: 15, distanceKm: 11.2, roadName: 'C-16' },
  'TERRASSA|SANT CUGAT DEL VALLES': { drivingMinutes: 19, distanceKm: 17.8, roadName: 'C-16 / B-30' },
  'TERRASSA|GRANOLLERS': { drivingMinutes: 27, distanceKm: 31.5, roadName: 'C-155 / AP-7' },
  'TERRASSA|BARCELONA': { drivingMinutes: 32, distanceKm: 33.2, roadName: 'C-58 / B-20' },
  'TERRASSA|MATARO': { drivingMinutes: 40, distanceKm: 48.0, roadName: 'C-60 / C-32' },

  'SABADELL|RUBI': { drivingMinutes: 16, distanceKm: 13.9, roadName: 'B-30 / AP-7' },
  'SABADELL|SANT CUGAT DEL VALLES': { drivingMinutes: 17, distanceKm: 15.1, roadName: 'AP-7 / B-30' },
  'SABADELL|GRANOLLERS': { drivingMinutes: 22, distanceKm: 22.4, roadName: 'AP-7 / C-35' },
  'SABADELL|BARCELONA': { drivingMinutes: 26, distanceKm: 25.8, roadName: 'C-58' },
  'SABADELL|MATARO': { drivingMinutes: 35, distanceKm: 40.2, roadName: 'C-60' },

  'RUBI|SANT CUGAT DEL VALLES': { drivingMinutes: 11, distanceKm: 7.4, roadName: 'BP-1503' },
  'RUBI|GRANOLLERS': { drivingMinutes: 28, distanceKm: 34.6, roadName: 'AP-7' },
  'RUBI|BARCELONA': { drivingMinutes: 26, distanceKm: 24.3, roadName: 'Túnels de Vallvidrera' },
  'RUBI|MATARO': { drivingMinutes: 42, distanceKm: 50.1, roadName: 'AP-7 / C-60' },

  'SANT CUGAT DEL VALLES|GRANOLLERS': { drivingMinutes: 27, distanceKm: 32.8, roadName: 'AP-7' },
  'SANT CUGAT DEL VALLES|BARCELONA': { drivingMinutes: 22, distanceKm: 18.2, roadName: 'B-20 / Túnels' },
  'SANT CUGAT DEL VALLES|MATARO': { drivingMinutes: 38, distanceKm: 46.5, roadName: 'AP-7 / C-60' },

  'GRANOLLERS|BARCELONA': { drivingMinutes: 28, distanceKm: 30.1, roadName: 'C-33 / C-17' },
  'GRANOLLERS|MATARO': { drivingMinutes: 18, distanceKm: 17.6, roadName: 'C-60 Túnel de Parpers' },

  'BARCELONA|MATARO': { drivingMinutes: 28, distanceKm: 31.4, roadName: 'C-31 / C-32' },

  // Madrid
  'LAS ROZAS DE MADRID|POZUELO DE ALARCON': { drivingMinutes: 14, distanceKm: 12.2, roadName: 'M-503 / A-6' },
  'LAS ROZAS DE MADRID|ALCOBENDAS': { drivingMinutes: 24, distanceKm: 28.5, roadName: 'M-40' },
  'LAS ROZAS DE MADRID|GETAFE': { drivingMinutes: 28, distanceKm: 35.1, roadName: 'M-50' },
  'LAS ROZAS DE MADRID|ALCALA DE HENARES': { drivingMinutes: 42, distanceKm: 54.3, roadName: 'M-40 / A-2' },
  'LAS ROZAS DE MADRID|SAN SEBASTIAN DE LOS REYES': { drivingMinutes: 25, distanceKm: 29.2, roadName: 'M-40' },

  'POZUELO DE ALARCON|GETAFE': { drivingMinutes: 22, distanceKm: 24.0, roadName: 'M-40' },
  'POZUELO DE ALARCON|ALCOBENDAS': { drivingMinutes: 23, distanceKm: 26.8, roadName: 'M-40' },
  'ALCOBENDAS|SAN SEBASTIAN DE LOS REYES': { drivingMinutes: 8, distanceKm: 3.2, roadName: 'Avenida de España' },
};

/**
 * Normaliza nombres de municipio para indexar la matriz
 */
function normalizeMunicipality(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Cálculo geodésico Haversine en kilómetros entre dos coordenadas
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimador cinemático de tiempo de conducción a partir de distancia vial
 */
export function estimateDrivingMinutesFromDistance(distanceKm: number): number {
  if (distanceKm <= 0.05) return 0;

  // Modelo de velocidad media según tipología de trayecto
  let avgSpeedKmh = 35; // Urbano denso
  if (distanceKm > 20) {
    avgSpeedKmh = 68; // Autovía / autopista interurbana
  } else if (distanceKm > 7) {
    avgSpeedKmh = 48; // Vía rápida periurbana / circunvalación
  }

  const drivingHours = distanceKm / avgSpeedKmh;
  return Math.max(5, Math.ceil(drivingHours * 60));
}

/**
 * Genera estimación de traslado en modo Offline (Matriz calibrada + Haversine cinemático)
 */
export function getOfflineTravelEstimate(
  originSite: SiteDTO,
  destSite: SiteDTO,
  bufferMinutes: number = DEFAULT_BUFFER_MINUTES
): TravelEstimate {
  // Caso 1: Misma obra
  if (originSite.id === destSite.id) {
    return {
      originSite,
      destSite,
      drivingMinutes: 0,
      bufferMinutes: 0,
      totalRequiredMinutes: 0,
      distanceKm: 0,
      provider: 'same-site',
      routeSummary: 'Misma obra (desplazamiento nulo)',
    };
  }

  const munA = normalizeMunicipality(originSite.municipality || '');
  const munB = normalizeMunicipality(destSite.municipality || '');

  const hasValidMunicipality =
    munA.length > 0 &&
    munB.length > 0 &&
    munA !== 'DESCONOCIDO' &&
    munB !== 'DESCONOCIDO';

  // Caso 2: Mismo municipio, obras distintas
  if (hasValidMunicipality && munA === munB) {
    // Si tienen coordenadas, calcular Haversine con tortuosidad
    if (
      originSite.latitude &&
      originSite.longitude &&
      destSite.latitude &&
      destSite.longitude
    ) {
      const geoKm = calculateHaversineDistanceKm(
        originSite.latitude,
        originSite.longitude,
        destSite.latitude,
        destSite.longitude
      );
      const roadKm = Math.round(geoKm * ROAD_TORTUOSITY_FACTOR * 10) / 10;
      const drivingMinutes = estimateDrivingMinutesFromDistance(roadKm);
      const totalRequiredMinutes = drivingMinutes + bufferMinutes;

      return {
        originSite,
        destSite,
        drivingMinutes,
        bufferMinutes,
        totalRequiredMinutes,
        distanceKm: roadKm,
        provider: 'offline-matrix',
        routeSummary: `Trayecto urbano en ${originSite.municipality} (~${roadKm} km)`,
      };
    }

    // Sin coordenadas: trayecto intraurbano estándar (10 min conducción + buffer)
    return {
      originSite,
      destSite,
      drivingMinutes: 10,
      bufferMinutes,
      totalRequiredMinutes: 10 + bufferMinutes,
      distanceKm: 4.5,
      provider: 'offline-matrix',
      routeSummary: `Trayecto urbano en ${originSite.municipality}`,
    };
  }

  // Caso 3: Matriz interurbana calibrada
  const key1 = `${munA}|${munB}`;
  const key2 = `${munB}|${munA}`;
  const matrixEntry = INTERURBAN_MATRIX[key1] || INTERURBAN_MATRIX[key2];

  if (matrixEntry) {
    const totalRequiredMinutes = matrixEntry.drivingMinutes + bufferMinutes;
    return {
      originSite,
      destSite,
      drivingMinutes: matrixEntry.drivingMinutes,
      bufferMinutes,
      totalRequiredMinutes,
      distanceKm: matrixEntry.distanceKm,
      provider: 'offline-matrix',
      routeSummary: `${matrixEntry.roadName} (${matrixEntry.distanceKm} km)`,
    };
  }

  // Caso 4: Fallback Haversine con coordenadas GPS
  if (
    originSite.latitude &&
    originSite.longitude &&
    destSite.latitude &&
    destSite.longitude
  ) {
    const geoKm = calculateHaversineDistanceKm(
      originSite.latitude,
      originSite.longitude,
      destSite.latitude,
      destSite.longitude
    );
    const roadKm = Math.round(geoKm * ROAD_TORTUOSITY_FACTOR * 10) / 10;
    const drivingMinutes = estimateDrivingMinutesFromDistance(roadKm);
    const totalRequiredMinutes = drivingMinutes + bufferMinutes;

    return {
      originSite,
      destSite,
      drivingMinutes,
      bufferMinutes,
      totalRequiredMinutes,
      distanceKm: roadKm,
      provider: 'haversine',
      routeSummary: `Ruta calculada por geolocalización (~${roadKm} km)`,
    };
  }

  // Caso 5: Fallback general por defecto (30 minutos normativos: 25 min + 5 min buffer)
  return {
    originSite,
    destSite,
    drivingMinutes: 25,
    bufferMinutes: 5,
    totalRequiredMinutes: 30,
    distanceKm: 18.0,
    provider: 'haversine',
    routeSummary: 'Margen estándar por defecto',
  };
}

/**
 * Consulta la API de Google Maps Distance Matrix si existe clave configurada;
 * en caso contrario o ante cualquier timeout o fallo HTTP, recurre al estimador offline.
 */
export async function getTravelEstimate(
  originSite: SiteDTO,
  destSite: SiteDTO,
  bufferMinutes: number = DEFAULT_BUFFER_MINUTES
): Promise<TravelEstimate> {
  // Misma obra
  if (originSite.id === destSite.id) {
    return getOfflineTravelEstimate(originSite, destSite, bufferMinutes);
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey && apiKey.length > 10) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // Usar coordenadas o dirección normalizada
      const origins =
        originSite.latitude && originSite.longitude
          ? `${originSite.latitude},${originSite.longitude}`
          : encodeURIComponent(`${originSite.address}, ${originSite.municipality}`);

      const destinations =
        destSite.latitude && destSite.longitude
          ? `${destSite.latitude},${destSite.longitude}`
          : encodeURIComponent(`${destSite.address}, ${destSite.municipality}`);

      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=driving&departure_time=now&key=${apiKey}`;

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const element = data?.rows?.[0]?.elements?.[0];

        if (element && element.status === 'OK') {
          const durationSeconds = element.duration_in_traffic?.value || element.duration?.value || 0;
          const distanceMeters = element.distance?.value || 0;

          const drivingMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
          const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
          const totalRequiredMinutes = drivingMinutes + bufferMinutes;

          return {
            originSite,
            destSite,
            drivingMinutes,
            bufferMinutes,
            totalRequiredMinutes,
            distanceKm,
            provider: 'google-maps',
            routeSummary: `Google Maps en vivo (${distanceKm} km, ${drivingMinutes} min)`,
          };
        }
      }
    } catch {
      // Ignorar fallo de red y proceder al estimador offline calibrado
    }
  }

  return getOfflineTravelEstimate(originSite, destSite, bufferMinutes);
}
