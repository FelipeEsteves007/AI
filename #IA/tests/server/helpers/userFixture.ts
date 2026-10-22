import { randomUUID } from 'node:crypto';

import { UserRole, type User } from '@prisma/client';

/** Usuário completo (como o Prisma devolve) para os testes de middleware. */
export function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date('2026-09-12T12:00:00.000Z');

  return {
    id: randomUUID(),
    name: 'Adriano',
    email: 'admin@exemplo.com',
    passwordHash: '$2a$10$hash-falso-para-teste',
    role: UserRole.admin,
    isActive: true,
    mustChangePassword: false,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
