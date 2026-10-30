# Planificador de Visitas a Obras — Prueba Técnica

Sistema web de alta disponibilidad y diseño artesanal estilo Apple & Linear para la planificación inteligente de inspecciones técnicas y ensayos de control de calidad de materiales en obras de edificación e ingeniería civil.

Desarrollado como solución técnica integral para el control y planificación de visitas técnicas de obra, con motor de validación matemática de jornada laboral y desplazamientos, arquitectura multi-agente, integración de **RAG con IA (Google Gemini 3.5)** para consulta documental, **Llamada de Voz en Vivo (Web Speech API)**, panel lateral persistente, conmutador de tema **Claro/Oscuro**, simulador de **webhooks n8n** e internacionalización bilingüe **Català / Castellano**.

---

## Características Principales

1. **Planificación y Validación Estricta de Negocio:**
   - **Regla A (Sin Solapamientos):** Validación estricta $\max(S_1, S_2) < \min(E_1, E_2)$. Dos inspecciones de un mismo técnico no pueden coincidir en horario. Las visitas canceladas liberan el slot de inmediato.
   - **Regla B (Desplazamiento $\ge 30$ min):** Cálculo bidireccional automático. Si dos visitas consecutivas son a obras diferentes, exige $\ge 30$ minutos de traslado. Si es la misma obra consecutiva, margen requerido $= 0$ minutos.
   - **Regla C (Jornada 08:00 a 17:00 en Europe/Madrid):** Control de minutos desde medianoche (480 a 1020 min), inmune a problemas de desfase horario o DST.
2. **Cronograma Visual de Obra (Linear & Apple Style):**
   - Cuadrícula horaria de 08:00 a 17:00 con 4 columnas simultáneas (una por técnico).
   - Bloques proporcionales a la duración del ensayo.
   - **Bloques rayados de traslado:** Muestran visualmente los 30 minutos de traslado obligatorio entre obras distintas.
3. **LabQA Copilot — Asistente RAG con IA (Gemini 3.5 API):**
   - Panel lateral fijo siempre accesible.
   - Consulta sobre 10 documentos y procedimientos técnicos reales de laboratorio (hormigón UNE-EN 12350, geotecnia, acero B500SD, acústica DB-HR, EPIs, cubiertas, RITE, ISO 9001, topografía).
   - **Guardarraíles anti-alucinación estrictos:** Si la consulta no figura en los registros o es inventada, no especula y redirige con precisión al procedimiento más afín.
   - **Modo Llamada con IA (Voice Call):** Transcripción de voz en tiempo real con Web Speech API (`webkitSpeechRecognition`) y lectura de respuesta en voz alta (`speechSynthesis`).
4. **Ergonomía, Tipografía y Modo Claro/Oscuro:**
   - Aprovechamiento del 100% del ancho de pantalla (`w-full`), eliminando márgenes constreñidos.
   - Conmutador inmediato de tema Claro / Oscuro con contraste accesible (WCAG AA).
   - Tipografía legible con números tabulares (`tabular-nums`) y badges sin cortes de texto.
5. **Simulador de Automatizaciones n8n:**
   - Al programar o cancelar una visita, visualiza el flujo de nodos en n8n:
     `Webhook Trigger` ➔ `Telegram al Técnico` ➔ `Reserva de Cámara Húmeda` ➔ `ERP ISO 9001`.
   - Inspección y copia del payload JSON generado.
6. **Soporte Bilingüe Instantáneo:**
   - Conmutador en cabecera `[CAT | ES]` con terminología técnica del sector.
7. **Zero-Secrets en Git:**
   - Variables sensibles aisladas estrictamente en `.env.local` (ignorado en Git). `.env.example` documentado.

---

## Stack Tecnológico

- **Framework:** Next.js 15 (App Router, Turbopack, React 19)
- **Lenguaje:** TypeScript (Strict Mode, 0 `any`)
- **Estilos & Animaciones:** Tailwind CSS v4, Lucide Icons, Apple Design Tokens, Emil Kowalski Motion Principles
- **Base de Datos & ORM:** Prisma ORM con PostgreSQL (compatible con Neon / Supabase) + Fallback reactivo en memoria para levantar en local sin dependencias externas
- **Validación:** Zod (esquemas compartidos cliente-servidor)
- **Motor de IA:** Google Gemini API (modelo `gemini-3.5-flash` con guardarraíles y fallback semántico local enriquecido)
- **Testing:** Vitest (48 tests unitarios e integrados pasando al 100%)

---

## Puesta en Marcha en Local (<5 Minutos)

### 1. Clonar el Repositorio
```bash
git clone https://github.com/MNDzzzzz/planificador-visitas-obras.git
cd planificador-visitas-obras
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Copia el archivo de ejemplo:
```bash
cp .env.example .env.local
```
*(Opcional: Si deseas usar la API de Gemini para el Copilot, añade tu clave en `.env.local`: `GEMINI_API_KEY="tu-api-key"`).*

### 4. Generar Prisma Client y Ejecutar Seed (Opcional)
```bash
npm run db:push
npm run db:seed
```
*Nota: Si no tienes PostgreSQL configurado localmente, el sistema incluye un almacenamiento en memoria reactivo pre-hidratado con los 4 técnicos y 6 obras de prueba, por lo que arrancará de inmediato sin ningún error.*

### 5. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
Abre tu navegador en [http://localhost:3000](http://localhost:3000).

---

## Verificación de Calidad y Tests

Ejecutar la suite completa de 48 pruebas unitarias y de integración:
```bash
npm test
```

Ejecutar verificación de linter (ESLint):
```bash
npm run lint
```

Compilar build optimizado de producción:
```bash
npm run build
```

---

## Estructura del Código

```
├── app/
│   ├── globals.css          # Tokens de diseño Apple & Emil Kowalski (modo claro/oscuro, tabular-nums)
│   ├── layout.tsx           # Layout raíz con viewport y fuentes optimizadas
│   └── page.tsx             # Server component de entrada con prefetch de datos
├── components/
│   ├── Header.tsx           # Cabecera con KPIs, selector CAT/ES, conmutador de tema, vistas y n8n
│   ├── TimelineView.tsx     # Cronograma visual interactivo (4 carriles, bloques de traslado de 30 min)
│   ├── VisitsList.tsx       # Vista alternativa de tarjetas de visita
│   ├── FilterBar.tsx        # Filtros segmentados por técnico, fecha, estado y buscador
│   ├── ScheduleModal.tsx    # Modal de agendamiento con banners dinámicos de error (Reglas A, B, C)
│   ├── CopilotPanel.tsx     # Panel lateral fijo RAG con chat técnico y modo llamada de voz en vivo
│   ├── N8NModal.tsx         # Simulador visual de flujos automatizados de n8n
│   └── Dashboard.tsx        # Coordinador reactivo con Optimistic UI
├── lib/
│   ├── actions/             # Server Actions (scheduleVisit, cancelVisit, askCopilot)
│   ├── i18n/                # Diccionario de traducción bilingüe Català / Castellano
│   ├── rag/                 # 10 documentos técnicos oficiales y motor RAG con Gemini 3.5
│   ├── validation/          # Motor puro matemático de validación y esquemas Zod
│   ├── prisma.ts            # Patrón Singleton para conexiones serverless
│   └── types/               # Interfaces y contratos TypeScript estrictos
├── prisma/
│   ├── schema.prisma        # Modelos relacionales con índices optimizados
│   └── seed.ts              # Script de siembra con técnicos y obras representativas
└── tests/
    ├── validation.test.ts   # 40 tests unitarios de reglas A, B, C y límites off-by-one
    └── actions.test.ts      # 8 tests de integración de Server Actions
```

---

## Licencia y Créditos
Proyecto desarrollado como prueba técnica: Planificador de Visitas a Obras.  
Licencia MIT.
