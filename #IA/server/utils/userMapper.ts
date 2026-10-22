import type { User } from '@prisma/client';

import type { PublicUser } from '@server/types/auth';

/** Normaliza o e-mail para que a comparação não diferencie maiúsculas (RN-01). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Remove do usuário os campos que nunca saem da API (RN-13). */
export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, tokenVersion: _tokenVersion, ...publicUser } = user;

  return publicUser;
}
