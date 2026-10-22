import type { Prisma, PrismaClient } from '@prisma/client';

import type { DashboardRepository, PurchaseRangeFilter } from '@server/types/dashboard';

import { prisma } from './prismaClient';

function purchaseWhere({ assignedTo, from, to }: PurchaseRangeFilter): Prisma.PurchaseWhereInput {
  return {
    ...(assignedTo === undefined ? {} : { student: { assignedTo } }),
    ...(from || to
      ? { purchaseDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };
}

/** Agregações do dashboard sobre o Prisma (índices em `createdAt`, `status` e `purchaseDate`). */
export function createDashboardModel(client: PrismaClient = prisma): DashboardRepository {
  return {
    countStudents({ assignedTo, createdFrom, createdTo, status }) {
      return client.student.count({
        where: {
          ...(assignedTo === undefined ? {} : { assignedTo }),
          ...(status ? { status } : {}),
          ...(createdFrom || createdTo
            ? {
                createdAt: {
                  ...(createdFrom ? { gte: createdFrom } : {}),
                  ...(createdTo ? { lte: createdTo } : {}),
                },
              }
            : {}),
        },
      });
    },

    async sumRevenue(filter) {
      const { _sum } = await client.purchase.aggregate({
        where: purchaseWhere(filter),
        _sum: { amount: true },
      });

      return _sum.amount?.toFixed(2) ?? '0.00';
    },

    async studentsByCourse({ assignedTo }) {
      const groups = await client.purchase.groupBy({
        by: ['courseId'],
        where: purchaseWhere({ assignedTo }),
        _count: { _all: true },
      });
      const courses = await client.course.findMany({
        where: { id: { in: groups.map((group) => group.courseId) } },
        select: { id: true, name: true },
      });
      const names = new Map(courses.map((course) => [course.id, course.name]));

      return groups.map((group) => ({
        courseId: group.courseId,
        courseName: names.get(group.courseId) ?? '',
        count: group._count._all,
      }));
    },

    async purchasesInRange(filter) {
      const rows = await client.purchase.findMany({
        where: purchaseWhere(filter),
        select: { purchaseDate: true, amount: true },
      });

      return rows.map((row) => ({ purchaseDate: row.purchaseDate, amount: row.amount.toFixed(2) }));
    },
  };
}

export const dashboardModel: DashboardRepository = createDashboardModel();
