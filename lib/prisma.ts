import { PrismaClient } from '@prisma/client';

// Patrón Singleton para Prisma Client en entornos Serverless y HMR (Next.js)
// Basado en skill 'prisma-patterns' para evitar la saturación de conexiones.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
