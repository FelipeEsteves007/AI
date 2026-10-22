import type { Prisma, PrismaClient } from '@prisma/client';

import type { PipelineLeadRepository } from '@server/types/pipeline';

import { prisma } from './prismaClient';

const names = {
  student: { select: { name: true } },
  user: { select: { name: true } },
} as const;

/** Repositório de leads do pipeline sobre o Prisma. */
export function createPipelineLeadModel(client: PrismaClient = prisma): PipelineLeadRepository {
  return {
    list({ assignedTo, createdFrom, createdTo }) {
      return client.pipelineLead.findMany({
        where: {
          ...(assignedTo === undefined ? {} : { assignedTo }),
          ...(createdFrom || createdTo
            ? {
                createdAt: {
                  ...(createdFrom ? { gte: createdFrom } : {}),
                  ...(createdTo ? { lte: createdTo } : {}),
                },
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: names,
      });
    },

    findById(id, { assignedTo }) {
      return client.pipelineLead.findFirst({
        where: { id, ...(assignedTo === undefined ? {} : { assignedTo }) },
        include: names,
      });
    },

    create(data) {
      return client.pipelineLead.create({ data, include: names });
    },

    update(id, data, { assignedTo }) {
      const where: Prisma.PipelineLeadWhereUniqueInput =
        assignedTo === undefined ? { id } : { id, assignedTo };

      return client.pipelineLead.update({ where, data, include: names });
    },
  };
}

export const pipelineLeadModel: PipelineLeadRepository = createPipelineLeadModel();
