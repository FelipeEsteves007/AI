import { Router } from 'express';
import { z } from 'zod';

import { createAuthController } from '@server/controllers/authController';
import { createRequireAuth } from '@server/middleware/requireAuth';
import { validate } from '@server/middleware/validate';
import { createAuthService, MIN_PASSWORD_LENGTH } from '@server/services/authService';
import type { Repositories } from '@server/types/auth';

/** Schemas Zod 4: `z.email()` no lugar de `z.string().email()`, mensagens em `error`. */
const loginSchema = z.object({
  email: z.string({ error: 'Informe o e-mail' }).trim().pipe(z.email({ error: 'E-mail inválido' })),
  password: z.string({ error: 'Informe a senha' }).min(1, { error: 'Informe a senha' }),
});

const changePasswordSchema = z.object({
  currentPassword: z
    .string({ error: 'Informe a senha atual' })
    .min(1, { error: 'Informe a senha atual' }),
  newPassword: z.string({ error: 'Informe a nova senha' }).min(MIN_PASSWORD_LENGTH, {
    error: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
  }),
});

/**
 * Rotas de `/api/auth`, com os repositórios injetados (`createApp(deps)`).
 *
 * `GET /me` e `PUT /password` são as rotas autenticadas que precisam funcionar
 * com senha provisória (RN-05); em qualquer outra o `requireAuth()` padrão
 * responde 403 `PASSWORD_CHANGE_REQUIRED`.
 */
export function createAuthRouter(repositories: Repositories): Router {
  const controller = createAuthController(createAuthService(repositories));
  const requireAuth = createRequireAuth(repositories);
  const router = Router();

  router.post('/login', validate(loginSchema), controller.login);
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth({ allowPasswordChangePending: true }), controller.me);
  router.put(
    '/password',
    requireAuth({ allowPasswordChangePending: true }),
    validate(changePasswordSchema),
    controller.changePassword,
  );

  return router;
}
