import { describe, it, expect } from 'vitest';
import { POST } from '../app/api/copilot/stream/route';
import { NextRequest } from 'next/server';

describe('Streaming API Copilot (/api/copilot/stream)', () => {
  it('debe rechazar consultas vacías con error 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/copilot/stream', {
      method: 'POST',
      body: JSON.stringify({ query: '   ' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('debe devolver un stream SSE con Content-Type text/event-stream para consultas técnicas', async () => {
    const req = new NextRequest('http://localhost:3000/api/copilot/stream', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Cómo se realiza el ensayo de consistencia con el cono de abrams?',
        language: 'es',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
    expect(res.body).toBeDefined();

    // Leer primeros chunks del stream
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const { value } = await reader.read();
    const textChunk = decoder.decode(value);

    expect(textChunk).toContain('data:');
  });

  it('debe activar el guardarraíl estricto y citar procedimiento afín para preguntas ficticias', async () => {
    const req = new NextRequest('http://localhost:3000/api/copilot/stream', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Cuántos dragones voladores custodian el encofrado?',
        language: 'es',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const rawChunk = decoder.decode(value);
      const lines = rawChunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.text) accumulatedText += parsed.text;
            } catch {
              // ignore partial json
            }
          }
        }
      }
    }

    // Comprobar que no alucina y avisa que no consta
    expect(accumulatedText).toContain('Esta información no consta en la documentación técnica');
    expect(accumulatedText).toContain('DOC-01');
  });
});
