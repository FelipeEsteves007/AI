import type { User } from '@prisma/client';

import { normalizeEmail, toPublicUser } from '@server/utils/userMapper';

describe('normalizeEmail', () => {
  it.each([
    ['Admin@X.com', 'admin@x.com'],
    ['  ADMIN@X.COM  ', 'admin@x.com'],
    ['admin@x.com', 'admin@x.com'],
  ])('normaliza %p para %p', (entrada, esperado) => {
    expect(normalizeEmail(entrada)).toBe(esperado);
  });
});

describe('toPublicUser', () => {
  const user: User = {
    id: 'user-1',
    name: 'Admin QA',
    email: 'admin@x.com',
    passwordHash: '$2b$10$hash-que-nunca-pode-vazar',
    role: 'admin',
    isActive: true,
    mustChangePassword: false,
    tokenVersion: 3,
    createdAt: new Date('2026-09-12T10:00:00Z'),
    updatedAt: new Date('2026-09-12T10:00:00Z'),
  };

  it('remove passwordHash e tokenVersion (RN-13)', () => {
    const publico = toPublicUser(user);

    expect(publico).not.toHaveProperty('passwordHash');
    expect(publico).not.toHaveProperty('tokenVersion');
    expect(JSON.stringify(publico)).not.toContain('hash-que-nunca-pode-vazar');
  });

  it('preserva os demais campos', () => {
    expect(toPublicUser(user)).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });

  it('não altera o objeto original', () => {
    toPublicUser(user);

    expect(user.passwordHash).toBe('$2b$10$hash-que-nunca-pode-vazar');
    expect(user.tokenVersion).toBe(3);
  });
});
