import { technicalDocuments, DocumentSection } from './knowledge';
import { findInCache, saveToCache } from './cache';

export interface RagResponse {
  answer: string;
  sources: { id: string; title: string; category: string }[];
  provider: 'gemini' | 'local-rag' | 'cache';
}

export interface ScoredDoc {
  doc: DocumentSection;
  score: number;
}

// Palabras genéricas y de parada en castellano y catalán que no representan materia técnica
const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'a', 'al', 'en', 'para', 'por', 'con', 'sin',
  'sobre', 'entre', 'hacia', 'hasta', 'desde', 'durante', 'mediante', 'segun', 'contra', 'que', 'como', 'cuando',
  'donde', 'quien', 'cual', 'cuales', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'hay', 'tiene', 'tienen', 'hacer',
  'obra', 'obras', 'visita', 'visitas', 'tecnico', 'tecnicos', 'empresa', 'dia', 'dias', 'este', 'esta', 'estos',
  'aquest', 'aquesta', 'aquests', 'aquestes', 'dels', 'deles', 'amb', 'pero', 'molt', 'sobre', 'quin', 'quins',
  'quina', 'quines', 'on', 'quan', 'com', 'per', 'perque', 'tenir', 'tenir-ne'
]);

/**
 * Recuperador semántico y de palabras clave sobre la base de conocimiento técnico
 */
export function retrieveContext(query: string, maxResults = 3): { docs: DocumentSection[]; bestScore: number } {
  const cleanQuery = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()\[\]{}"'\\\/]/g, ' ');

  const queryWords = cleanQuery
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  if (queryWords.length === 0) {
    return { docs: [technicalDocuments[0]], bestScore: 0 };
  }

  const scoredDocs: ScoredDoc[] = technicalDocuments.map((doc) => {
    let score = 0;
    const docTagsNormalized = doc.tags.map(t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    const docTitleNormalized = doc.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const docContentNormalized = doc.content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const word of queryWords) {
      // Coincidencia en etiquetas (peso 10)
      if (docTagsNormalized.some((tag) => tag.includes(word))) {
        score += 10;
      }
      // Coincidencia en título (peso 7)
      if (docTitleNormalized.includes(word)) {
        score += 7;
      }
      // Coincidencia en contenido técnico
      if (docContentNormalized.includes(word)) {
        score += 4;
      }
    }

    return { doc, score };
  });

  scoredDocs.sort((a, b) => b.score - a.score);

  const bestScore = scoredDocs[0]?.score || 0;
  const filtered = scoredDocs.filter((item) => item.score >= 4).slice(0, maxResults);

  if (filtered.length === 0) {
    return { docs: [scoredDocs[0]?.doc || technicalDocuments[0]], bestScore: 0 };
  }

  return { docs: filtered.map((item) => item.doc), bestScore };
}

/**
 * Consulta RAG con caché exacta/semántica, Google Gemini API (timeout 4s) y fallback local enriquecido
 */
export async function askLabQACopilot({
  query,
  language = 'es',
  visitsContext = '',
}: {
  query: string;
  language?: 'ca' | 'es';
  visitsContext?: string;
}): Promise<RagResponse> {
  // 1. Consultar caché exacta y semántica en primer lugar
  const cached = findInCache(query, language);
  if (cached) {
    return {
      answer: cached.answer,
      sources: cached.sources,
      provider: 'cache',
    };
  }

  const { docs: matchedDocs, bestScore } = retrieveContext(query, 3);
  const apiKey = process.env.GEMINI_API_KEY;
  const isCatalan = language === 'ca';
  const bestDoc = matchedDocs[0] || technicalDocuments[0];

  const sources = matchedDocs.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
  }));

  const contextText = matchedDocs
    .map(
      (d) =>
        `### [${d.id}] ${d.title} (Categoría: ${d.category})\n${d.content.trim()}`
    )
    .join('\n\n');

  const systemPrompt = `
Eres LabQA Copilot, el asistente inteligente y riguroso de control de calidad en obra y ensayos de materiales de construcción.
Tu misión es asistir a directores de obra, inspectores técnicos y coordinadores de laboratorio con precisión técnica.

NORMAS ESTRICTAS DE RESPUESTA (GUARDARRAÍLES ANTI-ALUCINACIÓN):
1. Idioma obligatorio: ${isCatalan ? 'CATALÀ' : 'ESPAÑOL'}.
2. BASA TUS RESPUESTAS EXCLUSIVAMENTE en la DOCUMENTACIÓN TÉCNICA provista a continuación y en el contexto de visitas si aplica.
3. SI LA INFORMACIÓN SOLICITADA NO SE ENCUENTRA EN LA DOCUMENTACIÓN NI EN LOS REGISTROS, TIENES ESTRICTAMENTE PROHIBIDO INVENTAR O ESPECULAR.
   En ese caso, responde claramente:
   "${isCatalan ? 'Aquesta informació no consta a la documentació tècnica ni als registres del sistema.' : 'Esta información no consta en la documentación técnica ni en los registros del sistema.'}"
   Y añade si procede el documento más cercano temáticamente (ej. [DOC-01: ...]), aclarando que no resuelve la cuestión planteada.
4. Cita siempre el código de documento (ej. [DOC-01], [DOC-02]).
5. Sé técnico, conciso y profesional.

DOCUMENTACIÓN TÉCNICA OFICIAL DISPONIBLE:
${contextText}

${visitsContext ? `CONTEXTO OPERATIVO DE VISITAS Y TÉCNICOS:\n${visitsContext}` : ''}
`;

  // 2. Intento con Google Gemini API (modelos oficiales con timeout de 4s)
  const candidateModels = [
    'models/gemini-1.5-flash',
    'models/gemini-2.0-flash',
  ];

  if (apiKey && apiKey.length > 10) {
    for (const model of candidateModels) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: `${systemPrompt}\n\nCONSULTA TÉCNICA DEL USUARIO:\n${query}` },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 600,
              },
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate && candidate.trim().length > 0) {
            const answer = candidate.trim();
            saveToCache(query, language, answer, sources, 'gemini');
            return {
              answer,
              sources,
              provider: 'gemini',
            };
          }
        }
      } catch {
        // En caso de timeout o error HTTP, continuar al siguiente modelo o fallback
      }
    }
  }

  // 3. Fallback Local con Guardarraíl o Respuesta Estructurada
  if (bestScore < 4) {
    const noInfoMsg = isCatalan
      ? `Aquesta informació no consta a la documentació tècnica interna ni als registres de visites del laboratori.\n\nEl procediment més proper per àrea temàtica és **[${bestDoc.id}: ${bestDoc.title}]**, si bé no conté informació específica sobre la consulta formulada.`
      : `Esta información no consta en la documentación técnica interna ni en los registros de visitas del laboratorio.\n\nEl procedimiento más cercano por área temática es **[${bestDoc.id}: ${bestDoc.title}]**, si bien no contiene información específica sobre la consulta planteada.`;

    saveToCache(query, language, noInfoMsg, [{ id: bestDoc.id, title: bestDoc.title, category: bestDoc.category }], 'local-rag');
    return {
      answer: noInfoMsg,
      sources: [{ id: bestDoc.id, title: bestDoc.title, category: bestDoc.category }],
      provider: 'local-rag',
    };
  }

  let localAnswer = '';
  if (isCatalan) {
    localAnswer = `Segons el procediment oficial de control **[${bestDoc.id}: ${bestDoc.title}]**:\n\n` +
      `En relació amb la vostra consulta sobre "*${query}*":\n\n` +
      `• **Àmbit i Normativa:** ${bestDoc.category} d'acord amb el Codi Estructural i normatives UNE-EN de referència.\n` +
      `• **Requisits Tècnics:** ${bestDoc.content.trim().slice(0, 360)}...\n\n` +
      `*Traçabilitat ISO 9001:* Tota actuació en obra ha de quedar registrada a la cadena de custòdia de l'expedient tècnic.`;
  } else {
    localAnswer = `Según el procedimiento oficial de control **[${bestDoc.id}: ${bestDoc.title}]**:\n\n` +
      `En relación a su consulta sobre "*${query}*":\n\n` +
      `• **Ámbito y Normativa:** ${bestDoc.category} de acuerdo con el Código Estructural y normativas UNE-EN de referencia.\n` +
      `• **Requisitos Técnicos:** ${bestDoc.content.trim().slice(0, 360)}...\n\n` +
      `*Trazabilidad ISO 9001:* Toda actuación en obra debe quedar registrada en la cadena de custodia del expediente técnico.`;
  }

  saveToCache(query, language, localAnswer, sources, 'local-rag');

  return {
    answer: localAnswer,
    sources,
    provider: 'local-rag',
  };
}
