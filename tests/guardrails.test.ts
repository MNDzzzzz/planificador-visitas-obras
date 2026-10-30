import { describe, it, expect } from 'vitest';
import { evaluateGuardrails, OFFICIAL_TECHNICIANS } from '../lib/rag/guardrails';

describe('Blindaje de Copilot: Guardarraíles Anti-Alucinación (lib/rag/guardrails.ts)', () => {
  describe('Plantilla Oficial de Técnicos', () => {
    it('declara exactamente a los 4 técnicos homologados de la empresa', () => {
      expect(OFFICIAL_TECHNICIANS).toEqual([
        'Carlos Gómez',
        'Laura Martín',
        'Alejandro Ruiz',
        'Sofía Navarro',
      ]);
    });
  });

  describe('Guardarraíl 1: Consultas Fuera de Dominio (Out-of-Domain)', () => {
    it('intercepta preguntas sobre seres fantásticos o dragones en español con sources vacíos', () => {
      const res = evaluateGuardrails('¿Cuántos dragones voladores custodian el encofrado?', 'es');
      expect(res).not.toBeNull();
      expect(res?.isIntercepted).toBe(true);
      expect(res?.answer).toBe(
        'Esta información no consta en la documentación técnica interna ni en los registros de la base de datos de la empresa.'
      );
      expect(res?.sources).toEqual([]);
    });

    it('intercepta preguntas sobre dragones en catalán con sources vacíos', () => {
      const res = evaluateGuardrails('Quants dracs vigilen el formigó?', 'ca');
      expect(res).not.toBeNull();
      expect(res?.isIntercepted).toBe(true);
      expect(res?.answer).toBe(
        "Aquesta informació no consta a la documentació tècnica interna ni als registres de la base de dades de l'empresa."
      );
      expect(res?.sources).toEqual([]);
    });

    it('intercepta recetas de cocina y gastronomía', () => {
      const res = evaluateGuardrails('dame la receta tradicional de la paella valenciana con marisco', 'es');
      expect(res).not.toBeNull();
      expect(res?.isIntercepted).toBe(true);
      expect(res?.answer).toContain('Esta información no consta');
      expect(res?.sources).toEqual([]);
    });

    it('intercepta consultas sobre deportes o fútbol', () => {
      const res = evaluateGuardrails('quién ganó la final de la champions league?', 'es');
      expect(res).not.toBeNull();
      expect(res?.isIntercepted).toBe(true);
      expect(res?.sources).toEqual([]);
    });

    it('intercepta consultas sobre cine y entretenimiento', () => {
      const res = evaluateGuardrails('cuál es la mejor película de netflix este año?', 'es');
      expect(res).not.toBeNull();
      expect(res?.isIntercepted).toBe(true);
      expect(res?.sources).toEqual([]);
    });

    it('intercepta chistes, astrología u horóscopos', () => {
      const res = evaluateGuardrails('cuéntame un chiste sobre ingenieros', 'es');
      expect(res).not.toBeNull();
      expect(res?.isIntercepted).toBe(true);
      expect(res?.sources).toEqual([]);
    });
  });

  describe('Guardarraíl 2: Consultas sobre Trabajadores Ficticios o No en Plantilla', () => {
    it('intercepta consulta sobre técnico no perteneciente a la plantilla (Álvaro)', () => {
      const res = evaluateGuardrails('¿Trabaja Álvaro en el laboratorio de control de calidad?', 'es');
      expect(res).not.toBeNull();
      expect(res?.isIntercepted).toBe(true);
      expect(res?.answer).toBe(
        'El técnico o empleado consultado no forma parte del equipo técnico de la empresa. La plantilla oficial de técnicos homologados se compone exclusivamente de: Carlos Gómez, Laura Martín, Alejandro Ruiz y Sofía Navarro.'
      );
      expect(res?.sources).toEqual([]);
    });

    it('intercepta consulta en catalán sobre técnico no oficial (Pere)', () => {
      const res = evaluateGuardrails('Qui és el tècnic Pere Martínez?', 'ca');
      expect(res).not.toBeNull();
      expect(res?.isIntercepted).toBe(true);
      expect(res?.answer).toBe(
        "El tècnic o empleat consultat no forma part de l'equip tècnic de l'empresa. La plantilla oficial de tècnics homologats es compon exclusivament de: Carlos Gómez, Laura Martín, Alejandro Ruiz i Sofía Navarro."
      );
      expect(res?.sources).toEqual([]);
    });

    it('intercepta consultas con nombres comunes no pertenecientes a la plantilla (David, Juan, Marta, Pedro)', () => {
      const resPedro = evaluateGuardrails('¿Pedro realiza visitas o ensayos de hormigón?', 'es');
      expect(resPedro?.isIntercepted).toBe(true);
      expect(resPedro?.answer).toContain('no forma parte del equipo técnico');
      expect(resPedro?.answer).toContain('Carlos Gómez, Laura Martín, Alejandro Ruiz y Sofía Navarro');
      expect(resPedro?.sources).toEqual([]);

      const resJuan = evaluateGuardrails('¿Juan realiza visitas de obra?', 'es');
      expect(resJuan?.isIntercepted).toBe(true);
      expect(resJuan?.sources).toEqual([]);

      const resDavid = evaluateGuardrails('¿Quién es David?', 'es');
      expect(resDavid?.isIntercepted).toBe(true);
      expect(resDavid?.sources).toEqual([]);

      const resMarta = evaluateGuardrails('¿Qué inspecciones tiene Marta hoy?', 'es');
      expect(resMarta?.isIntercepted).toBe(true);
      expect(resMarta?.sources).toEqual([]);
    });

    it('responde directamente la plantilla homologada ante preguntas sobre el listado del equipo', () => {
      const res = evaluateGuardrails('¿Quiénes son los técnicos de la empresa?', 'es');
      expect(res).not.toBeNull();
      expect(res?.isIntercepted).toBe(true);
      expect(res?.answer).toBe(
        'La plantilla oficial de técnicos homologados de la empresa se compone exclusivamente de: Carlos Gómez, Laura Martín, Alejandro Ruiz y Sofía Navarro.'
      );
      expect(res?.sources).toEqual([]);

      const resCa = evaluateGuardrails('Quina és la plantilla de tècnics de la empresa?', 'ca');
      expect(resCa?.isIntercepted).toBe(true);
      expect(resCa?.answer).toContain("La plantilla oficial de tècnics homologats de l'empresa");
    });
  });

  describe('Guardarraíl 0: Comando /help y Manual del Sistema', () => {
    it('intercepta inmediatamente /help en castellano con sources DOC-00 y DOC-12', () => {
      const res = evaluateGuardrails('/help', 'es');
      expect(res).not.toBeNull();
      expect(res?.isIntercepted).toBe(true);
      expect(res?.answer).toContain('LabQA Copilot — Manual del Sistema y Hoja de Ruta (/help)');
      expect(res?.answer).toContain('¿Qué hace esta aplicación?');
      expect(res?.answer).toContain('Marco Temporal de Desarrollo (Prueba Técnica de ~3 Horas)');
      expect(res?.answer).toContain('Mejoras Futuras Prioritarias (Hoja de Ruta a Producción)');
      expect(res?.sources).toEqual([
        {
          id: 'DOC-00',
          title: 'Manual del Sistema, Arquitectura y Tecnologías del Planificador',
          category: 'Arquitectura y Sistema',
        },
        {
          id: 'DOC-12',
          title: 'Hoja de Ruta, Limitación de 3 Horas y Mejoras Futuras',
          category: 'Hoja de Ruta y Roadmap',
        },
      ]);
    });

    it('intercepta variantes como /ayuda, /ajuda y help en catalán', () => {
      const resCa = evaluateGuardrails('/ajuda', 'ca');
      expect(resCa).not.toBeNull();
      expect(resCa?.isIntercepted).toBe(true);
      expect(resCa?.answer).toContain('LabQA Copilot — Manual del Sistema i Full de Ruta (/help)');
      expect(resCa?.answer).toContain('Què fa aquesta aplicació?');
      expect(resCa?.sources.length).toBe(2);

      const resHelp = evaluateGuardrails('help', 'es');
      expect(resHelp?.isIntercepted).toBe(true);

      const resAyuda = evaluateGuardrails('/ayuda', 'es');
      expect(resAyuda?.isIntercepted).toBe(true);
    });

    it('responde con el manual y fuentes DOC-00 y DOC-12 ante "¿Cómo funciona esta app?"', () => {
      const res = evaluateGuardrails('¿Cómo funciona esta app?', 'es');
      expect(res).not.toBeNull();
      expect(res?.isIntercepted).toBe(true);
      expect(res?.answer).toContain('¿Qué hace esta aplicación?');
      expect(res?.sources).toEqual([
        {
          id: 'DOC-00',
          title: 'Manual del Sistema, Arquitectura y Tecnologías del Planificador',
          category: 'Arquitectura y Sistema',
        },
        {
          id: 'DOC-12',
          title: 'Hoja de Ruta, Limitación de 3 Horas y Mejoras Futuras',
          category: 'Hoja de Ruta y Roadmap',
        },
      ]);
    });

    it('responde con el manual y fuentes DOC-00 y DOC-12 ante "¿Qué tecnologías usa el proyecto?"', () => {
      const res = evaluateGuardrails('¿Qué tecnologías usa el proyecto?', 'es');
      expect(res).not.toBeNull();
      expect(res?.isIntercepted).toBe(true);
      expect(res?.answer).toContain('¿Qué hace esta aplicación?');
      expect(res?.sources).toEqual([
        {
          id: 'DOC-00',
          title: 'Manual del Sistema, Arquitectura y Tecnologías del Planificador',
          category: 'Arquitectura y Sistema',
        },
        {
          id: 'DOC-12',
          title: 'Hoja de Ruta, Limitación de 3 Horas y Mejoras Futuras',
          category: 'Hoja de Ruta y Roadmap',
        },
      ]);
    });

    it('NO bloquea preguntas sobre la arquitectura o tecnologías del sistema como fuera de dominio', () => {
      const resArch = evaluateGuardrails('¿Qué tecnologías y stack utiliza este sistema?', 'es');
      if (resArch !== null) {
        expect(resArch.answer).not.toContain('no consta');
      }
    });
  });

  describe('No Intercepción de Consultas Válidas', () => {
    it('NO intercepta consultas técnicas sobre normativa y ensayos (Cono de Abrams)', () => {
      const res = evaluateGuardrails('¿Cómo se realiza el ensayo del cono de Abrams según UNE-EN 12350-2?', 'es');
      expect(res).toBeNull();
    });

    it('NO intercepta consultas técnicas sobre probetas a 28 días (UNE-EN 12390-3)', () => {
      const res = evaluateGuardrails('¿Cómo se realiza el ensayo de rotura a compresión de probetas a 28 días?', 'es');
      expect(res).toBeNull();
    });

    it('NO intercepta saludos cordiales (hola, bon dia)', () => {
      const resEs = evaluateGuardrails('hola', 'es');
      expect(resEs).toBeNull();

      const resCa = evaluateGuardrails('bon dia', 'ca');
      expect(resCa).toBeNull();
    });

    it('NO intercepta consultas sobre los 4 técnicos oficiales (Carlos Gómez, Laura Martín, etc.)', () => {
      const resCarlos = evaluateGuardrails('¿Qué obras tiene asignadas Carlos Gómez?', 'es');
      expect(resCarlos).toBeNull();

      const resLaura = evaluateGuardrails('¿Quién es Laura Martín?', 'es');
      expect(resLaura).toBeNull();

      const resAlejandro = evaluateGuardrails('visitas de Alejandro Ruiz', 'es');
      expect(resAlejandro).toBeNull();

      const resSofia = evaluateGuardrails('agenda de Sofía Navarro', 'es');
      expect(resSofia).toBeNull();
    });

    it('NO confunde "plantilla antiperforación" (calzado S3) con la plantilla de personal', () => {
      const res = evaluateGuardrails('¿Qué calzado se exige con plantilla antiperforación S3 según DOC-07?', 'es');
      expect(res).toBeNull();
    });
  });
});
