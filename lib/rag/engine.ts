import { technicalDocuments, DocumentSection } from './knowledge';

export interface RagResponse {
  answer: string;
  sources: { id: string; title: string; category: string }[];
  provider: 'gemini' | 'local-rag';
}

/**
 * Recuperador semántico y de palabras clave sobre la base de conocimiento técnico
 */
export function retrieveContext(query: string, maxResults = 3): DocumentSection[] {
  const queryWords = query
    .toLowerCase()
    .replace(/[¿?¡!.,;:()]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scoredDocs = technicalDocuments.map((doc) => {
    let score = 0;
    const docText = `${doc.title} ${doc.content} ${doc.tags.join(' ')}`.toLowerCase();

    for (const word of queryWords) {
      if (doc.tags.some((tag) => tag.toLowerCase().includes(word))) score += 5;
      if (doc.title.toLowerCase().includes(word)) score += 3;
      const occurrences = (docText.match(new RegExp(word, 'g')) || []).length;
      score += Math.min(occurrences, 6);
    }

    return { doc, score };
  });

  scoredDocs.sort((a, b) => b.score - a.score);

  const selected = scoredDocs.filter((item) => item.score > 0).slice(0, maxResults);

  // Si no hubo coincidencia estricta, devolvemos al menos los 2 documentos principales
  if (selected.length === 0) {
    return technicalDocuments.slice(0, 2);
  }

  return selected.map((item) => item.doc);
}

/**
 * Consulta RAG utilizando Google Gemini API con fallback local enriquecido
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
  const matchedDocs = retrieveContext(query, 3);
  const apiKey = process.env.GEMINI_API_KEY;

  const contextText = matchedDocs
    .map(
      (d) =>
        `### [${d.id}] ${d.title} (${d.category})\n${d.content.trim()}`
    )
    .join('\n\n');

  const systemPrompt = `
Eres LabQA Copilot, el asistente inteligente de inteligencia artificial de una prestigiosa empresa de control de calidad de la construcción y ensayos de materiales acreditada en Terrassa (Barcelona).
Tu misión es asistir a ingenieros, directores facultativos de obra y técnicos de laboratorio.

INSTRUCCIONES CLAVE:
1. Idioma obligatorio de respuesta: ${language === 'ca' ? 'CATALÀ (utilitza vocabulari tècnic precís de la construcció i laboratoris d\'assaig de Catalunya)' : 'ESPAÑOL (utiliza vocabulario técnico riguroso de la construcción, Código Estructural y normativa UNE)'}.
2. Basa tus respuestas exclusivamente en la DOCUMENTACIÓN TÉCNICA provista a continuación y en el contexto de visitas si aplica.
3. Cita siempre el documento o norma de referencia (ej. [DOC-01: UNE-EN 12350-2], [DOC-03: ISO 9001]).
4. Sé conciso, técnico, estructurado y directo. No uses frases de relleno.

DOCUMENTACIÓN TÉCNICA INTERNA (TERRASSA LAB):
${contextText}

${visitsContext ? `CONTEXTO DE VISITAS Y TÉCNICOS ACTUAL:\n${visitsContext}` : ''}
`;

  // 1. Intento de llamada a Gemini API si hay API Key disponible
  if (apiKey && apiKey.length > 10) {
    try {
      // Intentamos con gemini-1.5-flash y gemini-2.5-flash
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: `${systemPrompt}\n\nPREGUNTA DEL USUARIO:\n${query}` },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 800,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          return {
            answer: candidate.trim(),
            sources: matchedDocs.map((d) => ({ id: d.id, title: d.title, category: d.category })),
            provider: 'gemini',
          };
        }
      } else {
        console.warn('Gemini API devolvió status no-ok:', response.status);
      }
    } catch (apiError) {
      console.warn('Error conectando a Gemini API, activando fallback local:', apiError);
    }
  }

  // 2. Fallback Local Semántico de Alta Fidelidad
  const bestDoc = matchedDocs[0];
  const isCatalan = language === 'ca';

  let localAnswer = '';
  if (isCatalan) {
    localAnswer = `Segons el procediment intern de control de qualitat a Terrassa **[${bestDoc.id}: ${bestDoc.title}]**:\n\n` +
      `Per a la consulta plantejada ("*${query}*"), el protocol tècnic estableix:\n\n` +
      `• **Normativa aplicable:** ${bestDoc.category} segons UNE-EN i Codi Estructural.\n` +
      `• **Procediment operatiu:** ${bestDoc.content.trim().slice(0, 320)}...\n\n` +
      `*Nota de traçabilitat ISO 9001:* Tota mostra recollida en obra ha de registrar-se a la cadena de custòdia abans del seu ingrés a les cambres de curat del laboratori de Terrassa.`;
  } else {
    localAnswer = `Según el procedimiento interno de control de calidad en Terrassa **[${bestDoc.id}: ${bestDoc.title}]**:\n\n` +
      `Para la consulta planteada ("*${query}*"), el protocolo técnico establece:\n\n` +
      `• **Normativa aplicable:** ${bestDoc.category} según UNE-EN y Código Estructural.\n` +
      `• **Procedimiento operativo:** ${bestDoc.content.trim().slice(0, 320)}...\n\n` +
      `*Nota de trazabilidad ISO 9001:* Toda probeta o lote de obra debe incorporar precinto inviolable y registrarse en la cadena de custodia antes de su entrada a las cámaras húmedas de curado (20ºC ± 2ºC).`;
  }

  return {
    answer: localAnswer,
    sources: matchedDocs.map((d) => ({ id: d.id, title: d.title, category: d.category })),
    provider: 'local-rag',
  };
}
