import { describe, it, expect, beforeEach } from 'vitest';
import {
  findInCache,
  saveToCache,
  normalizeText,
  extractKeywords,
  calculateSimilarity,
  clearRuntimeCache,
  getCacheStats,
} from '../lib/rag/cache';
import { askLabQACopilot } from '../lib/rag/engine';

describe('Sistema de Caché Exacta y Semántica para LabQA Copilot', () => {
  beforeEach(() => {
    clearRuntimeCache();
  });

  describe('Normalización y Utilidades Léxicas', () => {
    it('elimina tildes, signos de puntuación y pasa a minúsculas', () => {
      const input = '¿Cómo se mide el Asentamiento con el CONO de Abrams?!';
      const normalized = normalizeText(input);
      expect(normalized).toBe('como se mide el asentamiento con el cono de abrams');
    });

    it('extrae palabras clave excluyendo stop words', () => {
      const normalized = 'como se mide el asentamiento con el cono de abrams';
      const keywords = extractKeywords(normalized);
      expect(keywords).toContain('asentamiento');
      expect(keywords).toContain('cono');
      expect(keywords).toContain('abrams');
      expect(keywords).not.toContain('como');
      expect(keywords).not.toContain('el');
      expect(keywords).not.toContain('con');
    });

    it('calcula similitud alta para consultas idénticas o casi idénticas', () => {
      const s1 = calculateSimilarity('cono de abrams', 'cono de abrams');
      expect(s1).toBe(1.0);

      const s2 = calculateSimilarity(
        'como se hace el cono de abrams',
        'cono de abrams',
        ['cono', 'abrams']
      );
      expect(s2).toBeGreaterThanOrEqual(0.60);
    });
  });

  describe('Nivel 1: Coincidencia Exacta Normalizada', () => {
    it('responde instantáneamente a un saludo exacto (Seed)', () => {
      const resEs = findInCache('hola', 'es');
      expect(resEs).not.toBeNull();
      expect(resEs?.matchType).toBe('exact');
      expect(resEs?.provider).toBe('cache');
      expect(resEs?.answer).toContain('LabQA Copilot');

      const resCa = findInCache('bon dia', 'ca');
      expect(resCa).not.toBeNull();
      expect(resCa?.matchType).toBe('exact');
      expect(resCa?.answer).toContain('LabQA Copilot');
    });

    it('responde a consultas técnicas exactas normalizadas (Cono de Abrams)', () => {
      const result = findInCache('¿Cono de Abrams?', 'es');
      expect(result).not.toBeNull();
      expect(result?.matchType).toBe('exact');
      expect(result?.answer).toContain('UNE-EN 12350-2');
      expect(result?.answer).toContain('asentamiento');
    });

    it('responde a consultas técnicas exactas sobre probetas a 28 días', () => {
      const result = findInCache('rotura de probetas a 28 dias', 'es');
      expect(result).not.toBeNull();
      expect(result?.matchType).toBe('exact');
      expect(result?.answer).toContain('UNE-EN 12390-3');
      expect(result?.answer).toContain('cámara húmeda');
    });
  });

  describe('Nivel 2: Coincidencia Semántica y Léxica (> 0.60)', () => {
    it('detecta variaciones semánticas del Cono de Abrams', () => {
      const result = findInCache('explicame como medir la consistencia del cono de abrams en obra', 'es');
      expect(result).not.toBeNull();
      expect(result?.matchType).toBe('semantic');
      expect(result?.similarity).toBeGreaterThanOrEqual(0.60);
      expect(result?.answer).toContain('UNE-EN 12350-2');
    });

    it('detecta variaciones sobre probetas a 28 días y fck', () => {
      const result = findInCache('como se rompen las probetas a los 28 dias para fck', 'es');
      expect(result).not.toBeNull();
      expect(result?.similarity).toBeGreaterThanOrEqual(0.60);
      expect(result?.answer).toContain('15x30 cm');
    });

    it('detecta preguntas sobre tiempo de traslado entre obras distintas (Regla B)', () => {
      const result = findInCache('cuantos minutos de traslado se necesitan entre dos obras distintas', 'es');
      expect(result).not.toBeNull();
      expect(result?.similarity).toBeGreaterThanOrEqual(0.60);
      expect(result?.answer).toContain('30 minutos de traslado');
      expect(result?.answer).toContain('0 minutos');
    });

    it('detecta preguntas sobre solapamiento de visitas (Regla A)', () => {
      const result = findInCache('se pueden solapar dos visitas de un mismo tecnico a la vez', 'es');
      expect(result).not.toBeNull();
      expect(result?.similarity).toBeGreaterThanOrEqual(0.60);
      expect(result?.answer).toContain('Sin Solapamientos Horarios');
    });

    it('detecta preguntas sobre la jornada laboral (Regla C)', () => {
      const result = findInCache('cual es el horario de trabajo y jornada laboral de los tecnicos', 'es');
      expect(result).not.toBeNull();
      expect(result?.similarity).toBeGreaterThanOrEqual(0.60);
      expect(result?.answer).toContain('08:00 a 17:00');
    });

    it('detecta preguntas sobre EPIs de seguridad obligatorios', () => {
      const result = findInCache('que ropa de seguridad y epis tengo que llevar a la obra', 'es');
      expect(result).not.toBeNull();
      expect(result?.similarity).toBeGreaterThanOrEqual(0.60);
      expect(result?.answer).toContain('UNE-EN 397');
      expect(result?.answer).toContain('S3');
      expect(result?.answer).toContain('Chaleco Reflectante');
    });

    it('detecta preguntas sobre el acero corrugado B500SD', () => {
      const result = findInCache('cuales son los requisitos mecanicos del acero b500sd', 'es');
      expect(result).not.toBeNull();
      expect(result?.similarity).toBeGreaterThanOrEqual(0.60);
      expect(result?.answer).toContain('B500SD');
      expect(result?.answer).toContain('500 MPa');
    });

    it('detecta preguntas sobre geotecnia y ensayo SPT', () => {
      const result = findInCache('en que consiste el ensayo de geotecnia spt y las cimentaciones', 'es');
      expect(result).not.toBeNull();
      expect(result?.similarity).toBeGreaterThanOrEqual(0.60);
      expect(result?.answer).toContain('SPT');
      expect(result?.answer).toContain('DPSH');
    });

    it('funciona con consultas en catalán sobre trasllat i con dabrams', () => {
      const resCa1 = findInCache('quant de temps cal per trasllat entre obres', 'ca');
      expect(resCa1).not.toBeNull();
      expect(resCa1?.answer).toContain('30 minuts');

      const resCa2 = findInCache('com es fa lassaig del con dabrams', 'ca');
      expect(resCa2).not.toBeNull();
      expect(resCa2?.answer).toContain('UNE-EN 12350-2');
    });
  });

  describe('Caché Dinámica en Tiempo de Ejecución (saveToCache)', () => {
    it('almacena una respuesta y la devuelve de inmediato en la siguiente consulta', () => {
      const customQuery = 'cual es el procedimiento para cubiertas planas invertidas';
      const customAnswer = 'Para cubiertas planas invertidas se realiza la prueba de inundación durante 48 horas según DOC-06.';
      const customSources = [{ id: 'DOC-06', title: 'Control de Cubiertas', category: 'Cubiertas y Fachadas' }];

      // Inicialmente no está en caché
      expect(findInCache(customQuery, 'es')).toBeNull();

      // Guardar dinámicamente
      saveToCache(customQuery, 'es', customAnswer, customSources, 'local-rag');

      // Comprobar estadísticas
      const stats = getCacheStats();
      expect(stats.size).toBe(1);

      // Ahora debe encontrarse inmediatamente como coincidencia exacta
      const cached = findInCache('¿Cuál es el procedimiento para cubiertas planas invertidas?', 'es');
      expect(cached).not.toBeNull();
      expect(cached?.matchType).toBe('exact');
      expect(cached?.answer).toBe(customAnswer);
      expect(cached?.provider).toBe('cache');
    });
  });

  describe('Integración con askLabQACopilot', () => {
    it('utiliza la caché y devuelve provider = cache para consultas técnicas semánticas', async () => {
      const res = await askLabQACopilot({
        query: 'Cono de abrams y consistencia del hormigon',
        language: 'es',
      });

      expect(res.provider).toBe('cache');
      expect(res.answer).toContain('UNE-EN 12350-2');
      expect(res.sources.length).toBeGreaterThan(0);
    });

    it('aplica guardarraíl sin fallos 500 para preguntas sin relación técnica', async () => {
      const res = await askLabQACopilot({
        query: 'receta para hacer paella valenciana con marisco',
        language: 'es',
      });

      expect(res.provider).toBe('local-rag');
      expect(res.answer).toContain('no consta');
      expect(res.sources).toEqual([]);
    });

    it('aplica guardarraíl estricto para preguntas sobre trabajadores no pertenecientes a la plantilla', async () => {
      const res = await askLabQACopilot({
        query: '¿Trabaja Álvaro en el laboratorio?',
        language: 'es',
      });

      expect(res.provider).toBe('local-rag');
      expect(res.answer).toContain('no forma parte del equipo técnico');
      expect(res.answer).toContain('Carlos Gómez, Laura Martín, Alejandro Ruiz y Sofía Navarro');
      expect(res.sources).toEqual([]);
    });
  });
});
