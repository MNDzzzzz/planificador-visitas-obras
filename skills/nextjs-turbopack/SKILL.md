---
name: nextjs-turbopack
description: Next.js 15/16 App Router, Turbopack, Server Actions, file caching and zero-latency performance.
metadata:
  origin: ECC / affaan-m
---

# Next.js & Turbopack Patterns

Reglas para Next.js 15+ con App Router:
- Turbopack activo en desarrollo (`next dev --turbopack`).
- Server Components por defecto, 'use client' solo en hojas interactivas.
- Server Actions con tipado estricto Zod y respuesta estructurada `{ success, data, error }`.
- Cero fugas de renderizado: prefetching controlado y suspense boundaries limpios.
