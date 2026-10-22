import { PrismaClient } from '@prisma/client';

/**
 * Singleton do Prisma Client. Em desenvolvimento o hot reload recarrega os módulos várias vezes;
 * guardar a instância no escopo global evita abrir uma conexão nova a cada recarga.
 */
const globalForPrisma = globalThis as typeof globalThis & {
  prismaClient?: PrismaClient;
};

export const prisma: PrismaClient = globalForPrisma.prismaClient ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaClient = prisma;
}
