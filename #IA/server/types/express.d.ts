import type { PublicUser } from '@server/types/auth';

/**
 * Augmentation do Express: `req.user` é o usuário público já autenticado pelo
 * `requireAuth` — nunca `passwordHash` nem `tokenVersion` (RN-13). Fica
 * opcional porque só existe depois que o middleware roda.
 */
declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export {};
