// Fonte única: a matriz de permissões e os papéis vivem no backend
// (api/utils/permissions.ts, que por sua vez tira UserRole do schema Prisma).
// Import de tipo é apagado na compilação, então nada de servidor vai para o navegador.
export type { Permission, UserRole } from '@server/utils/permissions';

import type { Permission, UserRole } from '@server/utils/permissions';

/** Usuário como a API devolve — nunca inclui hash de senha nem tokenVersion. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface SessionResponse {
  user: AuthUser;
  permissions: Permission[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
