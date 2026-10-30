import { NextRequest } from 'next/server';
import { retrieveContext } from '../../../../lib/rag/engine';
import { findInCache, saveToCache } from '../../../../lib/rag/cache';
import { technicalDocuments } from '../../../../lib/rag/knowledge';
import { evaluateGuardrails, OFFICIAL_TECHNICIANS } from '../../../../lib/rag/guardrails';
import { getInitialDataAction } from '../../../../lib/actions/visits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Crea un stream SSE palabra por palabra a partir de un texto completo
 */
function createTextStream(
  text: string,
  sources: { id: string; title: string; category: string }[],
  provider: 'cache' | 'local-rag' | 'gemini'
): ReadableStream {
  const encoder = new TextEncoder();
  const words = text.split(' ');

  return new ReadableStream({
    start(controller) {
      try {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ sources, provider })}\n\n`)
        );

        let idx = 0;
        const interval = setInterval(() => {
          try {
            if (idx < words.length) {
              const textChunk = (idx === 0 ? '' : ' ') + words[idx];
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: textChunk })}\n\n`)
              );
              idx++;
            } else {
              clearInterval(interval);
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            }
          } catch {
            clearInterval(interval);
          }
        }, 15);
      } catch (err) {
        try {
          controller.error(err);
        } catch {
          // Stream ya cerrado o desconectado
        }
      }
    },
  });
}

export async function GET() {
  return Response.json({ status: 'ok' });
}

export async function POST(req: NextRequest) {
  let cleanQuery = '';
  let isCatalan = false;

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const query = typeof body.query === 'string' ? body.query : '';
    const language: 'es' | 'ca' = body.language === 'ca' ? 'ca' : 'es';

    if (!query || typeof query !== 'string' || !query.trim()) {
      return new Response(JSON.stringify({ error: 'La consulta no puede estar vacía.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    cleanQuery = query.trim();
    isCatalan = language === 'ca';

    // -----------------------------------------------------------------------
    // 0. EVALUACIÓN DE GUARDARRAÍLES ANTI-ALUCINACIÓN (Prioridad 0: Blindaje Estricto)
    // -----------------------------------------------------------------------
    const guardrail = evaluateGuardrails(cleanQuery, language);
    if (guardrail && guardrail.isIntercepted) {
      const stream = createTextStream(
        guardrail.answer,
        guardrail.sources,
        'local-rag'
      );
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // -----------------------------------------------------------------------
    // 1. CONSULTA A CACHÉ EXACTA O SEMÁNTICA (Prioridad 1: 0ms Latencia)
    // -----------------------------------------------------------------------
    const cachedResult = findInCache(cleanQuery, language);
    if (cachedResult) {
      const stream = createTextStream(
        cachedResult.answer,
        cachedResult.sources,
        'cache'
      );
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // -----------------------------------------------------------------------
    // 2. RECUPERAR CONTEXTO DOCUMENTAL Y OPERATIVO EN VIVO
    // -----------------------------------------------------------------------
    const { docs: matchedDocs, bestScore } = retrieveContext(cleanQuery, 3);
    const bestDoc = matchedDocs[0] || technicalDocuments[0];

    let visitsContext = '';
    try {
      const initialData = await getInitialDataAction();
      const techsList = initialData.technicians
        .map((t) => `- ${t.name} (Especialidad: ${t.specialty}, Email: ${t.email})`)
        .join('\n');
      const sitesList = initialData.sites
        .map((s) => `- ${s.name} (${s.municipality}, ${s.address})`)
        .join('\n');
      const scheduledVisits = initialData.visits
        .filter((v) => v.status === 'SCHEDULED')
        .map(
          (v) =>
            `- ${v.date} [${v.startTime} - ${v.endTime}]: Técnico ${v.technician?.name || v.technicianId} en ${v.site?.name || v.siteId} (${v.notes || 'Sin notas'})`
        )
        .join('\n');

      visitsContext = `PLANTILLA TÉCNICA OFICIAL:\n${techsList}\n\nOBRAS REGISTRADAS:\n${sitesList}\n\nAGENDA DE VISITAS PROGRAMADAS ACTIVAS:\n${scheduledVisits}`;
    } catch {
      visitsContext = `PLANTILLA TÉCNICA OFICIAL:\n${OFFICIAL_TECHNICIANS.map((name) => `- ${name}`).join('\n')}`;
    }

    const contextText = matchedDocs
      .map((d) => `### [${d.id}] ${d.title} (Categoría: ${d.category})\n${d.content.trim()}`)
      .join('\n\n');

    const sources = matchedDocs.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
    }));

    // -----------------------------------------------------------------------
    // 3. INTENTO CON GOOGLE GEMINI STREAMING (Timeout estricto de 4s)
    // -----------------------------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.length > 10) {
      const systemPrompt = `
Eres LabQA Copilot, el asistente inteligente y riguroso de control de calidad en obra y ensayos de materiales de construcción.
Tu misión es asistir a directores de obra, inspectores técnicos y coordinadores de laboratorio con precisión técnica.

NORMAS ESTRICTAS DE RESPUESTA (GUARDARRAÍLES ANTI-ALUCINACIÓN):
1. Idioma obligatorio: ${isCatalan ? 'CATALÀ' : 'ESPAÑOL'}.
2. BASA TUS RESPUESTAS EXCLUSIVAMENTE en la DOCUMENTACIÓN TÉCNICA provista y en el contexto operativo de visitas y técnicos si aplica.
3. SI LA INFORMACIÓN SOLICITADA NO SE ENCUENTRA EN LA DOCUMENTACIÓN NI EN LOS REGISTROS, TIENES ESTRICTAMENTE PROHIBIDO INVENTAR O ESPECULAR.
   En ese caso responde claramente: "${isCatalan ? "Aquesta informació no consta a la documentació tècnica interna ni als registres de la base de dades de l'empresa." : "Esta información no consta en la documentación técnica interna ni en los registros de la base de datos de la empresa."}"
   PROHIBIDO CITAR O ASOCIAR PROCEDIMIENTOS AFINES SI NO RESPONDEN DIRECTAMENTE A LA PREGUNTA.
4. Cita siempre el código de documento (ej. [DOC-01], [DOC-02]) cuando la información sí conste en la documentación técnica oficial.
5. La plantilla oficial de técnicos homologados se compone ÚNICAMENTE de: ${OFFICIAL_TECHNICIANS.join(', ')}. Ninguna otra persona pertenece al equipo técnico.
6. Sé técnico, conciso y profesional.

DOCUMENTACIÓN TÉCNICA OFICIAL DISPONIBLE:
${contextText}

${visitsContext ? `CONTEXTO OPERATIVO EN VIVO (TÉCNICOS, OBRAS Y VISITAS):\n${visitsContext}` : ''}
`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nCONSULTA TÉCNICA DEL USUARIO:\n${cleanQuery}` }],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 600,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (geminiRes.ok && geminiRes.body) {
          const encoder = new TextEncoder();
          const reader = geminiRes.body.getReader();
          const decoder = new TextDecoder();
          let fullGeneratedText = '';

          const clientStream = new ReadableStream({
            async start(streamController) {
              try {
                streamController.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ sources, provider: 'gemini' })}\n\n`)
                );

                let buffer = '';

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';

                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                      const jsonStr = trimmed.slice(6).trim();
                      if (jsonStr && jsonStr !== '[DONE]') {
                        try {
                          const parsed = JSON.parse(jsonStr);
                          const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                          if (textChunk) {
                            fullGeneratedText += textChunk;
                            streamController.enqueue(
                              encoder.encode(`data: ${JSON.stringify({ text: textChunk })}\n\n`)
                            );
                          }
                        } catch {
                          // Ignorar fragmentos parciales
                        }
                      }
                    }
                  }
                }

                // Guardar respuesta completa en caché para futuras consultas
                if (fullGeneratedText.trim().length > 0) {
                  saveToCache(cleanQuery, language, fullGeneratedText.trim(), sources, 'gemini');
                }

                streamController.enqueue(encoder.encode(`data: [DONE]\n\n`));
                streamController.close();
              } catch (streamError) {
                try {
                  streamController.error(streamError);
                } catch {
                  // Ya cerrado
                }
              }
            },
          });

          return new Response(clientStream, {
            headers: {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              Connection: 'keep-alive',
            },
          });
        }
      } catch (geminiError) {
        console.warn('Gemini stream falló o expiró (timeout 4s), activando fallback local:', geminiError);
      }
    }

    // -----------------------------------------------------------------------
    // 4. FALLBACK LOCAL RAG ENRIQUECIDO
    // -----------------------------------------------------------------------
    if (bestScore < 4) {
      const noInfoMsg = isCatalan
        ? "Aquesta informació no consta a la documentació tècnica interna ni als registres de la base de dades de l'empresa."
        : "Esta información no consta en la documentación técnica interna ni en los registros de la base de datos de la empresa.";

      saveToCache(cleanQuery, language, noInfoMsg, [], 'local-rag');

      const stream = createTextStream(
        noInfoMsg,
        [],
        'local-rag'
      );

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    let localAnswer = '';
    if (isCatalan) {
      localAnswer = `Segons el procediment oficial de control **[${bestDoc.id}: ${bestDoc.title}]**:\n\n` +
        `En relació amb la vostra consulta sobre "*${cleanQuery}*":\n\n` +
        `• **Àmbit i Normativa:** ${bestDoc.category} d'acord amb el Codi Estructural i normatives UNE-EN de referència.\n` +
        `• **Requisits Tècnics:** ${bestDoc.content.trim().slice(0, 360)}...\n\n` +
        `*Traçabilitat ISO 9001:* Tota actuació en obra ha de quedar registrada a la cadena de custòdia de l'expedient tècnic.`;
    } else {
      localAnswer = `Según el procedimiento oficial de control **[${bestDoc.id}: ${bestDoc.title}]**:\n\n` +
        `En relación a su consulta sobre "*${cleanQuery}*":\n\n` +
        `• **Ámbito y Normativa:** ${bestDoc.category} de acuerdo con el Código Estructural y normativas UNE-EN de referencia.\n` +
        `• **Requisitos Técnicos:** ${bestDoc.content.trim().slice(0, 360)}...\n\n` +
        `*Trazabilidad ISO 9001:* Toda actuación en obra debe quedar registrada en la cadena de custodia del expediente técnico.`;
    }

    saveToCache(cleanQuery, language, localAnswer, sources, 'local-rag');

    const stream = createTextStream(localAnswer, sources, 'local-rag');
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    // -----------------------------------------------------------------------
    // 5. BLINDAJE CONTRA ERRORES: NUNCA DEVOLVER ERROR 500 AL CLIENTE
    // -----------------------------------------------------------------------
    console.error('Excepción rescatada en stream handler:', error);
    const rescueDoc = technicalDocuments[0];
    const rescueSources = [{ id: rescueDoc.id, title: rescueDoc.title, category: rescueDoc.category }];

    const rescueAnswer = isCatalan
      ? `Segons la documentació tècnica oficial [${rescueDoc.id}: ${rescueDoc.title}]:\n\nEl laboratori disposa de procediments homologats per al control de qualitat i assajos de construcció d'acord amb el Codi Estructural. Per a consultes específiques sobre planificació o assajos, podeu consultar les seccions tècniques de l'aplicació.`
      : `Según la documentación técnica oficial [${rescueDoc.id}: ${rescueDoc.title}]:\n\nEl laboratorio dispone de procedimientos homologados para el control de calidad y ensayos de construcción de acuerdo con el Código Estructural. Para consultas específicas sobre planificación o ensayos, puede consultar las secciones técnicas de la aplicación.`;

    const stream = createTextStream(rescueAnswer, rescueSources, 'local-rag');
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }
}
