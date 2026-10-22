import { Router } from 'express';
import { z } from 'zod';

import { createCoursesController } from '@server/controllers/coursesController';
import { createRequireAuth } from '@server/middleware/requireAuth';
import { requirePermission } from '@server/middleware/requirePermission';
import { validate } from '@server/middleware/validate';
import { createCourseService } from '@server/services/courseService';
import type { Repositories } from '@server/types/auth';
import { isValidDateOnly, todayDateOnly } from '@server/utils/dates';
import { moneySchema } from '@server/utils/money';

const COURSE_LIST_MAX_LIMIT = 500;

export const idParamsSchema = z.object({
  id: z.uuid({ error: 'Identificador inválido' }),
});

const listQuerySchema = z.object({
  page: z.coerce.number({ error: 'Página inválida' }).int().min(1).default(1),
  limit: z.coerce
    .number({ error: 'Limite inválido' })
    .int()
    .min(1)
    .max(COURSE_LIST_MAX_LIMIT, { error: `O limite máximo é ${COURSE_LIST_MAX_LIMIT}` })
    .default(50),
  isActive: z
    .enum(['true', 'false'], { error: 'Use true ou false' })
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

const nameSchema = z
  .string({ error: 'Informe o nome' })
  .trim()
  .min(1, { error: 'Informe o nome' })
  .max(255, { error: 'O nome pode ter no máximo 255 caracteres' });

const descriptionSchema = z
  .string({ error: 'Descrição inválida' })
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional();

const priceSchema = moneySchema('Preço inválido: use até 2 casas decimais');

const createCourseSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  price: priceSchema,
  isActive: z.boolean({ error: 'Status inválido' }).optional(),
});

const updateCourseSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema,
    price: priceSchema.optional(),
    isActive: z.boolean({ error: 'Status inválido' }).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    error: 'Informe ao menos um campo para alterar',
  });

/** Corpo de `POST /api/students/:id/purchases` (TASK-016). */
export const createPurchaseSchema = z.object({
  courseId: z.uuid({ error: 'Curso inválido' }),
  purchaseDate: z
    .string({ error: 'Informe a data da compra' })
    .refine(isValidDateOnly, { error: 'Data inválida: use AAAA-MM-DD' })
    .refine((value) => value <= todayDateOnly(), {
      error: 'A data da compra não pode ser futura',
    }),
  amount: moneySchema('Valor inválido: use até 2 casas decimais').optional(),
  notes: descriptionSchema,
});

/**
 * Rotas de `/api/courses` (TASK-014). Todos os papéis listam — o vendedor escolhe o curso ao
 * registrar uma compra —, mas criar, editar e excluir exigem `courses:manage` (só admin), antes
 * da validação, como no `DELETE /api/students/:id`.
 */
export function createCoursesRouter(repositories: Repositories): Router {
  const controller = createCoursesController(createCourseService(repositories));
  const requireAuth = createRequireAuth(repositories);
  const router = Router();

  router.use(requireAuth());

  router.get('/', validate(listQuerySchema, 'query'), controller.list);
  router.post(
    '/',
    requirePermission('courses:manage'),
    validate(createCourseSchema),
    controller.create,
  );
  router.put(
    '/:id',
    requirePermission('courses:manage'),
    validate(idParamsSchema, 'params'),
    validate(updateCourseSchema),
    controller.update,
  );
  router.delete(
    '/:id',
    requirePermission('courses:manage'),
    validate(idParamsSchema, 'params'),
    controller.remove,
  );

  return router;
}

/**
 * Compras do aluno (TASK-016 e TASK-017), montadas dentro de `/api/students`. Todos os papéis
 * registram e listam, sempre no escopo do aluno: vendedor só nos próprios alunos (404 fora).
 */
export function mountPurchaseRoutes(router: Router, repositories: Repositories): void {
  const controller = createCoursesController(createCourseService(repositories));

  router.get('/:id/purchases', validate(idParamsSchema, 'params'), controller.listPurchases);
  router.post(
    '/:id/purchases',
    validate(idParamsSchema, 'params'),
    validate(createPurchaseSchema),
    controller.createPurchase,
  );
}
