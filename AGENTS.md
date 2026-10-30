# Arquitectura del Sistema y Stack Tecnológico — Planificador de Visitas a Obras

> **Sistema Operativo:** Windows / PowerShell  
> **Modo de Desarrollo:** Pedagógico (Junior Developer), Boil the Ocean (código completo, 0 placeholders), Budget 0€.

## Stack Tecnológico
- **Framework:** Next.js 15 (App Router, React 19)
- **Lenguaje:** TypeScript (Strict mode)
- **Estilos:** Tailwind CSS v4 + Lucide Icons + Apple Design tokens
- **Persistencia:** Prisma ORM + PostgreSQL (Neon/Supabase) / SQLite para local y testing
- **Validación:** Zod (Esquemas unificados para cliente y servidor)
- **Fechas y Timezones:** date-fns, date-fns-tz (Europe/Madrid)
- **Testing:** Vitest
- **Despliegue:** Vercel (Producción) + GitHub CI

## Reglas de Negocio Centrales
1. **Regla A (Sin solapamientos):** Un técnico no puede tener dos visitas programadas simultáneas.
2. **Regla B (Desplazamiento):** Mínimo 30 minutos de traslado entre obras distintas. 0 minutos si es la misma obra consecutiva.
3. **Regla C (Jornada Laboral):** Toda visita debe empezar >= 08:00 y finalizar <= 17:00 (Europe/Madrid).
4. **Cancelación:** Libera el horario del técnico de inmediato y permanece registrada con estado `CANCELLED`.
