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

  it('debe activar el guardarraíl estricto y responder a secas sin asociar fuentes para preguntas ficticias', async () => {
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
    let sources: any[] | null = null;

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
              if (parsed.sources !== undefined) sources = parsed.sources;
              if (parsed.text) accumulatedText += parsed.text;
            } catch {
              // ignore partial json
            }
          }
        }
      }
    }

    // Comprobar que no alucina y avisa que no consta a secas sin inventar o asociar fuentes
    expect(accumulatedText).toContain('Esta información no consta en la documentación técnica');
    expect(accumulatedText).not.toContain('DOC-01');
    expect(sources).toEqual([]);
  });

  it('debe interceptar consultas sobre trabajadores no pertenecientes a la plantilla oficial', async () => {
    const req = new NextRequest('http://localhost:3000/api/copilot/stream', {
      method: 'POST',
      body: JSON.stringify({
        query: '¿Trabaja Álvaro en el laboratorio realizando ensayos?',
        language: 'es',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let sources: any[] | null = null;

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
              if (parsed.sources !== undefined) sources = parsed.sources;
              if (parsed.text) accumulatedText += parsed.text;
            } catch {}
          }
        }
      }
    }

    expect(accumulatedText).toContain('no forma parte del equipo técnico de la empresa');
    expect(accumulatedText).toContain('Carlos Gómez, Laura Martín, Alejandro Ruiz y Sofía Navarro');
    expect(sources).toEqual([]);
  });

  it('debe responder con la plantilla oficial en catalán para consultas sobre personal inexistente', async () => {
    const req = new NextRequest('http://localhost:3000/api/copilot/stream', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Qui és el tècnic Pere Martínez?',
        language: 'ca',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let sources: any[] | null = null;

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
              if (parsed.sources !== undefined) sources = parsed.sources;
              if (parsed.text) accumulatedText += parsed.text;
            } catch {}
          }
        }
      }
    }

    expect(accumulatedText).toContain("no forma part de l'equip tècnic de l'empresa");
    expect(accumulatedText).toContain('Carlos Gómez, Laura Martín, Alejandro Ruiz i Sofía Navarro');
    expect(sources).toEqual([]);
  });

  it('debe servir desde caché con provider = cache para consultas técnicas precargadas', async () => {
    const req = new NextRequest('http://localhost:3000/api/copilot/stream', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Cono de Abrams',
        language: 'es',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let initialMetadata: any = null;

    const { value } = await reader.read();
    const rawChunk = decoder.decode(value);
    const lines = rawChunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.provider) {
            initialMetadata = parsed;
            break;
          }
        } catch {}
      }
    }

    expect(initialMetadata).not.toBeNull();
    expect(initialMetadata.provider).toBe('cache');
  });

  it('debe responder cordialmente a saludos sin activar el guardarraíl de "no consta"', async () => {
    const req = new NextRequest('http://localhost:3000/api/copilot/stream', {
      method: 'POST',
      body: JSON.stringify({
        query: 'hola',
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
            } catch {}
          }
        }
      }
    }

    expect(accumulatedText).toContain('LabQA Copilot');
    expect(accumulatedText).not.toContain('no consta');
  });
});
