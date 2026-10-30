/**
 * Motor de Guardarraíles de LabQA Copilot
 * Reglas de filtrado estricto contra alucinaciones, consultas fuera de dominio
 * y consultas sobre personal/técnicos no homologados.
 */

export const OFFICIAL_TECHNICIANS = [
  'Carlos Gómez',
  'Laura Martín',
  'Alejandro Ruiz',
  'Sofía Navarro',
] as const;

export type OfficialTechnician = (typeof OFFICIAL_TECHNICIANS)[number];

export interface GuardrailResult {
  isIntercepted: boolean;
  answer: string;
  sources: { id: string; title: string; category: string }[];
}

// Normalización rápida para guardarraíles
function normalizeGuardrailText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()\[\]{}"'\\\/_\-–—#*+~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Tokens válidos de la plantilla oficial
const OFFICIAL_FIRST_NAMES = new Set(['carlos', 'laura', 'alejandro', 'sofia']);
const OFFICIAL_LAST_NAMES = new Set(['gomez', 'martin', 'ruiz', 'navarro']);

// Lista de nombres propios hispanos/catalanes comunes que NO pertenecen a la plantilla
const NON_OFFICIAL_NAMES = new Set([
  'alvaro', 'pedro', 'pere', 'juan', 'joan', 'david', 'maria', 'marta', 'pepe', 'antonio', 'luis', 'lluis',
  'lucas', 'lucia', 'paco', 'elena', 'carmen', 'javier', 'manuel', 'jose', 'josep', 'marc',
  'jordi', 'pau', 'pol', 'biel', 'laia', 'ona', 'nuria', 'gemma', 'montserrat',
  'sergi', 'oriol', 'arnau', 'guillem', 'roger', 'jan', 'daniel', 'alberto',
  'fernando', 'miguel', 'miquel', 'angel', 'pablo', 'sergio', 'jorge', 'enrique', 'enric', 'andres',
  'victor', 'hugo', 'adrian', 'raul', 'ruben', 'ivan', 'oscar', 'guillermo',
  'gonzalo', 'rodrigo', 'claudia', 'paula', 'alba', 'sara', 'irene', 'ana',
  'eva', 'patricia', 'raquel', 'beatriz', 'lorena', 'silvia', 'cristina',
  'marina', 'teresa', 'julia', 'monica', 'alicia', 'manolo', 'pepito', 'john',
  'jaume', 'quim', 'xavier', 'ignasi', 'ferran'
]);

// Palabras o raíces clave fuera de dominio (fantasía, cocina, deportes, entretenimiento, etc.)
const OUT_OF_DOMAIN_PATTERNS: RegExp[] = [
  /\b(drac|dracs|dragon|dragones|dragons|dinosaurio|dinosaurios|alien|aliens|extraterrestre|extraterrestres|ovni|ovnis|monstruo|monstruos|zombie|zombies|vampiro|vampiros|fantasma|fantasmas|magia|mago|magos|bruja|brujas|pocion|pociones|hechizo|hechizos|hobbit|elfo|elfos|unicornio|unicornios)\b/i,
  /\b(receta|recetas|recepta|receptes|paella|tortilla|pizza|hamburguesa|tarta|pastel|postre|macarrones|espaguetis|marisco|marisc)\b/i,
  /\b(futbol|baloncesto|basquet|tenis|champions|messi|ronaldo|maradona|real madrid|barca|barça|barcelona fc|laliga|nba)\b/i,
  /\b(pelicula|peliculas|pel·licula|pel·licules|cine|hollywood|netflix|actor|actriz|serie de tv)\b/i,
  /\b(cancion|canciones|canco|cancons|canço|cançons|cantante|cantant|concierto|concert|reggaeton|spotify)\b/i,
  /\b(chiste|chistes|acudit|acudits|adivinanza|adivinanzas|endevinalla|poema|poesia|horoscopo|horoscop|tarot|astrologia)\b/i,
  /\b(criptomoneda|criptomonedas|bitcoin|ethereum|casino|ruleta|apuestas)\b/i,
];

/**
 * Evalúa una consulta frente a los guardarraíles de LabQA Copilot.
 * 
 * Regla 1: Consultas fuera de dominio (fantasía, recetas, deportes, etc.)
 * -> Respuesta estandarizada limpia a secas con sources: [] (PROHIBIDO citar procedimientos afines).
 * 
 * Regla 2: Consultas sobre trabajadores / técnicos ficticios o que no pertenecen a la plantilla oficial
 * -> Respuesta estandarizada indicando la plantilla oficial exclusiva con sources: [].
 * 
 * Regla 3: Consultas generales sobre la plantilla oficial
 * -> Listado oficial de técnicos homologados con sources: [].
 */
export function evaluateGuardrails(
  query: string,
  language: 'es' | 'ca' = 'es'
): GuardrailResult | null {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return null;
  }

  const normalized = normalizeGuardrailText(query);
  const words = normalized.split(/\s+/);
  const isCatalan = language === 'ca';

  // -------------------------------------------------------------------------
  // 1. GUARDARRAÍL FUERA DE DOMINIO (Out-of-Domain / Ficticio / Aleatorio)
  // -------------------------------------------------------------------------
  for (const pattern of OUT_OF_DOMAIN_PATTERNS) {
    if (pattern.test(normalized)) {
      const answer = isCatalan
        ? "Aquesta informació no consta a la documentació tècnica interna ni als registres de la base de dades de l'empresa."
        : "Esta información no consta en la documentación técnica interna ni en los registros de la base de datos de la empresa.";

      return {
        isIntercepted: true,
        answer,
        sources: [],
      };
    }
  }

  // -------------------------------------------------------------------------
  // 2. GUARDARRAÍL DE PLANTILLA Y TÉCNICOS
  // -------------------------------------------------------------------------
  // Excepción técnica: "plantilla antiperforación" en calzado de seguridad (DOC-07)
  const isSafetyBootsQuery =
    normalized.includes('antiperforacion') ||
    normalized.includes('antiperforant') ||
    normalized.includes('bota') ||
    normalized.includes('calzado') ||
    normalized.includes('calcat') ||
    normalized.includes('s3');

  if (!isSafetyBootsQuery) {
    // A) Consulta general sobre la plantilla de técnicos
    const isGeneralStaffQuery =
      /\b(quienes son los tecnicos|quins son els tecnics|cual es la plantilla|quina es la plantilla|plantilla de tecnicos|plantilla de tecnics|tecnicos de la empresa|tecnics de l empresa|equipo de tecnicos|equip de tecnics)\b/i.test(
        normalized
      );

    if (isGeneralStaffQuery) {
      const answer = isCatalan
        ? `La plantilla oficial de tècnics homologats de l'empresa es compon exclusivament de: ${OFFICIAL_TECHNICIANS.join(
            ', '
          ).replace(/, ([^,]*)$/, ' i $1')}.`
        : `La plantilla oficial de técnicos homologados de la empresa se compone exclusivamente de: ${OFFICIAL_TECHNICIANS.join(
            ', '
          ).replace(/, ([^,]*)$/, ' y $1')}.`;

      return {
        isIntercepted: true,
        answer,
        sources: [],
      };
    }

    // B) Comprobar si la consulta menciona algún técnico oficial
    const mentionsOfficialTechnician =
      words.some((w) => OFFICIAL_FIRST_NAMES.has(w)) ||
      normalized.includes('carlos gomez') ||
      normalized.includes('laura martin') ||
      normalized.includes('alejandro ruiz') ||
      normalized.includes('sofia navarro');

    // C) Detectar si la consulta pregunta por un trabajador o persona específica
    const hasWorkerQueryContext =
      /\b(tecnico|tecnica|tecnic|tècnic|tècnica|trabajador|trabajadora|treballador|treballadora|empleado|empleada|empleat|inspector|inspectora|operario|operaria|operari|personal|ingeniero|ingeniera|enginyer|enginyera)\b/i.test(
        normalized
      ) ||
      /\b(quien es|qui es|trabaja|treballa|trabajo|feina|conoces a|coneixes a|visitas?|visites?|agenda|horarios?|horaris?|asignad[oa]|assignat|assignada|inspeccion|inspecciones|inspeccio|inspeccions|tareas?|feines?|obras?|obres?|traslado|trasllat|tardara|arribar|llegar|desplazamiento|desplacament|viaje|ruta|cuanto|quant|tiempo|temps)\b/i.test(
        normalized
      ) ||
      /\b(quien|qui|es|és|esta|está|té|tiene|hace|fa|donde|on)\b/i.test(
        normalized
      );

    // Comprobar si aparece algún nombre no oficial
    const mentionedNonOfficialName = words.find((w) => NON_OFFICIAL_NAMES.has(w));

    // Si pregunta por una persona/trabajador y menciona un nombre que NO es de la plantilla oficial
    if (
      !mentionsOfficialTechnician &&
      mentionedNonOfficialName &&
      (hasWorkerQueryContext || words.length <= 15)
    ) {
      const answer = isCatalan
        ? `El tècnic o empleat consultat no forma part de l'equip tècnic de l'empresa. La plantilla oficial de tècnics homologats es compon exclusivament de: ${OFFICIAL_TECHNICIANS.join(
            ', '
          ).replace(/, ([^,]*)$/, ' i $1')}.`
        : `El técnico o empleado consultado no forma parte del equipo técnico de la empresa. La plantilla oficial de técnicos homologados se compone exclusivamente de: ${OFFICIAL_TECHNICIANS.join(
            ', '
          ).replace(/, ([^,]*)$/, ' y $1')}.`;

      return {
        isIntercepted: true,
        answer,
        sources: [],
      };
    }
  }

  // Si no vulnera ningún guardarraíl, permitir que continúe al flujo RAG
  return null;
}
