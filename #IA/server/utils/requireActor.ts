import type { PublicUser } from '@server/types/auth';
import { HttpError } from '@server/utils/httpError';

/** O usuário que o `requireAuth` pôs em `req.user`; ausente é 401. */
export function requireActor(user: PublicUser | undefined): PublicUser {
  if (!user) {
    throw HttpError.unauthorized();
  }

  return user;
}
