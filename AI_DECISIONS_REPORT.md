# Informe de Decisiones Técnicas, Alcance y Uso de IA

**Proyecto:** Planificador de Visitas a Obras y Control de Ensayos Técnicos  
**Candidatura:** Ingeniero/a de Software y Automatización con IA (Terrassa, Barcelona)  
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
  - **LabQA Copilot (RAG con Google Gemini):** Asistente de inteligencia artificial conectado a la documentación técnica real del sector (UNE-EN 12350, roturas de probetas a 7 y 28 días, ISO 9001, ensayos geotécnicos).
  - **Modo Llamada con IA (Voice Call):** Speech-to-Text nativo en navegador (`webkitSpeechRecognition`) con indicador visual de voz y Text-to-Speech (`speechSynthesis`).
  - **Simulador de Automatizaciones n8n:** Disparo visual de flujos de webhook hacia Telegram, reserva de cámaras húmedas en el laboratorio de Terrassa y ERP de calidad.
  - **Soporte Bilingüe Català / Castellano (`[CAT | ES]`):** Adaptación completa al contexto empresarial de Terrassa.
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

- Se asume que las 4 obras de ejemplo y sus distancias en la Comunidad de Madrid o área metropolitana de Barcelona se rigen por un tiempo medio de traslado mínimo estandarizado de 30 minutos, representativo de la operativa de transporte de probetas.
- Se asume que las visitas canceladas no deben borrarse físicamente de la base de datos (soft-state `CANCELLED`) para cumplir con los requerimientos de trazabilidad y auditoría de la norma ISO 9001.
- Se asume que la jornada laboral de 08:00 a 17:00 aplica de lunes a viernes, permitiendo inspecciones en cualquier día laborable seleccionado en el calendario.

---

## 4. Uso de la IA y Caso Concreto de Corrección de Error / Alucinación

Durante el desarrollo se emplearon modelos de lenguaje avanzados y agentes especializados de Antigravity, ECC y Anthropic Skills.

### Caso Concreto de Corrección de Error / Alucinación:

**1. Contexto y Error Generado por la IA:**  
Al implementar la validación de la **Regla B** (tiempo de desplazamiento de 30 minutos entre obras distintas), el código generado inicialmente por la IA evaluaba únicamente la distancia temporal con la visita inmediatamente anterior (`immediatePrev`). Cuando se le pidió considerar la inserción de una visita en medio del día, la IA introdujo un chequeo de solapamiento condicional simple restando el fin de la visita anterior del inicio de la nueva, pero **alucinó en la condición de la visita posterior:** asumió que bastaba con comprobar que `nextVisit.startTime > newVisit.endTime`.

**2. Impacto Crítico del Bug:**  
Bajo esta lógica defectuosa generada por la IA, si un técnico tenía una visita programada a las 12:00 en la Obra B y se intentaba programar una visita intermedia en la Obra A de 10:00 a 11:45 (finalizando a solo 15 minutos del inicio de la siguiente), la validación lo daba por bueno porque `12:00 > 11:45`, **violando flagrantemente la Regla B** al dejar solo 15 minutos de traslado hacia la obra posterior.

**3. Detección y Corrección Disciplinada:**  
El subagente `qa-automation-engineer` detectó el fallo al ejecutar los casos de prueba de inserción asimétrica (`tests/validation.test.ts`). Se procedió a refactorizar el motor con un algoritmo matemático riguroso bidireccional:
- Cálculo explícito de $\Delta_{\text{prev}} = S_{\text{new}} - E_{\text{prev}}$ con verificación de $\ge 30$ min si $\text{site}_{\text{prev}} \neq \text{site}_{\text{new}}$.
- Cálculo explícito de $\Delta_{\text{next}} = S_{\text{next}} - E_{\text{new}}$ con verificación de $\ge 30$ min si $\text{site}_{\text{next}} \neq \text{site}_{\text{new}}$.
- En caso de incumplimiento, se estructuró un reporte exacto del sentido infractor (`direction: 'PREVIOUS' | 'NEXT'`), los minutos reales disponibles y la obra en conflicto.

Este caso demuestra la importancia crítica de contar con una suite de pruebas automatizadas con casos límite (off-by-one) para auditar y corregir el código asistido por IA.
