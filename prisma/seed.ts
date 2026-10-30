import { PrismaClient } from '@prisma/client';

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

  // 2. Crear las 6 Obras distribuidas en municipios de la Comunidad de Madrid
  const sitesData = [
    {
      name: 'Residencial Monte Rozas',
      municipality: 'Las Rozas de Madrid',
      address: 'Calle Camilo José Cela 14',
    },
    {
      name: 'Polígono Logístico Los Gavilanes',
      municipality: 'Getafe',
      address: 'Avenida de las Trece Rosas 8',
    },
    {
      name: 'Edificio Sanitario Norte',
      municipality: 'Alcobendas',
      address: 'Paseo de la Chopera 45',
    },
    {
      name: 'Parque Empresarial Mirador',
      municipality: 'Pozuelo de Alarcón',
      address: 'Vía de las Dos Castillas 33',
    },
    {
      name: 'Rehabilitación Edificio Siglo XVIII',
      municipality: 'Alcalá de Henares',
      address: 'Calle Mayor 62',
    },
    {
      name: 'Centro Tecnológico Infantas',
      municipality: 'San Sebastián de los Reyes',
      address: 'Avenida de Europa 12',
    },
  ];

  const createdSites = [];
  for (const site of sitesData) {
    const created = await prisma.site.create({ data: site });
    createdSites.push(created);
  }
  console.log(`✅ ${createdSites.length} obras creadas exitosamente.`);

  // 3. Crear visitas de ejemplo realistas
  // Usamos la fecha de hoy en formato YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  const visitsData = [
    {
      technicianId: createdTechs[0].id, // Carlos Gómez
      siteId: createdSites[0].id, // Residencial Monte Rozas
      date: today,
      startTime: '08:30',
      durationMinutes: 90,
      endTime: '10:00',
      status: 'SCHEDULED' as const,
      notes: 'Inspección técnica de armaduras y forjado de planta primera.',
    },
    {
      technicianId: createdTechs[0].id, // Carlos Gómez
      siteId: createdSites[3].id, // Pozuelo (diferente obra -> requiere >= 30 min)
      date: today,
      startTime: '11:00', // Margen de 60 min (cumple >= 30 min)
      durationMinutes: 120,
      endTime: '13:00',
      status: 'SCHEDULED' as const,
      notes: 'Reunión de coordinación de cimentación profunda.',
    },
    {
      technicianId: createdTechs[1].id, // Laura Martín
      siteId: createdSites[1].id, // Getafe
      date: today,
      startTime: '09:00',
      durationMinutes: 60,
      endTime: '10:00',
      status: 'SCHEDULED' as const,
      notes: 'Auditoría de cuadro eléctrico general y acometida.',
    },
    {
      technicianId: createdTechs[1].id, // Laura Martín
      siteId: createdSites[2].id, // Alcobendas
      date: today,
      startTime: '10:15',
      durationMinutes: 45,
      endTime: '11:00',
      status: 'CANCELLED' as const, // Cancelada -> Libera el horario de Laura
      notes: 'Visita aplazada por corte de suministro eléctrico en la zona.',
    },
    {
      technicianId: createdTechs[2].id, // Alejandro Ruiz
      siteId: createdSites[4].id, // Alcalá
      date: today,
      startTime: '08:00',
      durationMinutes: 120,
      endTime: '10:00',
      status: 'SCHEDULED' as const,
      notes: 'Revisión periódica de líneas de vida y protecciones colectivas.',
    },
    {
      technicianId: createdTechs[2].id, // Alejandro Ruiz
      siteId: createdSites[4].id, // Alcalá (MISMA OBRA -> 0 min de margen requerido)
      date: today,
      startTime: '10:00', // Empieza de inmediato consecutiva en la misma obra
      durationMinutes: 60,
      endTime: '11:00',
      status: 'SCHEDULED' as const,
      notes: 'Firma de actas de seguridad con subcontratistas.',
    },
    {
      technicianId: createdTechs[3].id, // Sofía Navarro
      siteId: createdSites[5].id, // San Sebastián de los Reyes
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
