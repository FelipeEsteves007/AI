import type { RequestHandler } from 'express';
import jsonwebtoken from 'jsonwebtoken';

import type { AuthRepositories } from '@server/types/auth';
import { HttpError } from '@server/utils/httpError';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@server/utils/jwt';
import { toPublicUser } from '@server/utils/userMapper';

export interface RequireAuthOptions {
  /**
   * RN-05, fail-closed: por padrão quem está com senha provisória é barrado com
   * 403 `PASSWORD_CHANGE_REQUIRED`. Só as rotas que precisam funcionar nesse
   * estado (`GET /api/auth/me`, `PUT /api/auth/password`, `POST /api/auth/logout`)
   * liberam explicitamente, passando `true`.
   */
  allowPasswordChangePending?: boolean;
}

export type RequireAuth = (options?: RequireAuthOptions) => RequestHandler;

/**
 * Fábrica do `requireAuth`, com os repositórios injetados (`createApp(deps)`).
 *
 * A cada requisição o middleware lê o cookie de sessão, valida o JWT e consulta
 * o usuário no banco: é essa consulta que faz o usuário desativado perder o
 * acesso na requisição seguinte (RN-09) e derruba as sessões antigas quando o
 * `tokenVersion` muda (RN-10).
 */
export function createRequireAuth(repositories: Pick<AuthRepositories, 'users'>): RequireAuth {
  return function requireAuth(options: RequireAuthOptions = {}): RequestHandler {
    const allowPasswordChangePending = options.allowPasswordChangePending ?? false;

    return async (req, _res, next) => {
      const token: unknown = req.cookies?.[SESSION_COOKIE_NAME];

      if (typeof token !== 'string' || token.length === 0) {
        next(HttpError.unauthorized());
        return;
      }

      let userId: string;
      let tokenVersion: number;

      try {
        ({ userId, tokenVersion } = verifySessionToken(token));
      } catch (error) {
        // Token ruim é 401; falha de configuração (JWT_SECRET) sobe como erro interno.
        if (error instanceof jsonwebtoken.JsonWebTokenError) {
          next(HttpError.unauthorized());
          return;
        }

        next(error);
        return;
      }

      const user = await repositories.users.findById(userId);

      if (!user || !user.isActive || user.tokenVersion !== tokenVersion) {
        next(HttpError.unauthorized());
        return;
      }

      if (user.mustChangePassword && !allowPasswordChangePending) {
        next(HttpError.passwordChangeRequired());
        return;
      }

      req.user = toPublicUser(user);
      next();
    };
  };
}
