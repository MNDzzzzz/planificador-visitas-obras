// Sistema de internacionalización bilingüe (Català / Castellano)
// Adaptado para empresa de control de calidad de la construcción en Terrassa.

export type Language = 'ca' | 'es';

export const translations = {
  ca: {
    // Header
    appTitle: 'Planificador de Visites a Obres',
    appSubtitle: 'Control de qualitat i assajos de materials • Terrassa Lab',
    liveBadge: 'Jornada activa (Europe/Madrid)',
    scheduledCountLabel: 'actives',
    cancelledCountLabel: 'cancel·lades',
    techsCountLabel: 'tècnics',
    newVisitBtn: 'Programar Visita',
    viewCards: 'Targetes',
    viewTimeline: 'Cronograma Visual',
    copilotBtn: 'LabQA Copilot IA',
    copilotVoiceBtn: 'Trucada amb IA',
    n8nBtn: 'Automatització n8n',

    // Filtros
    filterAllTechs: 'Tots els tècnics',
    filterDateLabel: 'Data:',
    filterTodayBtn: 'Avui',
    filterSearchPlaceholder: 'Cercar obra o municipi...',
    filterResults: 'visites trobades',

    // Reglas e indicadores
    rulesTitle: 'Normativa Operativa de Jornada i Desplaçaments',
    ruleATitle: 'Regla A: Sense Solapaments',
    ruleADesc: 'Un tècnic no pot tenir dues inspeccions simultànies.',
    ruleBTitle: 'Regla B: Desplaçament mín. 30 min',
    ruleBDesc: 'Trasllat de 30 min entre obres diferents. 0 min si és la mateixa.',
    ruleCTitle: 'Regla C: Jornada Laboral 08:00 a 17:00 h',
    ruleCDesc: 'Tota visita ha de començar i finalitzar en aquest horari.',

    // Visitas
    visitStatusScheduled: 'Programada',
    visitStatusCancelled: 'Cancel·lada',
    cancelActionBtn: 'Cancel·lar Visita',
    cancelConfirmPrompt: 'Segur que vols alliberar aquest horari?',
    cancelledBadge: 'Horari Alliberat',
    travelMarginOk: 'Marge amb obra anterior:',
    travelSameSite: 'Mateixa obra consecutiva (0 min trasllat)',
    travelRequired: 'trasllat mín. 30 min complert',
    noVisitsTitle: 'Cap visita programada',
    noVisitsDesc: 'No hi ha visites per als filtres seleccionats. Pots programar la primera inspecció ara.',

    // Modal Programar
    modalTitle: 'Programar Nova Inspecció / Assaig',
    modalSubtitle: 'Valida solapaments, trasllats i horari laboral automàticament.',
    fieldTechnician: 'Tècnic Responsable',
    fieldSite: 'Obra i Municipi',
    fieldDate: 'Data',
    fieldStartTime: 'Hora d\'inici (08:00 a 17:00 h)',
    fieldDuration: 'Durada de l\'assaig',
    fieldDurationHint: 'minuts',
    fieldNotes: 'Notes tècniques de l\'assaig (provetes, formigó, etc.)',
    estimatedEnd: 'Hora estimada de finalització:',
    cancelBtn: 'Tancar',
    confirmScheduleBtn: 'Confirmar i Agendar Visita',

    // Errores y reglas
    errorOutsideHours: 'Fora de jornada laboral (08:00 a 17:00 h)',
    errorOverlap: 'Solapament horari del tècnic',
    errorTravelTime: 'Temps de desplaçament insuficient',

    // Copilot
    copilotTitle: 'LabQA Copilot — IA Tècnica de Materials',
    copilotSubtitle: 'Normativa EHE, Codi Estructural, assajos de formigó i ISO 9001',
    copilotPlaceholder: 'Fes una pregunta tècnica (ex: assaig de con d\'Abrams a 28 dies)...',
    copilotVoiceActive: 'Escoltant la teva veu...',
    copilotVoiceListening: 'Pots parlar ara. Detectant la teva veu...',
    copilotVoiceSpeaking: 'L\'assistent està responent en veu alta...',
    copilotVoiceStart: 'Iniciar Trucada de Veu',
    copilotVoiceStop: 'Finalitzar Trucada',

    // n8n
    n8nTitle: 'Flux d\'Automatització n8n — Lab Terrassa',
    n8nSubtitle: 'Integració de webhooks per a notificacions i gestió de laboratoris',
    n8nTrigger: 'Trigger: Visita Agendada o Cancel·lada',
    n8nNode1: 'Notificació instantània per Telegram/WhatsApp al tècnic',
    n8nNode2: 'Reserva de cambra humida per a provetes a Terrassa',
    n8nNode3: 'Registre automàtic en ERP de Qualitat ISO 9001',
    n8nWebhookUrl: 'Webhook Endpoint (n8n Cloud / Self-hosted):',
    n8nSimulateBtn: 'Simular Execució del Webhook',
  },
  es: {
    // Header
    appTitle: 'Planificador de Visitas a Obras',
    appSubtitle: 'Control de calidad y ensayos de materiales • Terrassa Lab',
    liveBadge: 'Jornada activa (Europe/Madrid)',
    scheduledCountLabel: 'activas',
    cancelledCountLabel: 'canceladas',
    techsCountLabel: 'técnicos',
    newVisitBtn: 'Programar Visita',
    viewCards: 'Tarjetas',
    viewTimeline: 'Cronograma Visual',
    copilotBtn: 'LabQA Copilot IA',
    copilotVoiceBtn: 'Llamada con IA',
    n8nBtn: 'Automatización n8n',

    // Filtros
    filterAllTechs: 'Todos los técnicos',
    filterDateLabel: 'Fecha:',
    filterTodayBtn: 'Hoy',
    filterSearchPlaceholder: 'Buscar obra o municipio...',
    filterResults: 'visitas encontradas',

    // Reglas e indicadores
    rulesTitle: 'Normativa Operativa de Jornada y Desplazamientos',
    ruleATitle: 'Regla A: Sin Solapamientos',
    ruleADesc: 'Un técnico no puede tener dos inspecciones simultáneas.',
    ruleBTitle: 'Regla B: Desplazamiento mín. 30 min',
    ruleBDesc: 'Traslado de 30 min entre obras distintas. 0 min si es la misma.',
    ruleCTitle: 'Regla C: Jornada Laboral 08:00 a 17:00 h',
    ruleCDesc: 'Toda visita debe comenzar y finalizar en este horario.',

    // Visitas
    visitStatusScheduled: 'Programada',
    visitStatusCancelled: 'Cancelada',
    cancelActionBtn: 'Cancelar Visita',
    cancelConfirmPrompt: '¿Seguro que deseas liberar este horario?',
    cancelledBadge: 'Horario Liberado',
    travelMarginOk: 'Margen con obra anterior:',
    travelSameSite: 'Misma obra consecutiva (0 min traslado)',
    travelRequired: 'traslado mín. 30 min cumplido',
    noVisitsTitle: 'Ninguna visita programada',
    noVisitsDesc: 'No hay visitas para los filtros seleccionados. Puedes programar la primera inspección ahora.',

    // Modal Programar
    modalTitle: 'Programar Nueva Inspección / Ensayo',
    modalSubtitle: 'Valida solapamientos, traslados y jornada laboral automáticamente.',
    fieldTechnician: 'Técnico Responsable',
    fieldSite: 'Obra y Municipio',
    fieldDate: 'Fecha',
    fieldStartTime: 'Hora de inicio (08:00 a 17:00 h)',
    fieldDuration: 'Duración del ensayo',
    fieldDurationHint: 'minutos',
    fieldNotes: 'Notas técnicas del ensayo (probetas, hormigón, etc.)',
    estimatedEnd: 'Hora estimada de finalización:',
    cancelBtn: 'Cerrar',
    confirmScheduleBtn: 'Confirmar y Agendar Visita',

    // Errores y reglas
    errorOutsideHours: 'Fuera de jornada laboral (08:00 a 17:00 h)',
    errorOverlap: 'Solapamiento horario del técnico',
    errorTravelTime: 'Tiempo de desplazamiento insuficiente',

    // Copilot
    copilotTitle: 'LabQA Copilot — IA Técnica de Materiales',
    copilotSubtitle: 'Normativa EHE, Código Estructural, ensayos de hormigón e ISO 9001',
    copilotPlaceholder: 'Haz una pregunta técnica (ej: ensayo de cono de Abrams a 28 días)...',
    copilotVoiceActive: 'Escuchando tu voz...',
    copilotVoiceListening: 'Puedes hablar ahora. Detectando tu voz...',
    copilotVoiceSpeaking: 'El asistente está respondiendo en voz alta...',
    copilotVoiceStart: 'Iniciar Llamada de Voz',
    copilotVoiceStop: 'Finalizar Llamada',

    // n8n
    n8nTitle: 'Flujo de Automatización n8n — Lab Terrassa',
    n8nSubtitle: 'Integración de webhooks para notificaciones y gestión de laboratorio',
    n8nTrigger: 'Trigger: Visita Agendada o Cancelada',
    n8nNode1: 'Notificación instantánea por Telegram/WhatsApp al técnico',
    n8nNode2: 'Reserva de cámara húmeda para probetas en Terrassa',
    n8nNode3: 'Registro automático en ERP de Calidad ISO 9001',
    n8nWebhookUrl: 'Webhook Endpoint (n8n Cloud / Self-hosted):',
    n8nSimulateBtn: 'Simular Ejecución del Webhook',
  },
};
