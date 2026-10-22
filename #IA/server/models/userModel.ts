import type { PrismaClient, User } from '@prisma/client';
import { UserRole } from '@prisma/client';

import type { CreateUserData, UpdateUserData, UserRepository } from '@server/types/auth';
import { normalizeEmail } from '@server/utils/userMapper';

import { prisma } from './prismaClient';

/**
 * Repositório de usuários sobre o Prisma. Camada fina: só acesso a dados, sem regra de negócio
 * (a regra fica no service, testada com os repositórios em memória).
 *
 * O e-mail é normalizado para minúsculas na escrita e na busca porque o índice único do Postgres
 * diferencia maiúsculas e a RN-01 exige comparação sem distinção de caixa.
 */
export function createUserModel(client: PrismaClient = prisma): UserRepository {
  return {
    async findById(id: string): Promise<User | null> {
      return client.user.findUnique({ where: { id } });
    },

    async findByEmail(email: string): Promise<User | null> {
      return client.user.findUnique({ where: { email: normalizeEmail(email) } });
    },

    async create(data: CreateUserData): Promise<User> {
      return client.user.create({
        data: {
          name: data.name,
          email: normalizeEmail(data.email),
          passwordHash: data.passwordHash,
          role: data.role,
          ...(data.mustChangePassword === undefined
            ? {}
            : { mustChangePassword: data.mustChangePassword }),
          ...(data.isActive === undefined ? {} : { isActive: data.isActive }),
        },
      });
    },

    async update(id: string, data: UpdateUserData): Promise<User> {
      return client.user.update({ where: { id }, data });
    },

    async list(): Promise<User[]> {
      return client.user.findMany({ orderBy: { createdAt: 'asc' } });
    },

    async countActiveAdmins(): Promise<number> {
      return client.user.count({ where: { role: UserRole.admin, isActive: true } });
    },
  };
}

export const userModel: UserRepository = createUserModel();
