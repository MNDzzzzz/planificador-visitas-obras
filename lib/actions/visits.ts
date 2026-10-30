'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { ActionResult, CreateVisitInput, SiteDTO, TechnicianDTO, VisitDTO } from '../types';
import { cancelVisitSchema, createVisitSchema } from '../validation/schemas';
import { calculateEndTime, validateVisitScheduling } from '../validation/rules';

// Datos de fallback en memoria si la base de datos aún no está conectada
let memoryTechnicians: TechnicianDTO[] = [
  {
    id: 'tech-carlos',
    name: 'Carlos Gómez',
    email: 'carlos.gomez@obrasmadrid.es',
    phone: '+34 611 223 344',
    specialty: 'Estructuras y Cimentaciones',
    color: '#3B82F6',
  },
  {
    id: 'tech-laura',
    name: 'Laura Martín',
    email: 'laura.martin@obrasmadrid.es',
    phone: '+34 622 334 455',
    specialty: 'Instalaciones Eléctricas y HVAC',
    color: '#10B981',
  },
  {
    id: 'tech-alejandro',
    name: 'Alejandro Ruiz',
    email: 'alejandro.ruiz@obrasmadrid.es',
    phone: '+34 633 445 566',
    specialty: 'Seguridad, Salud y Prevención',
    color: '#F59E0B',
  },
  {
    id: 'tech-sofia',
    name: 'Sofía Navarro',
    email: 'sofia.navarro@obrasmadrid.es',
    phone: '+34 644 556 677',
    specialty: 'Acabados y Certificación Energética',
    color: '#A855F7',
  },
];

let memorySites: SiteDTO[] = [
  {
    id: 'site-rozas',
    name: 'Residencial Monte Rozas',
    municipality: 'Las Rozas de Madrid',
    address: 'Calle Camilo José Cela 14',
  },
  {
    id: 'site-getafe',
    name: 'Polígono Logístico Los Gavilanes',
    municipality: 'Getafe',
    address: 'Avenida de las Trece Rosas 8',
  },
  {
    id: 'site-alcobendas',
    name: 'Edificio Sanitario Norte',
    municipality: 'Alcobendas',
    address: 'Paseo de la Chopera 45',
  },
  {
    id: 'site-pozuelo',
    name: 'Parque Empresarial Mirador',
    municipality: 'Pozuelo de Alarcón',
    address: 'Vía de las Dos Castillas 33',
  },
  {
    id: 'site-alcala',
    name: 'Rehabilitación Edificio Siglo XVIII',
    municipality: 'Alcalá de Henares',
    address: 'Calle Mayor 62',
  },
  {
    id: 'site-sanse',
    name: 'Centro Tecnológico Infantas',
    municipality: 'San Sebastián de los Reyes',
    address: 'Avenida de Europa 12',
  },
];

const todayStr = new Date().toISOString().split('T')[0];

let memoryVisits: VisitDTO[] = [
  {
    id: 'vis-1',
    technicianId: 'tech-carlos',
    technician: memoryTechnicians[0],
    siteId: 'site-rozas',
    site: memorySites[0],
    date: todayStr,
    startTime: '08:30',
    durationMinutes: 90,
    endTime: '10:00',
    status: 'SCHEDULED',
    notes: 'Inspección de armaduras de forjado en planta 1.',
  },
  {
    id: 'vis-2',
    technicianId: 'tech-carlos',
    technician: memoryTechnicians[0],
    siteId: 'site-pozuelo',
    site: memorySites[3],
    date: todayStr,
    startTime: '11:00',
    durationMinutes: 120,
    endTime: '13:00',
    status: 'SCHEDULED',
    notes: 'Coordinación de cimentación con constructora.',
  },
  {
    id: 'vis-3',
    technicianId: 'tech-laura',
    technician: memoryTechnicians[1],
    siteId: 'site-getafe',
    site: memorySites[1],
    date: todayStr,
    startTime: '09:00',
    durationMinutes: 60,
    endTime: '10:00',
    status: 'SCHEDULED',
    notes: 'Auditoría de cuadros eléctricos y acometidas.',
  },
  {
    id: 'vis-4',
    technicianId: 'tech-laura',
    technician: memoryTechnicians[1],
    siteId: 'site-alcobendas',
    site: memorySites[2],
    date: todayStr,
    startTime: '10:15',
    durationMinutes: 45,
    endTime: '11:00',
    status: 'CANCELLED',
    notes: 'Cancelada por corte de suministro en la zona.',
  },
  {
    id: 'vis-5',
    technicianId: 'tech-alejandro',
    technician: memoryTechnicians[2],
    siteId: 'site-alcala',
    site: memorySites[4],
    date: todayStr,
    startTime: '08:00',
    durationMinutes: 120,
    endTime: '10:00',
    status: 'SCHEDULED',
    notes: 'Revisión periódica de líneas de vida.',
  },
  {
    id: 'vis-6',
    technicianId: 'tech-alejandro',
    technician: memoryTechnicians[2],
    siteId: 'site-alcala',
    site: memorySites[4],
    date: todayStr,
    startTime: '10:00',
    durationMinutes: 60,
    endTime: '11:00',
    status: 'SCHEDULED',
    notes: 'Firma de actas de seguridad (misma obra, 0 min margen).',
  },
];

let dbAvailableCache: boolean | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 10_000;

/**
 * Helper para verificar si Prisma tiene conexión activa (con caché temporal)
 */
async function isDatabaseAvailable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;

  const now = Date.now();
  if (dbAvailableCache !== null && now - lastCheckTime < CACHE_TTL_MS) {
    return dbAvailableCache;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailableCache = true;
    lastCheckTime = now;
    return true;
  } catch {
    dbAvailableCache = false;
    lastCheckTime = now;
    return false;
  }
}

/**
 * Obtener datos iniciales (técnicos, obras y visitas)
 */
export async function getInitialDataAction(): Promise<{
  technicians: TechnicianDTO[];
  sites: SiteDTO[];
  visits: VisitDTO[];
}> {
  try {
    const dbOk = await isDatabaseAvailable();
    if (dbOk) {
      const [techs, sites, visits] = await Promise.all([
        prisma.technician.findMany({ orderBy: { name: 'asc' } }),
        prisma.site.findMany({ orderBy: { name: 'asc' } }),
        prisma.visit.findMany({
          include: { technician: true, site: true },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        }),
      ]);

      return {
        technicians: techs,
        sites,
        visits: visits.map((v) => ({
          ...v,
          status: v.status as 'SCHEDULED' | 'CANCELLED',
          createdAt: v.createdAt.toISOString(),
          updatedAt: v.updatedAt.toISOString(),
        })),
      };
    }
  } catch (error) {
    console.warn('Usando almacenamiento en memoria estructurado:', error);
  }

  return {
    technicians: memoryTechnicians,
    sites: memorySites,
    visits: [...memoryVisits].sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return a.startTime.localeCompare(b.startTime);
    }),
  };
}

/**
 * Obtener visitas con filtros opcionales
 */
export async function getVisitsAction(filters?: {
  technicianId?: string;
  date?: string;
}): Promise<VisitDTO[]> {
  try {
    const dbOk = await isDatabaseAvailable();
    if (dbOk) {
      const whereClause: Record<string, unknown> = {};
      if (filters?.technicianId) whereClause.technicianId = filters.technicianId;
      if (filters?.date) whereClause.date = filters.date;

      const visits = await prisma.visit.findMany({
        where: whereClause,
        include: { technician: true, site: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });

      return visits.map((v) => ({
        ...v,
        status: v.status as 'SCHEDULED' | 'CANCELLED',
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      }));
    }
  } catch (error) {
    console.warn('Filtro en memoria ejecutado:', error);
  }

  let filtered = [...memoryVisits];
  if (filters?.technicianId) {
    filtered = filtered.filter((v) => v.technicianId === filters.technicianId);
  }
  if (filters?.date) {
    filtered = filtered.filter((v) => v.date === filters.date);
  }

  return filtered.sort((a, b) => {
    const cmpDate = a.date.localeCompare(b.date);
    if (cmpDate !== 0) return cmpDate;
    return a.startTime.localeCompare(b.startTime);
  });
}

/**
 * Programar una nueva visita con validaciones estrictas en servidor
 */
export async function scheduleVisitAction(input: CreateVisitInput): Promise<ActionResult<VisitDTO>> {
  try {
    // 1. Validación Zod de esquema y tipos
    const parseResult = createVisitSchema.safeParse(input);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      const fieldPath = firstIssue.path[0]?.toString() || '';
      const isTimeOrDuration = fieldPath === 'startTime' || fieldPath === 'durationMinutes';

      return {
        success: false,
        error: firstIssue.message,
        rule: isTimeOrDuration ? 'RULE_C' : undefined,
        code:
          fieldPath === 'startTime'
            ? 'INVALID_TIME_FORMAT'
            : fieldPath === 'durationMinutes'
            ? 'INVALID_DURATION'
            : undefined,
      };
    }

    const validData = parseResult.data;
    const computedEndTime = calculateEndTime(validData.startTime, validData.durationMinutes);

    // 2. Obtener visitas existentes para ese técnico en esa fecha
    const dbOk = await isDatabaseAvailable();
    let existingVisits: VisitDTO[] = [];

    if (dbOk) {
      const dbVisits = await prisma.visit.findMany({
        where: {
          technicianId: validData.technicianId,
          date: validData.date,
        },
        include: { technician: true, site: true },
        orderBy: { startTime: 'asc' },
      });

      existingVisits = dbVisits.map((v) => ({
        ...v,
        status: v.status as 'SCHEDULED' | 'CANCELLED',
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      }));
    } else {
      existingVisits = memoryVisits.filter(
        (v) => v.technicianId === validData.technicianId && v.date === validData.date
      );
    }

    // 3. Ejecución del motor puro de validación (Reglas A, B y C)
    const validation = validateVisitScheduling({
      newVisit: validData,
      existingVisits,
    });

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.message,
        rule: validation.rule,
        code: validation.code,
        details: validation.details,
      };
    }

    // 4. Persistir la visita
    if (dbOk) {
      const created = await prisma.visit.create({
        data: {
          technicianId: validData.technicianId,
          siteId: validData.siteId,
          date: validData.date,
          startTime: validData.startTime,
          durationMinutes: validData.durationMinutes,
          endTime: computedEndTime,
          status: 'SCHEDULED',
          notes: validData.notes || null,
        },
        include: { technician: true, site: true },
      });

      revalidatePath('/');
      return {
        success: true,
        data: {
          ...created,
          status: created.status as 'SCHEDULED' | 'CANCELLED',
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      };
    } else {
      // Almacenamiento en memoria fallback (sin base de datos)
      const tech = memoryTechnicians.find((t) => t.id === validData.technicianId);
      const site = memorySites.find((s) => s.id === validData.siteId);

      const newVisitRecord: VisitDTO = {
        id: `vis-${Date.now()}`,
        technicianId: validData.technicianId,
        technician: tech,
        siteId: validData.siteId,
        site,
        date: validData.date,
        startTime: validData.startTime,
        durationMinutes: validData.durationMinutes,
        endTime: computedEndTime,
        status: 'SCHEDULED',
        notes: validData.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      memoryVisits.push(newVisitRecord);
      revalidatePath('/');

      return {
        success: true,
        data: newVisitRecord,
      };
    }
  } catch (err: unknown) {
    console.error('Error al programar la visita:', err);
    const errorMessage =
      err instanceof Error ? err.message : 'Error inesperado al programar la visita.';
    return {
      success: false,
      error: `Error al procesar la visita: ${errorMessage}`,
    };
  }
}

/**
 * Cancelar visita: cambia estado a CANCELLED y libera el horario de inmediato.
 * Permanece en el registro del listado de visitas como CANCELLED.
 */
export async function cancelVisitAction(visitId: string): Promise<ActionResult<VisitDTO>> {
  const parseResult = cancelVisitSchema.safeParse({ visitId });
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'ID de visita inválido.',
    };
  }

  try {
    const dbOk = await isDatabaseAvailable();
    if (dbOk) {
      const updated = await prisma.visit.update({
        where: { id: visitId },
        data: { status: 'CANCELLED' },
        include: { technician: true, site: true },
      });

      revalidatePath('/');
      return {
        success: true,
        data: {
          ...updated,
          status: updated.status as 'SCHEDULED' | 'CANCELLED',
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      };
    } else {
      const visit = memoryVisits.find((v) => v.id === visitId);
      if (!visit) {
        return { success: false, error: 'Visita no encontrada en el registro.' };
      }

      visit.status = 'CANCELLED';
      visit.updatedAt = new Date().toISOString();

      revalidatePath('/');
      return {
        success: true,
        data: { ...visit },
      };
    }
  } catch (err: unknown) {
    console.error('Error al cancelar la visita:', err);
    const errorMessage =
      err instanceof Error ? err.message : 'Error desconocido al cancelar la visita.';
    return {
      success: false,
      error: `No se pudo cancelar la visita: ${errorMessage}`,
    };
  }
}
