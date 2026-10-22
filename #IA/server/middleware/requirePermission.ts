import type { RequestHandler } from 'express';

import { HttpError } from '@server/utils/httpError';
import { hasPermission, type Permission } from '@server/utils/permissions';

/**
 * RBAC no backend: exige a permissão da matriz única (`api/utils/permissions.ts`)
 * para o papel do usuário autenticado. Nenhuma rota redeclara papéis.
 *
 * Use sempre depois do `requireAuth`; sem `req.user` a resposta é 401.
 */
export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;

    if (!user) {
      next(HttpError.unauthorized());
      return;
    }

    if (!hasPermission(user.role, permission)) {
      next(HttpError.forbidden());
      return;
    }

    next();
  };
}
