import type { UserRole as PrismaUserRole } from '@prisma/client';

import { hasPermission, permissionsFor } from '@server/utils/permissions';
import type { Permission, UserRole } from '@server/utils/permissions';

/** Verdadeiro no typecheck só quando `A` é atribuível a `B`. */
type Extends<A, B> = [A] extends [B] ? true : false;

/**
 * Matriz de permissões — fonte: ImersaoIA/specs/002-login-perfis/spec.md
 *
 * | Permissão         | Admin | CEO | Vendedor |
 * |-------------------|:-----:|:---:|:--------:|
 * | users:manage      |   ✓   |  ✗  |    ✗     |
 * | students:import   |   ✓   |  ✗  |    ✗     |
 * | settings:manage   |   ✓   |  ✗  |    ✗     |
 * | courses:manage    |   ✓   |  ✗  |    ✗     |
 * | students:delete   |   ✓   |  ✗  |    ✗     |
 * | data:view-all     |   ✓   |  ✓  |    ✗     |
 * | tasks:write       |   ✓   |  ✓  |    ✓     |
 */
const MATRIX: Array<[Permission, boolean, boolean, boolean]> = [
  ['users:manage', true, false, false],
  ['students:import', true, false, false],
  ['settings:manage', true, false, false],
  ['courses:manage', true, false, false],
  ['students:delete', true, false, false],
  ['data:view-all', true, true, false],
  ['tasks:write', true, true, true],
];

const ROLES: UserRole[] = ['admin', 'ceo', 'vendedor'];

describe('UserRole', () => {
  /**
   * Compatibilidade bidirecional com o enum `UserRole` do Prisma: se um papel novo
   * entrar (ou sair) do `prisma/schema.prisma`, o `npm run typecheck` quebra aqui.
   */
  it('é exatamente o enum UserRole do schema do Prisma', () => {
    const compativel: [Extends<UserRole, PrismaUserRole>, Extends<PrismaUserRole, UserRole>] =
      [true, true];

    expect(compativel).toEqual([true, true]);
  });

  it('cobre os papéis da matriz da spec', () => {
    expect([...ROLES].sort()).toEqual(['admin', 'ceo', 'vendedor']);
  });
});

describe('hasPermission', () => {
  describe.each(MATRIX)('%s', (permission, admin, ceo, vendedor) => {
    const expected: Record<UserRole, boolean> = { admin, ceo, vendedor };

    it.each(ROLES)(`%s -> ${JSON.stringify({ admin, ceo, vendedor })}`, (role) => {
      expect(hasPermission(role, permission)).toBe(expected[role]);
    });
  });

  it('cobre as 7 permissões da matriz da spec', () => {
    expect(MATRIX).toHaveLength(7);
  });

  it('nega permissão desconhecida para qualquer papel', () => {
    for (const role of ROLES) {
      expect(hasPermission(role, 'nao:existe' as Permission)).toBe(false);
    }
  });

  it('nega papel desconhecido em qualquer permissão', () => {
    for (const [permission] of MATRIX) {
      expect(hasPermission('hacker' as UserRole, permission)).toBe(false);
    }
  });
});

describe('permissionsFor', () => {
  it('admin recebe todas as 7 permissões', () => {
    expect([...permissionsFor('admin')].sort()).toEqual(
      MATRIX.map(([permission]) => permission).sort(),
    );
  });

  it('ceo recebe apenas data:view-all e tasks:write', () => {
    expect([...permissionsFor('ceo')].sort()).toEqual(['data:view-all', 'tasks:write']);
  });

  it('vendedor recebe apenas tasks:write', () => {
    expect([...permissionsFor('vendedor')].sort()).toEqual(['tasks:write']);
  });

  it('é coerente com hasPermission em todos os cruzamentos', () => {
    for (const role of ROLES) {
      const granted = permissionsFor(role);
      for (const [permission] of MATRIX) {
        expect(granted.includes(permission)).toBe(hasPermission(role, permission));
      }
    }
  });

  it('devolve lista vazia para papel desconhecido', () => {
    expect(permissionsFor('hacker' as UserRole)).toEqual([]);
  });

  it('não permite que quem chama altere a matriz interna', () => {
    const first = permissionsFor('vendedor');
    first.push('users:manage');
    expect(permissionsFor('vendedor')).toEqual(['tasks:write']);
  });
});
