import type { PrismaClient } from '@prisma/client';

import type { PurchaseRepository } from '@server/types/courses';
import { dateOnlyToDate } from '@server/utils/dates';

import { prisma } from './prismaClient';

const courseName = { course: { select: { name: true } } } as const;

/** Repositório de compras sobre o Prisma. Camada fina: só acesso a dados. */
export function createPurchaseModel(client: PrismaClient = prisma): PurchaseRepository {
  return {
    listByStudent(studentId) {
      return client.purchase.findMany({
        where: { studentId },
        orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
        include: courseName,
      });
    },

    create({ purchaseDate, ...data }) {
      return client.purchase.create({
        data: { ...data, purchaseDate: dateOnlyToDate(purchaseDate) },
        include: courseName,
      });
    },

    countByCourse(courseId) {
      return client.purchase.count({ where: { courseId } });
    },
  };
}

export const purchaseModel: PurchaseRepository = createPurchaseModel();
