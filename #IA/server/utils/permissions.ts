/**
 * Matriz de permissões por papel — fonte única da verdade.
 *
 * Espelha a seção "Matriz de permissões" de
 * `ImersaoIA/specs/002-login-perfis/spec.md`. Qualquer mudança de papel ou de
 * permissão começa aqui; nenhuma rota, serviço ou tela deve repetir a matriz.
 */

import type { UserRole } from '@prisma/client';

/**
 * Fonte única do papel: o enum `UserRole` do `prisma/schema.prisma`. O import é
 * `type`-only, então nada do Prisma Client é carregado em runtime; um papel novo
 * no schema quebra o typecheck da matriz abaixo até ser mapeado aqui.
 */
export type { UserRole };

export type Permission =
  | 'users:manage'
  | 'students:import'
  | 'settings:manage'
  | 'courses:manage'
  | 'students:delete'
  | 'data:view-all'
  | 'tasks:write';

const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly Permission[]>> = Object.freeze({
  admin: Object.freeze([
    'users:manage',
    'students:import',
    'settings:manage',
    'courses:manage',
    'students:delete',
    'data:view-all',
    'tasks:write',
  ] as const),
  ceo: Object.freeze(['data:view-all', 'tasks:write'] as const),
  vendedor: Object.freeze(['tasks:write'] as const),
});

/** Permissões concedidas ao papel, em uma cópia nova (papel desconhecido: lista vazia). */
export function permissionsFor(role: UserRole): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

/** Verdadeiro só quando a matriz concede a permissão ao papel. Nega o que não conhece. */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
