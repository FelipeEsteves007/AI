import type { Prisma, PrismaClient } from '@prisma/client';
import { AuditAction } from '@prisma/client';

import type { AuditLogEntry, AuditLogRepository } from '@server/types/auth';
import { normalizeEmail } from '@server/utils/userMapper';

import { prisma } from './prismaClient';

/**
 * Entrada de auditoria no formato do `auditLog.create`. Exportado para quem grava a auditoria
 * dentro da própria transação (ex.: `studentModel.delete`), com o mesmo mapeamento do `record`.
 */
export function toAuditLogCreateData(entry: AuditLogEntry): Prisma.AuditLogCreateInput {
  return {
    action: entry.action,
    actorId: entry.actorId ?? null,
    targetUserId: entry.targetUserId ?? null,
    email: entry.email ? normalizeEmail(entry.email) : null,
    ip: entry.ip ?? null,
    metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    ...(entry.createdAt === undefined ? {} : { createdAt: entry.createdAt }),
  };
}

/**
 * Repositório de auditoria sobre o Prisma (RN-14). Camada fina: só acesso a dados.
 * O e-mail é gravado e consultado em minúsculas, como no repositório de usuários (RN-01).
 */
export function createAuditLogModel(client: PrismaClient = prisma): AuditLogRepository {
  return {
    async record(entry: AuditLogEntry): Promise<void> {
      await client.auditLog.create({ data: toAuditLogCreateData(entry) });
    },

    async countFailedLoginsSince(email: string, since: Date): Promise<number> {
      return client.auditLog.count({
        where: {
          email: normalizeEmail(email),
          action: AuditAction.LOGIN_FAILURE,
          createdAt: { gt: since },
        },
      });
    },

    async findLastSuccessfulLoginAt(email: string): Promise<Date | null> {
      const last = await client.auditLog.findFirst({
        where: { email: normalizeEmail(email), action: AuditAction.LOGIN_SUCCESS },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      return last?.createdAt ?? null;
    },
  };
}

export const auditLogModel: AuditLogRepository = createAuditLogModel();
