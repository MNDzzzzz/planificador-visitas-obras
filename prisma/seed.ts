import { PrismaClient } from '@prisma/client';
import { officialSites } from '../lib/geo/routing';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos para el Planificador de Visitas...');

  // Limpiar datos existentes en orden de dependencias
  await prisma.visit.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.site.deleteMany();

  // 1. Crear los 4 Técnicos de la empresa
  const techniciansData = [
    {
      name: 'Carlos Gómez',
      email: 'carlos.gomez@obrasmadrid.es',
      phone: '+34 611 223 344',
      specialty: 'Estructuras y Cimentaciones',
      color: '#3B82F6', // Azul Apple
    },
    {
      name: 'Laura Martín',
      email: 'laura.martin@obrasmadrid.es',
      phone: '+34 622 334 455',
      specialty: 'Instalaciones Eléctricas y HVAC',
      color: '#10B981', // Verde Esmeralda Apple
    },
    {
      name: 'Alejandro Ruiz',
      email: 'alejandro.ruiz@obrasmadrid.es',
      phone: '+34 633 445 566',
      specialty: 'Seguridad, Salud y Prevención',
      color: '#F59E0B', // Ámbar Apple
    },
    {
      name: 'Sofía Navarro',
      email: 'sofia.navarro@obrasmadrid.es',
      phone: '+34 644 556 677',
      specialty: 'Acabados y Certificación Energética',
      color: '#A855F7', // Púrpura Apple
    },
  ];

  const createdTechs = [];
  for (const tech of techniciansData) {
    const created = await prisma.technician.create({ data: tech });
    createdTechs.push(created);
  }
  console.log(`✅ ${createdTechs.length} técnicos creados exitosamente.`);

  // 2. Crear las 13 Obras Oficiales con Georreferenciación GPS
  const createdSites = [];
  for (const site of officialSites) {
    const created = await prisma.site.create({
      data: {
        id: site.id,
        name: site.name,
        municipality: site.municipality,
        address: site.address,
        latitude: site.latitude ?? null,
        longitude: site.longitude ?? null,
      },
    });
    createdSites.push(created);
  }
  console.log(`✅ ${createdSites.length} obras oficiales georreferenciadas creadas exitosamente.`);

  // 3. Crear visitas de ejemplo realistas
  const today = new Date().toISOString().split('T')[0];

  const siteRozas = createdSites.find((s) => s.municipality === 'Las Rozas de Madrid') || createdSites[0];
  const sitePozuelo = createdSites.find((s) => s.municipality === 'Pozuelo de Alarcón') || createdSites[1];
  const siteGetafe = createdSites.find((s) => s.municipality === 'Getafe') || createdSites[2];
  const siteAlcobendas = createdSites.find((s) => s.municipality === 'Alcobendas') || createdSites[3];
  const siteAlcala = createdSites.find((s) => s.municipality === 'Alcalá de Henares') || createdSites[4];
  const siteSanSe = createdSites.find((s) => s.municipality === 'San Sebastián de los Reyes') || createdSites[5];

  const visitsData = [
    {
      technicianId: createdTechs[0].id, // Carlos Gómez
      siteId: siteRozas.id,
      date: today,
      startTime: '08:30',
      durationMinutes: 90,
      endTime: '10:00',
      status: 'SCHEDULED' as const,
      notes: 'Inspección técnica de armaduras y forjado de planta primera.',
    },
    {
      technicianId: createdTechs[0].id, // Carlos Gómez
      siteId: sitePozuelo.id, // Diferente obra -> requiere tiempo de traslado
      date: today,
      startTime: '11:00', // Margen de 60 min (cumple holgadamente)
      durationMinutes: 120,
      endTime: '13:00',
      status: 'SCHEDULED' as const,
      notes: 'Reunión de coordinación de cimentación profunda.',
    },
    {
      technicianId: createdTechs[1].id, // Laura Martín
      siteId: siteGetafe.id,
      date: today,
      startTime: '09:00',
      durationMinutes: 60,
      endTime: '10:00',
      status: 'SCHEDULED' as const,
      notes: 'Auditoría de cuadro eléctrico general y acometida.',
    },
    {
      technicianId: createdTechs[1].id, // Laura Martín
      siteId: siteAlcobendas.id,
      date: today,
      startTime: '10:15',
      durationMinutes: 45,
      endTime: '11:00',
      status: 'CANCELLED' as const, // Cancelada -> Libera el horario de Laura
      notes: 'Visita aplazada por corte de suministro eléctrico en la zona.',
    },
    {
      technicianId: createdTechs[2].id, // Alejandro Ruiz
      siteId: siteAlcala.id,
      date: today,
      startTime: '08:00',
      durationMinutes: 120,
      endTime: '10:00',
      status: 'SCHEDULED' as const,
      notes: 'Revisión periódica de líneas de vida y protecciones colectivas.',
    },
    {
      technicianId: createdTechs[2].id, // Alejandro Ruiz
      siteId: siteAlcala.id, // MISMA OBRA consecutiva -> 0 min de margen requerido
      date: today,
      startTime: '10:00', // Empieza de inmediato consecutiva en la misma obra
      durationMinutes: 60,
      endTime: '11:00',
      status: 'SCHEDULED' as const,
      notes: 'Firma de actas de seguridad con subcontratistas.',
    },
    {
      technicianId: createdTechs[3].id, // Sofía Navarro
      siteId: siteSanSe.id,
      date: today,
      startTime: '14:00',
      durationMinutes: 120,
      endTime: '16:00',
      status: 'SCHEDULED' as const,
      notes: 'Comprobación de aislamiento térmico exterior (SATE).',
    },
  ];

  for (const visit of visitsData) {
    await prisma.visit.create({ data: visit });
  }

  console.log(`✅ ${visitsData.length} visitas de prueba sembradas exitosamente.`);
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
