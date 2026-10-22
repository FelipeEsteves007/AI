import type { PrismaClient } from '@prisma/client';

import type { CourseRepository } from '@server/types/courses';

import { prisma } from './prismaClient';

/** Repositório de cursos sobre o Prisma. Camada fina: só acesso a dados. */
export function createCourseModel(client: PrismaClient = prisma): CourseRepository {
  return {
    async list({ isActive, skip, take }) {
      const where = isActive === undefined ? {} : { isActive };

      const [rows, total] = await client.$transaction([
        client.course.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip, take }),
        client.course.count({ where }),
      ]);

      return { rows, total };
    },

    findById(id) {
      return client.course.findUnique({ where: { id } });
    },

    create(data) {
      return client.course.create({ data });
    },

    update(id, data) {
      return client.course.update({ where: { id }, data });
    },

    async delete(id) {
      await client.course.delete({ where: { id } });
    },
  };
}

export const courseModel: CourseRepository = createCourseModel();
