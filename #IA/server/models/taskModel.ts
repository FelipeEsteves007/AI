import type { PrismaClient } from '@prisma/client';

import type { TaskRepository } from '@server/types/tasks';

import { prisma } from './prismaClient';

const studentName = { relatedStudent: { select: { name: true } } } as const;

/** Repositório de tarefas sobre o Prisma. O dono (`assignedTo`) vai sempre no `where`. */
export function createTaskModel(client: PrismaClient = prisma): TaskRepository {
  return {
    listByUser(userId, { completed, priority }) {
      return client.task.findMany({
        where: {
          assignedTo: userId,
          ...(priority ? { priority } : {}),
          ...(completed === undefined
            ? {}
            : { completedAt: completed ? { not: null } : null }),
        },
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        include: studentName,
      });
    },

    create({ relatedTo, ...data }) {
      return client.task.create({
        data: { ...data, relatedTo, relatedType: relatedTo ? 'student' : null },
        include: studentName,
      });
    },

    update(id, userId, { relatedTo, ...data }) {
      return client.task.update({
        where: { id, assignedTo: userId },
        data: {
          ...data,
          ...(relatedTo === undefined
            ? {}
            : { relatedTo, relatedType: relatedTo ? 'student' : null }),
        },
        include: studentName,
      });
    },

    async delete(id, userId) {
      await client.task.delete({ where: { id, assignedTo: userId } });
    },
  };
}

export const taskModel: TaskRepository = createTaskModel();
