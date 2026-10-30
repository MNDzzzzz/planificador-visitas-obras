---
name: prisma-patterns
description: Prisma ORM patterns for TypeScript backends — schema design, index optimization, connection pooling in serverless environments, safe migrations and zero data-loss seeds.
metadata:
  origin: ECC / affaan-m
---

# Prisma Patterns & Traps Prevention

## Reglas Críticas
1. **Indexación compuesta:** Añadir `@@index([technicianId, date, status])` para optimizar consultas de solapamiento y franjas horarias.
2. **Serverless Connection Management:** Configurar singleton de `PrismaClient` en entorno global para evitar agotar conexiones en recargas de Next.js (`globalForPrisma`).
3. **Mapeo DTO:** Nunca exponer entidades crudas con campos internos innecesarios; mapear a interfaces de transporte.
4. **Actualizaciones Atómicas:** El campo `updatedAt` se actualiza automáticamente solo en `update` o `upsert`, en `updateMany` debe pasarse explícito.
5. **Migraciones Seguras:** Usar `npx prisma db push` o `npx prisma migrate dev` en local y `npx prisma migrate deploy` en CI/producción.
