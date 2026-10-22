import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { createUsersController } from '@server/controllers/usersController';
import { createRequireAuth } from '@server/middleware/requireAuth';
import { requirePermission } from '@server/middleware/requirePermission';
import { validate } from '@server/middleware/validate';
import { createUserService } from '@server/services/userService';
import type { Repositories } from '@server/types/auth';

/** Schemas Zod 4: `z.email()` e `z.uuid()` no lugar de `z.string().email()`. */
const idParamsSchema = z.object({
  id: z.uuid({ error: 'Identificador inválido' }),
});

const createUserSchema = z.object({
  name: z
    .string({ error: 'Informe o nome' })
    .trim()
    .min(1, { error: 'Informe o nome' })
    .max(120, { error: 'O nome pode ter no máximo 120 caracteres' }),
  email: z.string({ error: 'Informe o e-mail' }).trim().pipe(z.email({ error: 'E-mail inválido' })),
  role: z.enum(UserRole, { error: 'Papel inválido' }),
});

/**
 * Todos os campos são opcionais (só o que vier é alterado), mas um corpo vazio
 * não é uma atualização: sem nenhum campo a resposta é 400.
 */
const updateUserSchema = z
  .object({
    name: z
      .string({ error: 'Informe o nome' })
      .trim()
      .min(1, { error: 'Informe o nome' })
      .max(120, { error: 'O nome pode ter no máximo 120 caracteres' })
      .optional(),
    role: z.enum(UserRole, { error: 'Papel inválido' }).optional(),
    isActive: z.boolean({ error: 'Informe se o usuário está ativo' }).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    error: 'Informe ao menos um campo para alterar',
  });

/**
 * Rotas de `/api/users` (CU-08 a CU-13), com os repositórios injetados.
 *
 * RBAC no backend, em toda rota: `requireAuth()` no modo padrão — que já barra
 * a senha provisória com 403 `PASSWORD_CHANGE_REQUIRED` (RN-05) — seguido de
 * `requirePermission('users:manage')`, permissão que só o admin tem. CEO e
 * vendedor recebem 403 aqui, e não na interface.
 *
 * A validação vem depois da autorização de propósito: quem não pode não
 * descobre se o id existe nem quais campos o corpo aceita.
 */
export function createUsersRouter(repositories: Repositories): Router {
  const controller = createUsersController(createUserService(repositories));
  const requireAuth = createRequireAuth(repositories);
  const router = Router();

  router.use(requireAuth(), requirePermission('users:manage'));

  router.get('/', controller.list);
  router.post('/', validate(createUserSchema), controller.create);
  router.put(
    '/:id',
    validate(idParamsSchema, 'params'),
    validate(updateUserSchema),
    controller.update,
  );
  router.post(
    '/:id/password-reset',
    validate(idParamsSchema, 'params'),
    controller.resetPassword,
  );

  return router;
}
