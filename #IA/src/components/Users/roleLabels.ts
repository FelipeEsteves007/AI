import type { UserRole } from '@/types/auth';

/**
 * Rótulo de cada papel na interface. O tipo `UserRole` vem do backend (schema Prisma),
 * então um papel novo lá quebra o typecheck aqui até ganhar rótulo.
 */
export const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  admin: 'Administrador',
  ceo: 'CEO',
  vendedor: 'Vendedor',
};

/** Ordem fixa dos papéis nos selects. */
export const ROLE_OPTIONS: readonly UserRole[] = ['admin', 'ceo', 'vendedor'];
