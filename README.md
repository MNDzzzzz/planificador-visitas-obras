# Planificador de Visitas a Obras — Prueba Técnica

Sistema web de alta ingeniería y diseño artesanal estilo Apple & Linear para la **planificación inteligente de inspecciones técnicas y ensayos de control de calidad de materiales** en obras de edificación e ingeniería civil.

> [!NOTE]
> **Marco de Desarrollo del Proyecto:**
> Este proyecto fue concebido, diseñado e implementado íntegramente como un **prototipo de alto rendimiento en un marco temporal intensivo de aproximadamente 3 horas** para la presente prueba técnica.
> Cumple rigurosamente el 100% de los requisitos funcionales de negocio (Reglas A, B, C y gestión de cancelaciones sin pérdida de histórico) e incorpora extras arquitectónicos de alto valor añadido desarrollados para maximizar la eficiencia operativa del laboratorio.

---

## 🏛️ Arquitectura y Motores de Negocio

La aplicación se fundamenta en un motor matemático determinista y puro (`lib/validation/rules.ts`) libre de efectos secundarios y blindado frente a fallos silenciosos:

### 1. Regla A: Sin Solapamientos Temporales
- **Fórmula Matemática:** Para cualquier par de visitas programadas $V_1, V_2$ de un mismo técnico:
  $$\max(S_1, S_2) < \min(E_1, E_2) \implies \text{Conflicto de Solapamiento}$$
- Aplica exclusivamente a inspecciones en estado `SCHEDULED`.
- **Cancelaciones Inmediatas:** Una visita cancelada pasa al estado `CANCELLED` y **libera el hueco horario de inmediato**, permitiendo agendar a otro técnico o cliente en ese intervalo mientras se preserva la trazabilidad y la cadena de custodia exigida por la norma **ISO 9001**.

### 2. Regla B: Traslados Inteligentes y Geolocalización a Coste 0€
- **Misma Obra Consecutiva:** Si dos visitas sucesivas se realizan en el mismo emplazamiento, el tiempo de desplazamiento requerido es estrictamente de **0 minutos** (continuidad operativa inmediata).
- **Obras Distintas (Matriz Calibrada del Vallès + Haversine):**
  - **Matriz Local Calibrada (Coste 0€):** En lugar de incurrir en costes recurrentes de facturación por llamada a la Google Distance Matrix API, se implementó una matriz de tiempos viarios para el Vallès Occidental, Vallès Oriental y Barcelona (C-58, C-16, AP-7, B-30, C-60).
  - **Buffer Logístico de Seguridad (+5 min):** Todo trayecto entre obras distintas añade 5 minutos obligatorios para aparcamiento, control de accesos a pie de obra, recepción de probetas frescas y acondicionamiento del cono de Abrams.
  - **Fallback Geodésico con Tortuosidad Vial ($\tau = 1.32$):** Para coordenadas fuera de la matriz, calcula la distancia ortodrómica Haversine multiplicada por el coeficiente de tortuosidad vial de Cataluña y velocidad media de 45 km/h.
  - **Validación Bidireccional:** Comprueba tanto el margen con la visita inmediatamente anterior como con la posterior.

### 3. Regla C: Jornada Laboral Estricta (08:00 a 17:00 en Europe/Madrid)
- La jornada de los técnicos transcurre exclusivamente entre las **08:00 y las 17:00 horas**.
- Control estricto de minutos enteros desde medianoche ($480 \le \text{minutos} \le 1020$), inmune a desfases horarios de servidores en la nube o cambios estacionales de hora (DST).
- Duración de ensayo estrictamente superior a 0 minutos.

---

## 🚀 Extras de Optimización de Tiempo y Valor Añadido

Para demostrar capacidad de entrega y visión de producto bajo la limitación de 3 horas, se incorporaron las siguientes soluciones:

```mermaid
graph TD
    UI["Frontend Apple Design System (Dark/Light + i18n CAT/ES)"] --> Actions["Server Actions Seguras (scheduleVisit, cancelVisit)"]
    Actions --> Rules["Motor Matemático Puro (Reglas A, B, C)"]
    Rules --> Routing["Servicio Geo Vallès a Coste 0€ (Matriz + Haversine)"]
    Actions --> Prisma["Prisma ORM (PostgreSQL Serverless / Memory Fallback)"]
    UI --> Copilot["LabQA Copilot RAG Híbrido"]
    Copilot --> Guardrails["Guardarraíles Anti-Alucinación (0ms)"]
    Guardrails --> Cache["Caché Semántica Local (0ms)"]
    Cache --> Gemini["Google Gemini 1.5 Flash (Timeout 4s)"]
    UI --> Voice["Llamada de Voz en Vivo (Web Speech API)"]
```

1. **LabQA Copilot — Asistente RAG Híbrido con IA y Comando `/help`:**
   - Base de conocimiento técnico con **13 documentos y procedimientos oficiales** (hormigón UNE-EN 12350, rotura de probetas UNE-EN 12390, acero B500SD, acústica CTE DB-HR, geotecnia SPT, EPIs, cubiertas, RITE, topografía, logística viaria del Vallès, manual del sistema y roadmap).
   - **Guardarraíles Anti-Alucinación Estrictos:** Detección de trabajadores ficticios (la plantilla se compone exclusivamente de Carlos Gómez, Laura Martín, Alejandro Ruiz y Sofía Navarro) y corte en seco de consultas fuera de dominio a secas (`sources: []`), sin inventar fuentes afines.
   - **Comando `/help` Inmediato:** Guía ejecutiva del sistema, marco de 3 horas y roadmap de producción a 0ms de latencia.
   - **Caché Semántica y Léxica:** Coeficiente Jaccard y trigramas para respuestas instantáneas.
2. **Modo Llamada de Voz en Vivo (Voice Call):**
   - Integrado en el Copilot con Web Speech API (`SpeechRecognition` y `speechSynthesis`) para interacción manos libres en obra.
3. **Diseño Artesanal Apple & Linear (Light / Dark Mode):**
   - Cuadrícula horaria de 08:00 a 17:00 con 4 carriles simultáneos de técnicos, bloques de visita proporcionales y bloques de traslado calculados según ruta.
   - Conmutador inmediato de tema Claro / Oscuro con contraste accesible WCAG AA y números tabulares (`tabular-nums`).
4. **Bilingüismo Nativo Instantáneo [Català / Castellano]:**
   - Conmutador en cabecera con traducción técnica rigurosa del sector de la construcción.

---

## 🔮 Hoja de Ruta: Mejoras Futuras (Sin Límite de 3 Horas)

En un despliegue corporativo a escala de producción, las siguientes funcionalidades constituyen los siguientes pasos naturales:

1. **Function Calling / Tool Calling Interactivo en Copilot:**
   - Permitir al usuario agendar o cancelar visitas conversacionalmente desde el chat de IA (ej: *"Agenda a Carlos para un ensayo de cono de Abrams mañana a las 10:00 en Can Roqueta"*). El modelo ejecutaría la llamada a la Server Action y abriría el modal de confirmación con los datos precargados.
2. **Seguridad Empresarial y RBAC Granular (Control de Acceso Basado en Roles):**
   - Integración de NextAuth / Auth0 / Supabase Auth con JWT firmado.
   - Roles diferenciados:
     - **Director de Calidad / Auditor:** Acceso a métricas globales, auditoría de tolerancias y exportación de certificados oficiales.
     - **Coordinador de Laboratorio:** Planificación, asignación y reasignación de visitas.
     - **Técnico de Campo:** Vista móvil exclusiva de su hoja de ruta del día, firma biométrica de actas a pie de obra y toma fotográfica de probetas.
3. **IA Comercial Avanzada con Base Vectorial Persistente (`pgvector`):**
   - Sustituir la búsqueda léxica en memoria por embeddings vectoriales densos (`text-embedding-3-small` o `text-multilingual-embedding-002`) almacenados en **PostgreSQL con extensión `pgvector`** en Supabase.
   - Chunking dinámico con solapamiento semántico de normativas complejas (Código Estructural, Eurocódigos).
4. **Telemetría de Tráfico en Tiempo Real y Factor Meteorológico (AEMET API):**
   - Conexión con **Google Routes API / TomTom Traffic** para predecir retenciones puntuales en la C-58 y AP-7.
   - Integración con la **API de AEMET**: Alertas preventivas de lluvia o heladas que impidan el hormigonado en cota cero o ensayos de impermeabilización en cubiertas.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Justificación Técnica |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router, Turbopack, React 19) | Server Components para SSR ultrarrápido y Server Actions seguras. |
| **Lenguaje** | TypeScript 5 (Strict Mode, 0 `any`) | Tipado estricto extremo y prevención de fallos en compilación. |
| **Estilos** | Tailwind CSS v4 + Apple Design Tokens | Variables CSS dinámicas para modo claro/oscuro sin flash blanco. |
| **ORM & DB** | Prisma ORM + PostgreSQL (Neon / Supabase) | Patrón Singleton serverless + fallback reactivo en memoria. |
| **Validación** | Zod 3 | Esquemas compartidos cliente-servidor para validación segura. |
| **Motor RAG** | Google Gemini API + Local Semantic Cache | Streaming SSE palabra por palabra con timeout estricto de 4s. |
| **Testing** | Vitest 3 | 126 pruebas automatizadas unitarias, de integración y RAG. |

---

## 💻 Puesta en Marcha en Local (<5 Minutos)

### 1. Requisitos Previos
- **Node.js** v18.18+ o v20+
- **npm** v9+

### 2. Clonar el Repositorio e Instalar
```bash
git clone https://github.com/MNDzzzzz/planificador-visitas-obras.git
cd planificador-visitas-obras
npm install
```

### 3. Configurar Variables de Entorno
Copia el archivo de plantilla:
```bash
cp .env.example .env.local
```
Contenido de `.env.local`:
```env
# URL de conexión a base de datos PostgreSQL (Opcional en local: incluye fallback reactivo en memoria)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/planificador_obras?schema=public"

# Clave de API de Google Gemini para el asistente inteligente RAG (Opcional: incluye fallback semántico local)
GEMINI_API_KEY="tu-api-key-de-gemini"
```
> [!TIP]
> Si no dispones de PostgreSQL instalado localmente, **la aplicación arrancará de inmediato sin ningún error** gracias al almacenamiento reactivo en memoria pre-hidratado con los 4 técnicos y las 13 obras oficiales del Vallès.

### 4. Inicializar Base de Datos (Opcional si usas PostgreSQL)
```bash
npx prisma db push
npx prisma db seed
```

### 5. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
Abre tu navegador en [http://localhost:3000](http://localhost:3000).

---

## 🧪 Verificación de Calidad y Tests

La solución cuenta con **126 pruebas automatizadas** que garantizan el principio de *Cero Fallos Silenciosos*:

```bash
# Ejecutar suite completa de Vitest
npm test

# Ejecutar comprobación de tipos TypeScript
npx tsc --noEmit

# Ejecutar linter de código
npm run lint

# Compilar build de producción
npm run build
```

Desglose de suites de prueba:
- `tests/guardrails.test.ts` (15 tests): Blindaje anti-alucinación, intercepción de trabajadores no oficiales, corte de temas ajenos y comando `/help`.
- `tests/validation.test.ts` (41 tests): Reglas matemáticas A, B (dinámica) y C (horario estricto) con límites *off-by-one*.
- `tests/routing.test.ts` (34 tests): Matriz viaria del Vallès, Haversine calibrado y cálculo de márgenes con buffer de +5 min.
- `tests/cache.test.ts` (19 tests): Caché semántica local, seeds precargados y similitud de Jaccard.
- `tests/actions.test.ts` (10 tests): Server Actions, cancelaciones atómicas y liberación de huecos horarios.
- `tests/stream.test.ts` (7 tests): Endpoint SSE de streaming de Copilot y manejo de guardarraíles.

---

## 🚀 Despliegue en Producción (Vercel + Supabase)

El proyecto está preparado para despliegue directo *Zero-Config* en Vercel:

1. **Crear Base de Datos en Supabase / Neon:**
   - Crea un nuevo proyecto en [Supabase](https://supabase.com).
   - Copia la URL de conexión en modo *Transaction Pooler* (puerto 6543) o *Direct* (puerto 5432).
2. **Importar Repositorio en Vercel:**
   - Conecta tu repositorio de GitHub en [Vercel](https://vercel.com).
   - Configura las Variables de Entorno en el panel de Vercel:
     - `DATABASE_URL`: Cadena de conexión de Supabase.
     - `GEMINI_API_KEY`: Tu clave de Google AI Studio.
3. **Migración Inicial:**
   - Ejecuta desde tu máquina local apuntando a la URL de producción:
     ```bash
     DATABASE_URL="tu-supabase-url" npx prisma db push
     DATABASE_URL="tu-supabase-url" npx prisma db seed
     ```
4. **Desplegar:** Haz clic en **Deploy**. El App Router de Next.js optimizará automáticamente los Server Components y las rutas dinámicas.

---

## 📂 Estructura del Proyecto

```
├── app/
│   ├── api/copilot/stream/  # Endpoint de streaming SSE para LabQA Copilot
│   ├── globals.css          # Tokens de diseño Apple (modo claro/oscuro, glassmorphism)
│   ├── layout.tsx           # Layout raíz con viewport optimizado
│   └── page.tsx             # Server component de entrada con prefetch de datos
├── components/
│   ├── Header.tsx           # Cabecera con KPIs, selector CAT/ES, conmutador de tema y vistas
│   ├── TimelineView.tsx     # Cronograma visual interactivo (4 carriles, bloques de traslado)
│   ├── VisitsList.tsx       # Vista alternativa de tarjetas de visita
│   ├── FilterBar.tsx        # Filtros segmentados por técnico, fecha, estado y buscador
│   ├── ScheduleModal.tsx    # Modal de agendamiento con avisos de error (Reglas A, B, C)
│   ├── CopilotPanel.tsx     # Panel lateral RAG con chat técnico, modo llamada de voz y /help
│   └── Dashboard.tsx        # Coordinador reactivo con Optimistic UI
├── lib/
│   ├── actions/             # Server Actions (scheduleVisitAction, cancelVisitAction, etc.)
│   ├── geo/                 # Matriz de distancias del Vallès y fórmula Haversine (coste 0€)
│   ├── i18n/                # Diccionario bilingüe Català / Castellano
│   ├── rag/                 # Base de conocimiento (13 docs), caché semántica y guardarraíles
│   ├── validation/          # Motor matemático de reglas de negocio y esquemas Zod
│   ├── prisma.ts            # Singleton de conexión PostgreSQL
│   └── types/               # Contratos e interfaces TypeScript
├── prisma/
│   ├── schema.prisma        # Modelo relacional optimizado
│   └── seed.ts              # Seed con los 4 técnicos y 13 obras georreferenciadas
└── tests/                   # 126 pruebas automatizadas con Vitest
```

---

## 📄 Licencia

Proyecto desarrollado para la prueba técnica de **Planificador de Visitas a Obras**.  
Licencia MIT.
