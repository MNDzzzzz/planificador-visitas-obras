/**
 * Sistema de Caché Exacta y Semántica para LabQA Copilot
 * Con respuestas técnicas precargadas (Seed Cache) y persistencia en tiempo de ejecución.
 */

export interface CachedResponse {
  query: string;
  normalizedQuery: string;
  language: 'ca' | 'es';
  answer: string;
  sources: { id: string; title: string; category: string }[];
  provider: 'cache';
  timestamp: number;
  matchType: 'exact' | 'semantic';
  similarity: number;
}

export interface SeedCacheEntry {
  id: string;
  coreKeywords: string[];
  queries: {
    es: string[];
    ca: string[];
  };
  answer: {
    es: string;
    ca: string;
  };
  sources: { id: string; title: string; category: string }[];
}

// Stop words en castellano y catalán que se omiten en la comparación semántica
const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'dels', 'deles', 'a', 'al', 'en', 'para',
  'por', 'con', 'sin', 'sobre', 'entre', 'hacia', 'hasta', 'desde', 'durante', 'mediante', 'segun', 'contra',
  'que', 'como', 'cuando', 'donde', 'quien', 'cual', 'cuales', 'cuanto', 'cuanta', 'cuantos', 'cuantas',
  'es', 'son', 'fue', 'era', 'hay', 'tiene', 'tienen', 'hacer', 'hace', 'com', 'quan', 'on', 'qui', 'quin',
  'quins', 'quina', 'quines', 'quant', 'quants', 'quanta', 'quantes', 'per', 'perque', 'amb', 'sense', 'pero',
  'i', 'o', 'u', 'y', 'e', 'ni', 'se', 'te', 'me', 'nos', 'vos', 'les', 'li', 'els', 'ens', 'us',
  'dos', 'dos', 'tres', 'vez', 'veces', 'tengo', 'debo', 'pueden', 'puede', 'pots', 'pot', 'fa'
]);

/**
 * Normaliza una cadena eliminando mayúsculas, diacríticos/tildes, puntuación y espacios redundantes.
 * Reemplaza apóstrofes por espacios para separar elisiones catalanas (l'assaig -> l assaig).
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`´]/g, ' ')
    .replace(/[¿?¡!.,;:()\[\]{}"'\\\/_\-–—#*+~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae palabras clave significativas de una consulta normalizada.
 */
export function extractKeywords(normalizedText: string): string[] {
  return normalizedText
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Comprueba si dos palabras coinciden fonética/morfológicamente (plurales, sufijos, misma raíz).
 */
export function wordsMatch(w1: string, w2: string): boolean {
  if (w1 === w2) return true;
  if (w1 + 's' === w2 || w2 + 's' === w1) return true;
  if (w1 + 'es' === w2 || w2 + 'es' === w1) return true;

  // Misma raíz léxica (ej: solap-ar / solap-amiento, traslad-ar / traslad-o)
  const minLen = Math.min(w1.length, w2.length);
  if (minLen >= 5 && w1.slice(0, 5) === w2.slice(0, 5)) {
    return true;
  }
  return false;
}

/**
 * Genera el conjunto de trigramas de caracteres para similitud n-gram.
 */
export function getCharacterTrigrams(text: string): Set<string> {
  const clean = text.replace(/\s+/g, '');
  const trigrams = new Set<string>();
  if (clean.length < 3) {
    if (clean.length > 0) trigrams.add(clean);
    return trigrams;
  }
  for (let i = 0; i <= clean.length - 3; i++) {
    trigrams.add(clean.slice(i, i + 3));
  }
  return trigrams;
}

/**
 * Coeficiente de Jaccard entre dos conjuntos genéricos.
 */
function jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionSize++;
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * Calcula similitud léxico-semántica combinando:
 * 1. Cobertura de conceptos objetivo en la consulta (Simpson / Overlap).
 * 2. Similitud Jaccard de palabras clave con lematización ligera.
 * 3. Presencia de términos nucleares clave (core keywords).
 * 4. Jaccard de trigramas de caracteres.
 */
export function calculateSimilarity(
  query: string,
  targetQuery: string,
  coreKeywords: string[] = []
): number {
  const normQuery = normalizeText(query);
  const normTarget = normalizeText(targetQuery);

  if (normQuery === normTarget) return 1.0;

  const qKeywords = extractKeywords(normQuery);
  const tKeywords = extractKeywords(normTarget);

  if (tKeywords.length === 0) return 0.0;

  // 1. Cobertura: cuántos conceptos del target están presentes en la consulta del usuario
  let matchedTargetCount = 0;
  for (const tw of tKeywords) {
    if (qKeywords.some((qw) => wordsMatch(qw, tw))) {
      matchedTargetCount++;
    }
  }
  const coverage = matchedTargetCount / tKeywords.length;

  // 2. Jaccard de palabras
  const unionSet = new Set([...qKeywords, ...tKeywords]);
  const wordJaccard = unionSet.size === 0 ? 0 : matchedTargetCount / unionSet.size;

  // 3. Cobertura de términos nucleares (core keywords)
  let coreCoverage = 0;
  if (coreKeywords.length > 0) {
    let matchedCore = 0;
    for (const ck of coreKeywords) {
      const normCk = normalizeText(ck);
      if (normQuery.includes(normCk) || qKeywords.some((qw) => wordsMatch(qw, normCk))) {
        matchedCore++;
      }
    }
    coreCoverage = matchedCore / coreKeywords.length;
  }

  // 4. Trigramas de caracteres
  const qTrigrams = getCharacterTrigrams(normQuery);
  const tTrigrams = getCharacterTrigrams(normTarget);
  const trigramJaccard = jaccardSimilarity(qTrigrams, tTrigrams);

  // Puntuación combinada ponderada
  // Si la consulta cubre el 100% de los términos del target o de los core keywords,
  // la similitud debe ser alta (> 0.70) incluso si la consulta del usuario es más larga
  let score = 0;
  if (coverage >= 0.99 || (coreCoverage >= 0.75 && coverage >= 0.50)) {
    score = 0.75 + coverage * 0.15 + wordJaccard * 0.10;
  } else if (coverage >= 0.60) {
    score = coverage * 0.55 + coreCoverage * 0.25 + wordJaccard * 0.20;
  } else {
    score = coverage * 0.40 + coreCoverage * 0.30 + wordJaccard * 0.15 + trigramJaccard * 0.15;
  }

  return Math.min(1.0, Math.max(score, wordJaccard));
}

// ---------------------------------------------------------------------------
// BANCO DE RESPUESTAS PRECARGADAS (SEED CACHE) - DOMINIO TÉCNICO Y CONTROL QA
// ---------------------------------------------------------------------------
export const SEED_CACHE: SeedCacheEntry[] = [
  // 1. Saludos y Bienvenida
  {
    id: 'SEED-GREETING',
    coreKeywords: ['hola', 'buenas', 'bon dia', 'salutacions'],
    queries: {
      es: [
        'hola',
        'buenas',
        'buenos dias',
        'buenas tardes',
        'hola que tal',
        'hola buenas',
        'que puedes hacer',
        'que hace este bot',
        'ayuda',
        'quien eres',
        'como me puedes ayudar',
      ],
      ca: [
        'hola',
        'bon dia',
        'bona tarda',
        'bones',
        'hola com va',
        'que pots fer',
        'que fa aquest bot',
        'ajuda',
        'qui ets',
        'com em pots ajudar',
      ],
    },
    answer: {
      es: `¡Hola! 👋 Soy **LabQA Copilot**, tu asistente técnico especializado en control de calidad en edificación, obra civil y ensayos de laboratorio de construcción.

Puedo asistirte en tiempo real con:
• 🏗️ **Hormigón:** Toma de muestras, Cono de Abrams (UNE-EN 12350-2), rotura de probetas a 7 y 28 días, curado en cámara húmeda.
• 📐 **Estructuras y Acero:** Acero B500SD (UNE 36065), ductilidad sísmica, tolerancias de replanteo y desplomes (UNE-EN 13670).
• 🌍 **Geotecnia:** Ensayos SPT, penetración dinámica DPSH, placas de carga y control de cimentaciones.
• 🔊 **Acústica y Aislamiento:** Mediciones in situ de ruido aéreo y de impactos (CTE DB-HR).
• 🦺 **Seguridad y EPIs:** Normativa de seguridad en visitas de obra (casco EN 397, calzado S3, chaleco Clase 2).
• 📅 **Planificación de Visitas:** Reglas de asignación (Regla A: sin solapamientos, Regla B: 30 min de desplazamiento entre obras, Regla C: jornada laboral 08:00–17:00).

¿En qué ensayo, procedimiento normativo o planificación te puedo ayudar hoy?`,
      ca: `Hola! 👋 Sóc **LabQA Copilot**, el teu assistent tècnic especialitzat en control de qualitat a l'edificació, obra civil i assajos de laboratori de construcció.

Puc assistir-te en temps real amb:
• 🏗️ **Formigó:** Presa de mostres, Con d'Abrams (UNE-EN 12350-2), trencament de provetes a 7 i 28 dies, curat en cambra humida.
• 📐 **Estructures i Acer:** Acer B500SD (UNE 36065), ductilitat sísmica, toleràncies de replanteig i desploms (UNE-EN 13670).
• 🌍 **Geotècnia:** Assajos SPT, penetració dinàmica DPSH, plaques de càrrega i control de fonamentacions.
• 🔊 **Acústica i Aïllament:** Mesuraments in situ de soroll aeri i d'impactes (CTE DB-HR).
• 🦺 **Seguretat i EPIs:** Normativa de seguretat en visites d'obra (casc EN 397, calçat S3, armilla Classe 2).
• 📅 **Planificació de Visites:** Regles d'assignació (Regla A: sense solapaments, Regla B: 30 min de desplaçament entre obres, Regla C: jornada laboral 08:00–17:00).

En quin assaig, procediment normatiu o planificació et puc ajudar avui?`,
    },
    sources: [
      { id: 'DOC-01', title: 'Procedimiento de Muestreo de Hormigón Fresco', category: 'Hormigón' },
      { id: 'DOC-07', title: 'Guía Operativa de Visitas a Obra y Desplazamientos', category: 'Operativa y Logística' },
    ],
  },

  // 2. Cono de Abrams (Asentamiento y consistencia)
  {
    id: 'SEED-ABRAMS',
    coreKeywords: ['cono', 'abrams', 'asentamiento', 'consistencia'],
    queries: {
      es: [
        'cono de abrams',
        'como se mide la consistencia del hormigon con el cono de abrams',
        'ensayo cono de abrams',
        'tolerancia asentamiento hormigon',
        'procedimiento cono abrams',
        'como se hace el cono de abrams',
        'consistencias del hormigon fresco',
      ],
      ca: [
        'con dabrams',
        'con d abrams',
        'com es mesura la consistencia del formigo amb el con dabrams',
        'assaig con dabrams',
        'tolerancia assentament formigo',
        'procediment con dabrams',
        'com es fa el con dabrams',
        'consistencies del formigo fresc',
      ],
    },
    answer: {
      es: `Según el procedimiento técnico oficial **[DOC-01: Procedimiento de Muestreo de Hormigón Fresco y Ensayo de Consistencia (UNE-EN 12350-2)]** y el **Código Estructural (RD 470/2021)**:

### 1. Toma de Muestra en Obra:
• Se realiza durante la descarga de la hormigonera, desechando los primeros **0.2 m³** y los últimos **0.2 m³**.

### 2. Ejecución del Ensayo:
• Se coloca el molde cónico normalizado sobre una base rígida, no absorbente y humedecida.
• El cono se llena en **tres capas de igual volumen**.
• Cada capa se compacta con **25 golpes uniformes** utilizando la varilla normalizada de acero de 16 mm de diámetro con punta semiesférica, distribuidos en espiral y penetrando ligeramente en la capa inferior.
• Se enrasa la superficie y se desmoldea verticalmente con suavidad en un lapso de **2 a 5 segundos**, sin movimientos laterales ni torsión.

### 3. Clasificación de Consistencia y Tolerancias:
• **Seca (S):** Asentamiento 0 - 2 cm (Tolerancia $\pm 10$ mm).
• **Plástica (P):** Asentamiento 3 - 5 cm (Tolerancia $\pm 20$ mm).
• **Blanda (B):** Asentamiento 6 - 9 cm (Tolerancia $\pm 20$ mm).
• **Fluida (F):** Asentamiento 10 - 15 cm (Tolerancia $\pm 20$ mm).
• **Líquida (L):** Asentamiento 16 - 21 cm (Tolerancia $\pm 30$ mm).

*Criterio de Aceptación:* Si el asentamiento difiere en más de $\pm 20$ mm respecto a la consistencia especificada en el albarán, el lote debe ser rechazado inmediatamente y registrado en el acta de control.`,
      ca: `Segons el procediment tècnic oficial **[DOC-01: Procediment de Mostreig de Formigó Fresc i Assaig de Consistència (UNE-EN 12350-2)]** i el **Codi Estructural (RD 470/2021)**:

### 1. Presa de Mostra en Obra:
• Es realitza durant la descàrrega de la formigonera, rebutjant els primers **0.2 m³** i els darrers **0.2 m³**.

### 2. Execució de l'Assaig:
• Es col·loca el motlle cònic normalitzat sobre una base rígida, no absorbent i humitejada.
• El con s'omple en **tres capes d'igual volum**.
• Cada capa es compacta amb **25 cops uniformes** utilitzant la vareta normalitzada d'acer de 16 mm de diàmetre amb punta semiesfèrica, distribuïts en espiral i penetrant lleugerament a la capa inferior.
• S'enrasa la superfície i es desmotlla verticalment amb suavitat en un lapse de **2 a 5 segons**, sense moviments laterals ni torsió.

### 3. Classificació de Consistència i Toleràncies:
• **Seca (S):** Assentament 0 - 2 cm (Tolerància $\pm 10$ mm).
• **Plàstica (P):** Assentament 3 - 5 cm (Tolerància $\pm 20$ mm).
• **Tova (B):** Assentament 6 - 9 cm (Tolerància $\pm 20$ mm).
• **Fluïda (F):** Assentament 10 - 15 cm (Tolerància $\pm 20$ mm).
• **Líquida (L):** Assentament 16 - 21 cm (Tolerància $\pm 30$ mm).

*Criteri d'Acceptació:* Si l'assentament difereix en més de $\pm 20$ mm respecte a la consistència especificada a l'albarà, el lot s'ha de rebutjar immediatament i reflectir a l'acta de control.`,
    },
    sources: [
      { id: 'DOC-01', title: 'Muestreo de Hormigón Fresco y Ensayo de Consistencia (UNE-EN 12350-2)', category: 'Hormigón' },
      { id: 'DOC-08', title: 'Sistema de Gestión de la Calidad ISO 9001', category: 'ISO 9001 y Calidad' },
    ],
  },

  // 3. Probetas a 28 días y rotura a compresión
  {
    id: 'SEED-PROBETAS-28',
    coreKeywords: ['probeta', 'probetas', '28 dias', 'rotura', 'compresion', 'fck'],
    queries: {
      es: [
        'como se realiza el curado y ensayo de probetas de hormigon a 28 dias',
        'rotura de probetas a 28 dias',
        'curado de probetas de hormigon',
        'resistencia caracteristica fck hormigon',
        'ensayo compresion probetas 28 dias',
        'camara humeda probetas hormigon',
        'rotura a 7 dias hormigon',
      ],
      ca: [
        'com es realitza el curat i assaig de provetes de formigo a 28 dies',
        'trencament de provetes a 28 dies',
        'curat de provetes de formigo',
        'resistencia caracteristica fck formigo',
        'assaig compressio provetes 28 dies',
        'cambra humida provetes formigo',
        'trencament a 7 dies formigo',
      ],
    },
    answer: {
      es: `Conforme a **[DOC-01]** y **[DOC-08: Gestión de la Calidad ISO 9001]**, en cumplimiento de las normas **UNE-EN 12390-2**, **UNE-EN 12390-3** y el **Código Estructural Art. 57**:

### 1. Fabricación de Probetas en Obra:
• Se confeccionan series de probetas cilíndricas normalizadas de **15x30 cm** (mínimo 4 probetas por lote de control).
• **2 probetas** se destinan a rotura preventiva a **7 días** (indicador temprano de evolución).
• **2 probetas** se reservan para la rotura contractual definitiva a **28 días** para certificar la resistencia característica $f_{ck}$.

### 2. Primeras 24 Horas y Traslado:
• Las probetas permanecen en obra protegidas del sol, corrientes de aire y vibraciones a temperatura entre **15ºC y 25ºC**.
• El traslado al laboratorio central se ejecuta antes de las **24-36 horas** posteriores al vertido en cajones amortiguados con arena para evitar microfisuras internas.

### 3. Curado en Cámara Húmeda:
• En el laboratorio central se desmoldean y se sumergen inmediatamente en cámara húmeda a **20ºC $\pm$ 2ºC** con una humedad relativa **$\ge$ 95%** (o balsa de agua saturada en cal) hasta el momento del ensayo.

### 4. Ensayo de Rotura a Compresión:
• Se realiza en prensa hidráulica calibrada por entidad ENAC con precisión Clase 1.
• Si a los 7 días no se alcanza el **65% del $f_{ck}$**, se emite un aviso telemático preventivo a la Dirección Facultativa.
• Si el resultado a 28 días no satisface el criterio estadístico del Código Estructural, se abre expediente de **No Conformidad (PNC-04)** con un plazo de 15 días para realizar ensayos no destructivos de contraste (esclerometría UNE-EN 12504-2, ultrasonidos UNE-EN 12504-4 o extracción de testigos taladrados UNE-EN 12504-1).`,
      ca: `D'acord amb **[DOC-01]** i **[DOC-08: Gestió de la Qualitat ISO 9001]**, en compliment de les normes **UNE-EN 12390-2**, **UNE-EN 12390-3** i el **Codi Estructural Art. 57**:

### 1. Fabricació de Provetes en Obra:
• Es confeccionen sèries de provetes cilíndriques normalitzades de **15x30 cm** (mínim 4 provetes per lot de control).
• **2 provetes** es destinen a trencament preventiu a **7 dies** (indicador primerenc d'evolució).
• **2 provetes** es reserven per al trencament contractual definitiu a **28 dies** per certificar la resistència característica $f_{ck}$.

### 2. Primeres 24 Hores i Trasllat:
• Les provetes romanen en obra protegides del sol, corrents d'aire i vibracions a temperatura entre **15ºC i 25ºC**.
• El trasllat al laboratori central s'executa abans de les **24-36 hores** posteriors a l'abocament en caixons esmorteïts amb sorra per evitar microfissures internes.

### 3. Curat en Cambra Humida:
• Al laboratori central es desmotllen i se submergeixen immediatament en cambra humida a **20ºC $\pm$ 2ºC** amb una humitat relativa **$\ge$ 95%** (o bassa d'aigua saturada en calç) fins al moment de l'assaig.

### 4. Assaig de Trencament a Compressió:
• Es realitza en premsa hidràulica calibrada per entitat ENAC amb precisió Classe 1.
• Si als 7 dies no s'assoleix el **65% del $f_{ck}$**, s'emet un avís telemàtic preventiu a la Direcció Facultativa.
• Si el resultat a 28 dies no satisfà el criteri estadístic del Codi Estructural, s'obre expedient de **No Conformitat (PNC-04)** amb un termini de 15 dies per fer assajos no destructius de contrast (esclerometria UNE-EN 12504-2, ultrasons UNE-EN 12504-4 o extracció de testimonis perforats UNE-EN 12504-1).`,
    },
    sources: [
      { id: 'DOC-01', title: 'Muestreo de Hormigón Fresco y Probetas (UNE-EN 12350-2)', category: 'Hormigón' },
      { id: 'DOC-08', title: 'Gestión de la Calidad ISO 9001 y Ensayos de Contraste', category: 'ISO 9001 y Calidad' },
    ],
  },

  // 4. Tiempo de Traslado entre Obras (Regla B)
  {
    id: 'SEED-TRASLADO-30MIN',
    coreKeywords: ['tiempo', 'traslado', 'desplazamiento', 'minutos', 'obras'],
    queries: {
      es: [
        'cuanto tiempo de desplazamiento se requiere entre obras distintas',
        'tiempo de traslado entre obras',
        'regla b desplazamiento',
        'margen de tiempo entre visitas',
        'cuantos minutos de traslado',
        'desplazamiento tecnico 30 minutos',
        'porque se exigen 30 minutos de traslado',
      ],
      ca: [
        'quant de temps de desplacament es requereix entre obres diferents',
        'temps de trasllat entre obres',
        'regla b desplacament',
        'marge de temps entre visites',
        'quants minuts de trasllat',
        'desplacament tecnic 30 minuts',
        'per que sexigeixen 30 minuts de trasllat',
      ],
    },
    answer: {
      es: `Según la **[DOC-07: Guía Operativa de Visitas a Obra, Desplazamientos y Seguridad Laboral]** y el motor de validación del sistema (Regla B):

### 1. Margen entre Obras Diferentes:
• Se exige un margen mínimo estricto de **30 minutos de traslado** entre visitas consecutivas programadas en obras o emplazamientos distintos.
• Este requisito se valida **bidireccionalmente**: tanto con la visita inmediatamente anterior como con la inmediatamente posterior.

### 2. Visitas Consecutivas en la Misma Obra:
• Si dos visitas consecutivas se realizan en el **mismo emplazamiento u obra**, el tiempo de traslado exigido es de **0 minutos** (pueden ser contiguas de forma inmediata, ej. 10:00 a 11:00 y 11:00 a 12:00).

### 3. Fundamento Técnico y Logístico:
• **Seguridad Vial:** Conducción prudente y respeto de los límites de velocidad interurbanos de la Comunidad de Madrid.
• **Mantenimiento Instrumental:** Limpieza, desinfección y secado de equipos de toma de muestras (cono de Abrams, varillas enrasadoras, termómetros digitales, calibres).
• **Custodia de Muestras:** Acondicionamiento seguro de las probetas frescas en los cajones térmicos con arena para evitar golpes y pérdida de humedad durante el transporte.`,
      ca: `Segons la **[DOC-07: Guia Operativa de Visites a Obra, Desplaçaments i Seguretat Laboral]** i el motor de validació del sistema (Regla B):

### 1. Marge entre Obres Diferents:
• S'exigeix un marge mínim estricte de **30 minuts de trasllat** entre visites consecutives programades en obres o emplaçaments diferents.
• Aquest requisit es valida **bidireccionalment**: tant amb la visita immediatament anterior com amb la immediatament posterior.

### 2. Visites Consecutives a la Mateixa Obra:
• Si dues visites consecutives es realitzen al **mateix emplaçament o obra**, el temps de trasllat exigit és de **0 minuts** (poden ser contigües de manera immediata, ex. 10:00 a 11:00 i 11:00 a 12:00).

### 3. Fonament Tècnic i Logístic:
• **Seguretat Viària:** Conducció prudent i respecte dels límits de velocitat interurbans.
• **Manteniment Instrumental:** Neteja, desinfecció i assecat d'equips de presa de mostres (con d'Abrams, varetes enrasadores, termòmetres digitals, calibres).
• **Custòdia de Mostres:** Condicionament segur de les provetes fresques als caixons tèrmics amb sorra per evitar cops i pèrdua d'humitat durant el transport.`,
    },
    sources: [
      { id: 'DOC-07', title: 'Guía Operativa de Visitas a Obra, Desplazamientos y Seguridad Laboral', category: 'Operativa y Logística' },
      { id: 'DOC-05', title: 'Protocolo de Seguridad en Obra y EPIs', category: 'Seguridad y EPIs' },
    ],
  },

  // 5. Sin Solapamientos Horarios (Regla A)
  {
    id: 'SEED-SOLAPAMIENTOS',
    coreKeywords: ['solapamiento', 'solapar', 'visitas', 'tecnico'],
    queries: {
      es: [
        'puede un tecnico tener dos visitas al mismo tiempo',
        'solapamiento de visitas',
        'regla a solapamiento',
        'visitas simultaneas tecnico',
        'se pueden solapar visitas',
        'como funciona la regla a',
      ],
      ca: [
        'pot un tecnic tenir dues visites al mateix temps',
        'solapament de visites',
        'regla a solapament',
        'visites simultanies tecnic',
        'es poden solapar visites',
        'com funciona la regla a',
      ],
    },
    answer: {
      es: `Según la normativa interna de control y planificación **[DOC-07]** (Regla A):

### 1. Regla A: Sin Solapamientos Horarios:
• Un técnico **no puede tener dos visitas programadas simultáneas** en estado activo (\`SCHEDULED\`).
• Matemáticamente, dos intervalos horarios $[S_1, E_1)$ y $[S_2, E_2)$ se solapan si y solo si:
  $$\\max(S_1, S_2) < \\min(E_1, E_2)$$

### 2. Visitas Contiguas:
• Si una visita finaliza exactamente a la hora que inicia la siguiente ($E_1 = S_2$), **no existe solapamiento**. No obstante, si se ubican en obras distintas, deberán cumplir adicionalmente la **Regla B** (30 minutos de traslado).

### 3. Visitas Canceladas (\`CANCELLED\`):
• Las visitas con estado cancelado **liberan su franja horaria de forma inmediata**. No generan solapamiento con nuevas reservas y permanecen registradas exclusivamente para trazabilidad de auditoría ISO 9001.`,
      ca: `Segons la normativa interna de control i planificació **[DOC-07]** (Regla A):

### 1. Regla A: Sense Solapaments Horaris:
• Un tècnic **no pot tenir dues visites programades simultànies** en estat actiu (\`SCHEDULED\`).
• Matemàticament, dos intervals horaris $[S_1, E_1)$ i $[S_2, E_2)$ se solapen si i només si:
  $$\\max(S_1, S_2) < \\min(E_1, E_2)$$

### 2. Visites Contigües:
• Si una visita finalitza exactament a l'hora que inicia la següent ($E_1 = S_2$), **no hi ha solapament**. Això no obstant, si s'ubiquen en obres diferents, hauran de complir addicionalment la **Regla B** (30 minuts de trasllat).

### 3. Visites Cancel·lades (\`CANCELLED\`):
• Les visites amb estat cancel·lat **alliberen la seva franja horària de manera immediata**. No generen solapament amb noves reserves i romanen registrades exclusivament per a traçabilitat d'auditoria ISO 9001.`,
    },
    sources: [
      { id: 'DOC-07', title: 'Guía Operativa de Visitas a Obra y Desplazamientos', category: 'Operativa y Logística' },
    ],
  },

  // 6. Jornada Laboral Estricta (Regla C)
  {
    id: 'SEED-JORNADA-HORARIO',
    coreKeywords: ['jornada', 'horario', '08 00', '17 00', 'laboral', 'tecnicos'],
    queries: {
      es: [
        'cual es el horario de la jornada laboral de los tecnicos',
        'horario de visitas',
        'regla c jornada laboral',
        'jornada 08 00 a 17 00',
        'a que hora empiezan las visitas',
        'limite horario visitas',
      ],
      ca: [
        'quin es lhorari de la jornada laboral dels tecnics',
        'horari de visites',
        'regla c jornada laboral',
        'jornada 08 00 a 17 00',
        'a quina hora comencen les visites',
        'limit horari visites',
      ],
    },
    answer: {
      es: `Conforme a la **[DOC-07: Guía Operativa de Visitas a Obra]** y la validación de negocio (Regla C):

### 1. Jornada Laboral Estricta:
• El horario oficial de inspección técnica en obra está fijado estrictamente de **08:00 a 17:00** en la zona horaria **Europe/Madrid**.
• Toda visita debe comenzar como muy pronto a las **08:00** ($T_{\\text{inicio}} \\ge 480\\text{ min}$).
• Toda visita debe concluir a más tardar a las **17:00** ($T_{\\text{fin}} \\le 1020\\text{ min}$).

### 2. Duración Válida:
• La duración debe ser un número entero mayor a cero minutos ($\\text{duración} > 0$).
• No se permiten visitas que inicien antes de las 08:00 ni intervenciones cuya finalización rebase las 17:00, garantizando el cumplimiento del convenio colectivo de laboratorios de ensayos de la construcción.`,
      ca: `D'acord amb la **[DOC-07: Guia Operativa de Visites a Obra]** i la validació de negoci (Regla C):

### 1. Jornada Laboral Estricta:
• L'horari oficial d'inspecció tècnica en obra està fixat estrictament de **08:00 a 17:00** a la zona horària **Europe/Madrid**.
• Tota visita ha de començar com a molt aviat a les **08:00** ($T_{\\text{inici}} \\ge 480\\text{ min}$).
• Tota visita ha de concloure a tot tardar a les **17:00** ($T_{\\text{fi}} \\le 1020\\text{ min}$).

### 2. Durada Vàlida:
• La durada ha de ser un nombre enter superior a zero minuts ($\\text{durada} > 0$).
• No es permeten visites que comencin abans de les 08:00 ni intervencions la finalització de les quals superi les 17:00, garantint el compliment del conveni col·lectiu de laboratoris d'assajos de la construcció.`,
    },
    sources: [
      { id: 'DOC-07', title: 'Guía Operativa de Visitas a Obra, Desplazamientos y Seguridad Laboral', category: 'Operativa y Logística' },
    ],
  },

  // 7. Equipos de Protección Individual (EPIs)
  {
    id: 'SEED-EPIS-SEGURIDAD',
    coreKeywords: ['epis', 'seguridad', 'obra', 'casco', 'calzado'],
    queries: {
      es: [
        'que epis son obligatorios para las visitas a obra',
        'epis obligatorios obra',
        'equipos de proteccion individual',
        'seguridad en obra epis',
        'que ropa de seguridad debo llevar a la obra',
      ],
      ca: [
        'quins epis son obligatoris per a les visites a obra',
        'epis obligatoris obra',
        'equips de proteccio individual',
        'seguretat en obra epis',
        'quina roba de seguretat he de portar a l obra',
      ],
    },
    answer: {
      es: `Conforme a la **[DOC-05: Protocolo de Seguridad en Obra y Equipos de Protección Individual (EPIs)]** y el **RD 1627/1997**:

### 1. EPIs Obligatorios para Toda Visita a Obra:
• 🪖 **Casco de Seguridad (UNE-EN 397):** Obligatorio en todo el recinto. Debe incorporar barbuquejo en trabajos en altura o zonas con riesgo de viento.
• 🥾 **Calzado de Seguridad S3 (UNE-EN ISO 20345):** Con puntera de acero o composite resistente a impacto de 200 J y lámina textil antiperforación frente a clavos y armaduras.
• 🦺 **Chaleco Reflectante de Alta Visibilidad (UNE-EN ISO 20471 Clase 2):** Imprescindible para ser visible ante maquinaria pesada y hormigoneras.
• 🥽 **Gafas de Protección Ocular (UNE-EN 166):** Certificadas contra salpicaduras cáusticas de lechada de hormigón fresco y partículas en suspensión.
• 🧤 **Guantes de Protección (UNE-EN 388):** Para manipulación de armaduras, varillas de compactación y probetas.

### 2. Trabajos con Riesgo en Altura (> 2 metros):
• Uso obligatorio de **arnés anticaídas de cuerpo entero (UNE-EN 361)** conectado mediante absorbedor a línea de vida certificada (**UNE-EN 795**). Prohibido trabajar en bordes de forjado sin barandilla perimetral reglamentaria.`,
      ca: `D'acord amb la **[DOC-05: Protocol de Seguretat en Obra i Equips de Protecció Individual (EPIs)]** i el **RD 1627/1997**:

### 1. EPIs Obligatoris per a Tota Visita a Obra:
• 🪖 **Casc de Seguretat (UNE-EN 397):** Obligatori a tot el recinte. Ha d'incorporar barbuqueig en treballs en alçada o zones amb risc de vent.
• 🥾 **Calçat de Seguretat S3 (UNE-EN ISO 20345):** Amb puntera d'acer o composite resistent a impacte de 200 J i làmina tèxtil antiperforació davant claus i armadures.
• 🦺 **Armilla Reflectant d'Alta Visibilitat (UNE-EN ISO 20471 Classe 2):** Imprescindible per ser visible davant maquinària pesant i formigoneres.
• 🥽 **Ulleres de Protecció Ocular (UNE-EN 166):** Certificades contra esquitxades càustiques de lletada de formigó fresc i partícules en suspensió.
• 🧤 **Guants de Protecció (UNE-EN 388):** Per a manipulació d'armadures, varetes de compactació i provetes.

### 2. Treballs amb Risc en Alçada (> 2 metres):
• Ús obligatori d'**arnès anticaigudes de cos sencer (UNE-EN 361)** connectat mitjançant absorbidor a línia de vida certificada (**UNE-EN 795**). Prohibit treballar en vores de forjat sense barana perimetral reglamentària.`,
    },
    sources: [
      { id: 'DOC-05', title: 'Protocolo de Seguridad en Obra y Equipos de Protección Individual (EPIs)', category: 'Seguridad y EPIs' },
      { id: 'DOC-07', title: 'Guía Operativa de Visitas a Obra y Desplazamientos', category: 'Operativa y Logística' },
    ],
  },

  // 8. Aceros B500SD y Control de Armaduras
  {
    id: 'SEED-ACERO-B500SD',
    coreKeywords: ['acero', 'b500sd', 'limite elastico', 'ductilidad', 'armaduras'],
    queries: {
      es: [
        'que requisitos debe cumplir el acero corrugado b500sd',
        'acero b500sd',
        'requisitos acero b500sd',
        'limite elastico b500sd',
        'caracteristicas mecanicas acero b500sd',
        'ensayos acero estructural b500sd',
      ],
      ca: [
        'quins requisits ha de complir lacer corrugat b500sd',
        'acer b500sd',
        'requisits acer b500sd',
        'limit elastic b500sd',
        'caracteristiques mecaniques acer b500sd',
        'assajos acer estructural b500sd',
      ],
    },
    answer: {
      es: `De acuerdo con **[DOC-03: Control de Acero Estructural B500SD y Soldeo]**, la norma **UNE 36065** y el **Código Estructural (RD 470/2021 Art. 34)**:

### 1. Definición y Marcado:
• El acero **B500SD** es un acero corrugado soldable (**S**) de **Ductilidad Especial (D)** diseñado para estructuras sismorresistentes y de alta seguridad estructural.
• Debe incorporar marca de calidad oficialmente reconocida (sello AENOR o equivalente).

### 2. Propiedades Mecánicas Exigibles (UNE-EN ISO 15630-1):
• **Límite Elástico Característico ($f_y$):** $\ge 500\\text{ MPa}$ (500 MPa nominales).
• **Resistencia a la Tracción ($f_s$):** $\ge 575\\text{ MPa}$.
• **Relación de Ductilidad:** Relación estricta entre resistencia y límite elástico:
  $$1.15 \\le \\frac{f_s}{f_y} \\le 1.35$$
• **Alargamiento Bajo Carga Máxima ($A_{gt}$):** $\\ge 7.5\\%$.
• **Aptitud al Doblado/Desdoblado:** Ensayo a 90º sin fisuración en la zona traccionada.

### 3. Control de Soldadura:
• Inspección visual al 100% de cordones (UNE-EN ISO 17637) y ensayos no destructivos por Líquidos Penetrantes (UNE-EN ISO 3452-1) o Ultrasonidos en nudos críticos.`,
      ca: `D'acord amb **[DOC-03: Control d'Acer Estructural B500SD i Soldadura]**, la norma **UNE 36065** i el **Codi Estructural (RD 470/2021 Art. 34)**:

### 1. Definició i Marcatge:
• L'acer **B500SD** és un acer corrugat soldable (**S**) de **Ductilitat Especial (D)** dissenyat per a estructures sismoresistents i d'alta seguretat estructural.
• Ha d'incorporar marca de qualitat oficialment reconeguda (segell AENOR o equivalent).

### 2. Propietats Mecàniques Exigibles (UNE-EN ISO 15630-1):
• **Límit Elàstic Característic ($f_y$):** $\\ge 500\\text{ MPa}$ (500 MPa nominals).
• **Resistència a la Tracció ($f_s$):** $\\ge 575\\text{ MPa}$.
• **Relació de Ductilitat:** Relació estricta entre resistència i límit elàstic:
  $$1.15 \\le \\frac{f_s}{f_y} \\le 1.35$$
• **Allargament Sota Càrrega Màxima ($A_{gt}$):** $\\ge 7.5\\%$.
• **Aptitud al Doblegat/Desdoblegat:** Assaig a 90º sense fissuració a la zona traccionada.

### 3. Control de Soldadura:
• Inspecció visual al 100% de cordons (UNE-EN ISO 17637) i assajos no destructius per Líquids Penetrants (UNE-EN ISO 3452-1) o Ultrasons en nusos crítics.`,
    },
    sources: [
      { id: 'DOC-03', title: 'Control de Acero Estructural B500SD y Soldeo en Estructuras Metálicas', category: 'Acero y Estructuras' },
      { id: 'DOC-10', title: 'Control Dimensional y Replanteo de Estructuras (UNE-EN 13670)', category: 'Topografía y Estructuras' },
    ],
  },

  // 9. Geotecnia, Ensayos SPT y Cimentaciones
  {
    id: 'SEED-GEOTECNIA-SPT',
    coreKeywords: ['geotecnia', 'spt', 'cimentaciones', 'dpsh'],
    queries: {
      es: [
        'en que consiste el ensayo spt y el control de cimentaciones',
        'ensayo spt geotecnia',
        'control de cimentaciones',
        'ensayo penetracion dpsh',
        'placa de carga geotecnia',
        'recubrimientos minimos cimentacion',
      ],
      ca: [
        'en que consisteix lassaig spt i el control de fonamentacions',
        'assaig spt geotecnia',
        'control de fonamentacions',
        'assaig penetracio dpsh',
        'placa de carrega geotecnia',
        'recobriments minims fonamentacio',
      ],
    },
    answer: {
      es: `Según el procedimiento técnico oficial **[DOC-02: Protocolo de Ensayos Geotécnicos y Control de Cimentaciones]**:

### 1. Ensayo de Penetración Dinámica Superpesada (DPSH - UNE 103801):
• Se registra el número de golpes $N_{20}$ por cada 20 cm de hinca continua.
• Si se superan los **100 golpes en un tramo de 20 cm**, se declara oficialmente **rechazo técnico**, contrastando la cota alcanzada con el sustrato portante prescrito en el estudio geotécnico.

### 2. Ensayo de Carga con Placa (UNE 103807):
• Empleo de placa de acero de 300 mm o 600 mm de diámetro.
• Determinación de los módulos de deformación de primer ciclo ($E_{v1}$) y segundo ciclo ($E_{v2}$). La relación de compactación $E_{v2}/E_{v1}$ no debe superar **2.2** en rellenos estructurales y explanadas.

### 3. Ensayo SPT (UNE-EN ISO 22476-3):
• Hinca de cuchara tomamuestras bipartida con maza normalizada de 63.5 kg y caída libre de 76 cm, cuantificando la resistencia a penetración estándar $N_{30}$.

### 4. Recubrimientos Mínimos en Cimentaciones:
• Mínimo **50 mm** con separadores homologados de hormigón en contacto con el terreno (sobre hormigón de limpieza).
• Mínimo **70 mm** en cimentaciones hormigonadas directamente contra tierras sin hormigón de limpieza.`,
      ca: `Segons el procediment tècnic oficial **[DOC-02: Protocol d'Assajos Geotècnics i Control de Fonamentacions]**:

### 1. Assaig de Penetració Dinàmica Superpesant (DPSH - UNE 103801):
• Es registra el nombre de cops $N_{20}$ per cada 20 cm d'hincament continu.
• Si se superen els **100 cops en un tram de 20 cm**, es declara oficialment **rebuig tècnic**, contrastant la cota assolida amb el substrat portant prescrit a l'estudi geotècnic.

### 2. Assaig de Càrrega amb Placa (UNE 103807):
• Ocupació de placa d'acer de 300 mm o 600 mm de diàmetre.
• Determinació dels mòduls de deformació de primer cicle ($E_{v1}$) i segon cicle ($E_{v2}$). La relació de compactació $E_{v2}/E_{v1}$ no ha de superar **2.2** en reblerts estructurals i esplanades.

### 3. Assaig SPT (UNE-EN ISO 22476-3):
• Hincament de cullera presa de mostres bipartida amb maça normalitzada de 63.5 kg i caiguda lliure de 76 cm, quantificant la resistència a penetració estàndard $N_{30}$.

### 4. Recobriments Mínims en Fonamentacions:
• Mínim **50 mm** amb separadors homologats de formigó en contacte amb el terreny (sobre formigó de neteja).
• Mínim **70 mm** en fonamentacions formigonades directament contra terres sense formigó de neteja.`,
    },
    sources: [
      { id: 'DOC-02', title: 'Protocolo de Ensayos Geotécnicos y Cimentaciones', category: 'Geotecnia' },
      { id: 'DOC-10', title: 'Control Dimensional y Replanteo de Estructuras (UNE-EN 13670)', category: 'Topografía y Estructuras' },
    ],
  },
];

// ---------------------------------------------------------------------------
// CACHÉ EN MEMORIA (RUNTIME CACHE CON PERSISTENCIA DINÁMICA)
// ---------------------------------------------------------------------------
const runtimeCache = new Map<string, CachedResponse>();

/**
 * Consulta la caché buscando coincidencia exacta (Nivel 1) o semántica (Nivel 2).
 */
export function findInCache(query: string, language: 'ca' | 'es'): CachedResponse | null {
  const normQuery = normalizeText(query);
  if (!normQuery) return null;

  // ---------------------------------------------------------
  // NIVEL 1: Coincidencia Exacta Normalizada
  // ---------------------------------------------------------
  // A) Revisar caché dinámica en memoria
  const dynamicKey = `${language}:${normQuery}`;
  const exactDynamic = runtimeCache.get(dynamicKey);
  if (exactDynamic) {
    return {
      ...exactDynamic,
      matchType: 'exact',
      similarity: 1.0,
      provider: 'cache',
    };
  }

  // B) Revisar banco semilla (Seed Cache)
  for (const seed of SEED_CACHE) {
    const candidateQueries = seed.queries[language] || seed.queries.es;
    for (const q of candidateQueries) {
      if (normalizeText(q) === normQuery) {
        return {
          query,
          normalizedQuery: normQuery,
          language,
          answer: seed.answer[language] || seed.answer.es,
          sources: seed.sources,
          provider: 'cache',
          timestamp: Date.now(),
          matchType: 'exact',
          similarity: 1.0,
        };
      }
    }
  }

  // ---------------------------------------------------------
  // NIVEL 2: Coincidencia Semántica / Jaccard (Umbral > 0.60)
  // ---------------------------------------------------------
  let bestMatch: CachedResponse | null = null;
  let highestScore = 0;

  // 1. Evaluar contra Seeds
  for (const seed of SEED_CACHE) {
    const candidateQueries = seed.queries[language] || seed.queries.es;
    for (const targetQ of candidateQueries) {
      const score = calculateSimilarity(normQuery, targetQ, seed.coreKeywords);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          query,
          normalizedQuery: normQuery,
          language,
          answer: seed.answer[language] || seed.answer.es,
          sources: seed.sources,
          provider: 'cache',
          timestamp: Date.now(),
          matchType: 'semantic',
          similarity: Number(score.toFixed(3)),
        };
      }
    }
  }

  // 2. Evaluar contra entradas dinámicas previas
  for (const entry of runtimeCache.values()) {
    if (entry.language === language) {
      const score = calculateSimilarity(normQuery, entry.normalizedQuery);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          ...entry,
          query,
          normalizedQuery: normQuery,
          matchType: 'semantic',
          similarity: Number(score.toFixed(3)),
          provider: 'cache',
        };
      }
    }
  }

  // Umbral estricto para coincidencia semántica
  if (bestMatch && highestScore >= 0.60) {
    return bestMatch;
  }

  return null;
}

/**
 * Guarda dinámicamente cualquier respuesta generada en la caché en memoria.
 */
export function saveToCache(
  query: string,
  language: 'ca' | 'es',
  answer: string,
  sources: { id: string; title: string; category: string }[],
  provider: string = 'cache'
): void {
  const normQuery = normalizeText(query);
  if (!normQuery || !answer.trim()) return;

  const key = `${language}:${normQuery}`;
  runtimeCache.set(key, {
    query,
    normalizedQuery: normQuery,
    language,
    answer,
    sources,
    provider: 'cache',
    timestamp: Date.now(),
    matchType: 'exact',
    similarity: 1.0,
  });
}

/**
 * Función utilitaria para inspeccionar el tamaño actual de la caché en memoria.
 */
export function getCacheStats(): { size: number; seedsCount: number } {
  return {
    size: runtimeCache.size,
    seedsCount: SEED_CACHE.length,
  };
}

/**
 * Función utilitaria para limpiar la caché dinámica (útil en testing).
 */
export function clearRuntimeCache(): void {
  runtimeCache.clear();
}
