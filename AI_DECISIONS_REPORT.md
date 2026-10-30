# Informe de Decisiones Técnicas, Alcance y Uso de IA

**Proyecto:** Planificador de Visitas a Obras y Control de Ensayos Técnicos  
**Naturaleza:** Prueba Técnica — Arquitectura de Software y Automatización con IA  
**Entorno de Desarrollo:** Antigravity Multi-Agent OS con Skills de `anthropics/skills` y `emilkowalski/skills`

---

## 1. Alcance Cubierto y Trabajo Pendiente

### Alcance Completado al 100%:
- **Requisitos Obligatorios de Negocio:**
  - Gestión de 4 técnicos con especialidades y obras distribuidas con script de seed.
  - Motor matemático de validación en cliente y servidor para las **Reglas A** (sin solapamiento horario), **Regla B** (desplazamiento mínimo de 30 minutos entre obras distintas; 0 minutos si es la misma obra consecutiva; con comprobación bidireccional hacia la visita anterior y posterior) y **Regla C** (jornada estricta de 08:00 a 17:00 en `Europe/Madrid`).
  - Flujo de cancelación inmediata: el estado pasa a `CANCELLED`, liberando el slot temporal del técnico de forma instantánea mientras permanece visible en el listado para auditoría.
  - Listado de visitas ordenado cronológicamente con filtros combinados en tiempo real por técnico, fecha, estado y buscador textual.
- **Diferenciadores Técnicos y Funcionales Añadidos:**
  - **Cronograma Visual (Timeline de Obra estilo Linear):** Cuadrícula horaria de 08:00 a 17:00 en 4 carriles donde las visitas son bloques físicos y los traslados obligatorios de 30 minutos se visualizan como bloques rayados translúcidos.
  - **LabQA Copilot (Panel Fijo RAG con Google Gemini 3.5 Flash):** Asistente de inteligencia artificial persistente en pantalla conectado a 10 documentos técnicos del sector (hormigón UNE-EN 12350, roturas de probetas a 7 y 28 días, ISO 9001, ensayos geotécnicos, acústica DB-HR, EPIs, cubiertas, RITE, topografía UNE-EN 13670).
  - **Guardarraíles Anti-Alucinación:** Si el usuario pregunta cosas no registradas o inventadas, el sistema no especula y redirige con rigor al documento más próximo.
  - **Modo Llamada con IA (Voice Call):** Speech-to-Text nativo en navegador (`webkitSpeechRecognition`) con indicador visual de voz y Text-to-Speech (`speechSynthesis`).
  - **Conmutador de Modo Claro / Modo Oscuro:** Interfaz adaptable con variables semánticas CSS y contraste verificado (WCAG AA).
  - **Canvas a Pantalla Completa (100% Width):** Eliminación de márgenes restrictivos, con tipografía amplia y legible sin cortes de texto en botones ni tarjetas.
  - **Simulador de Automatizaciones n8n:** Disparo visual de flujos de webhook hacia Telegram, reserva de cámaras húmedas en el laboratorio central y ERP de calidad.
  - **Soporte Bilingüe Català / Castellano (`[CAT | ES]`):** Terminología técnica rigurosa en ambos idiomas.
- **Calidad de Código y Testing:**
  - 48 tests automatizados en Vitest pasando al 100% (40 unitarios de reglas de negocio + 8 de integración de Server Actions).
  - Cero errores en `npx tsc --noEmit` (TypeScript strict mode) y `npm run lint` (ESLint limpio).
  - Zero-Secrets garantizado en Git.

### Qué queda pendiente (Posibles mejoras futuras):
- Integración directa con GPS o API de Google Maps / OSRM para calcular la matriz de distancias y tiempos de tráfico real en lugar del tiempo estándar mínimo de 30 minutos.
- Autenticación con roles RBAC (Administrador de Laboratorio, Director Facultativo, Técnico de Campo) mediante Auth.js o Clerk.

---

## 2. Decisiones Técnicas y su Justificación (Modo Pedagógico)

1. **Aritmética de Tiempos en Minutos desde Medianoche vs. Objetos `Date` UTC:**
   *Justificación:* El uso de minutos enteros (480 a 1020 min) simplifica los cálculos de solapamientos e intervalos a aritmética elemental ($O(1)$) y elimina de raíz cualquier riesgo de desajuste por huso horario del servidor (Vercel en UTC vs. horario de Madrid en UTC+1/+2 por horario de verano).
2. **Prisma ORM con Fallback Híbrido en Memoria Reactivo:**
   *Justificación:* Permite a cualquier evaluador clonar el proyecto y probarlo en su navegador en 1 minuto sin requerir levantar un contenedor PostgreSQL, al tiempo que utiliza esquemas relacionales e índices compuestos (`@@index([technicianId, date, status])`) cuando se conecta una base de datos real.
3. **Next.js 15 App Router + Server Actions vs. API REST tradicional:**
   *Justificación:* Reduce la sobrecarga de serialización y endpoints duplicados, permitiendo que la validación Zod se ejecute de forma transparente en el servidor con mutaciones atómicas y revalidación de caché (`revalidatePath`).
4. **Diseño Visual con Tokens de Apple y Emil Kowalski:**
   *Justificación:* Sustituye el aspecto plano y genérico de las interfaces creadas por IA por un diseño artesanal con microinteracciones físicas táctiles (`scale(0.975)`), números tabulares (`tabular-nums`) y radios concéntricos calculados (`outer = inner + padding`).

---

## 3. Supuestos Asumidos

- Se asume que las 4 obras de ejemplo y sus distancias se rigen por un tiempo medio de traslado mínimo estandarizado de 30 minutos, representativo de la operativa de transporte de probetas.
- Se asume que las visitas canceladas no deben borrarse físicamente de la base de datos (soft-state `CANCELLED`) para cumplir con los requerimientos de trazabilidad y auditoría de la norma ISO 9001.

---

## 4. Prompts de Antigravity Utilizados y Registro de Subagentes

El desarrollo se coordinó mediante una arquitectura multi-agente en Antigravity:
1. **Architect & Tech Lead:** Definición de contratos TypeScript, Zod y estructura modular.
2. **Backend & Logic Engineer:** Implementación matemática de las Reglas A, B, C y Server Actions transaccionales.
3. **QA & Automation Engineer:** 48 pruebas unitarias e integradas con Vitest cubriendo casos extremos y condiciones de contorno.
4. **Frontend & Apple UI Designer:** Cronograma visual estilo Linear, conmutador de tema claro/oscuro, panel persistente de IA y microinteracciones táctiles.
5. **DevOps Gatekeeper:** Verificación de tipos, linter, tests y automatización de despliegue en Vercel y GitHub.
