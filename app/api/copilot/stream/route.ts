import { NextRequest } from 'next/server';
import { retrieveContext } from '@/lib/rag/engine';
import { getVisitsAction } from '@/lib/actions/visits';
import { technicalDocuments } from '@/lib/rag/knowledge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, language = 'es' } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return new Response(JSON.stringify({ error: 'La consulta no puede estar vacía.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanQuery = query.trim();
    const isCatalan = language === 'ca';

    // 1. Recuperar contexto documental
    const { docs: matchedDocs, bestScore } = retrieveContext(cleanQuery, 3);
    const bestDoc = matchedDocs[0] || technicalDocuments[0];

    // 2. Obtener resumen de visitas de hoy para enriquecer contexto operativo
    let visitsContext = '';
    try {
      const today = new Date().toISOString().split('T')[0];
      const visits = await getVisitsAction({ date: today });
      visitsContext = visits
        .map(
          (v) =>
            `- ${v.startTime} a ${v.endTime}: Técnico ${v.technician?.name || v.technicianId} en "${v.site?.name || v.siteId}" (${v.site?.municipality || 'Sede'}) [Estado: ${v.status}]`
        )
        .join('\n');
    } catch {
      // Ignorar fallo de visitas si no hay DB
    }

    const contextText = matchedDocs
      .map((d) => `### [${d.id}] ${d.title} (Categoría: ${d.category})\n${d.content.trim()}`)
      .join('\n\n');

    const sources = matchedDocs.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
    }));

    // 3. Si la pregunta es claramente inventada o fuera de alcance (bestScore < 4), responder de inmediato con guardarraíl
    if (bestScore < 4) {
      const noInfoMsg = isCatalan
        ? `Aquesta informació no consta a la documentació tècnica interna ni als registres de visites del laboratori.\n\nEl procediment més proper per àrea temàtica és **[${bestDoc.id}: ${bestDoc.title}]**, si bé no conté informació específica sobre la consulta formulada.`
        : `Esta información no consta en la documentación técnica interna ni en los registros de visitas del laboratorio.\n\nEl procedimiento más cercano por área temática es **[${bestDoc.id}: ${bestDoc.title}]**, si bien no contiene información específica sobre la consulta planteada.`;

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Enviar fuentes iniciales
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ sources, provider: 'local-rag' })}\n\n`)
          );
          // Simular stream palabra por palabra para suavidad perceptual
          const words = noInfoMsg.split(' ');
          let idx = 0;
          const interval = setInterval(() => {
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
          }, 25);
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 4. Intento con Google Gemini Streaming API (SSE)
    if (apiKey && apiKey.length > 10) {
      const systemPrompt = `
Eres LabQA Copilot, el asistente inteligente y riguroso de control de calidad en obra y ensayos de materiales de construcción.
Tu misión es asistir a directores de obra, inspectores técnicos y coordinadores de laboratorio con precisión técnica.

NORMAS ESTRICTAS DE RESPUESTA (GUARDARRAÍLES ANTI-ALUCINACIÓN):
1. Idioma obligatorio: ${isCatalan ? 'CATALÀ' : 'ESPAÑOL'}.
2. BASA TUS RESPUESTAS EXCLUSIVAMENTE en la DOCUMENTACIÓN TÉCNICA provista y en el contexto de visitas si aplica.
3. SI LA INFORMACIÓN SOLICITADA NO SE ENCUENTRA EN LA DOCUMENTACIÓN NI EN LOS REGISTROS, TIENES ESTRICTAMENTE PROHIBIDO INVENTAR O ESPECULAR.
   En ese caso responde claramente que la información no figura en los procedimientos disponibles y menciona cuál es el más afín.
4. Cita siempre el código de documento (ej. [DOC-01], [DOC-02]).
5. Sé técnico, conciso y profesional.

DOCUMENTACIÓN TÉCNICA OFICIAL DISPONIBLE:
${contextText}

${visitsContext ? `CONTEXTO OPERATIVO DE VISITAS Y TÉCNICOS:\n${visitsContext}` : ''}
`;

      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

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
        });

        if (geminiRes.ok && geminiRes.body) {
          const encoder = new TextEncoder();
          const reader = geminiRes.body.getReader();
          const decoder = new TextDecoder();

          const clientStream = new ReadableStream({
            async start(controller) {
              // Enviar fuentes iniciales
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ sources, provider: 'gemini' })}\n\n`)
              );

              let buffer = '';

              try {
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
                            controller.enqueue(
                              encoder.encode(`data: ${JSON.stringify({ text: textChunk })}\n\n`)
                            );
                          }
                        } catch {
                          // Ignorar fragmentos JSON intermedios incompletos
                        }
                      }
                    }
                  }
                }

                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                controller.close();
              } catch (streamError) {
                controller.error(streamError);
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
        console.warn('Gemini stream falló, activando fallback local:', geminiError);
      }
    }

    // 5. Fallback Local Streaming
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

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ sources, provider: 'local-rag' })}\n\n`)
        );
        const words = localAnswer.split(' ');
        let idx = 0;
        const interval = setInterval(() => {
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
        }, 20);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error general en stream handler:', error);
    return new Response(JSON.stringify({ error: 'Error interno en el servicio de streaming.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
