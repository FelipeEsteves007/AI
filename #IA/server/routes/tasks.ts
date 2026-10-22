import { TaskPriority } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { createTasksController } from '@server/controllers/tasksController';
import { createRequireAuth } from '@server/middleware/requireAuth';
import { requirePermission } from '@server/middleware/requirePermission';
import { validate } from '@server/middleware/validate';
import { createTaskService } from '@server/services/taskService';
import type { Repositories } from '@server/types/auth';
import { isValidDateOnly } from '@server/utils/dates';
import { booleanQuerySchema, idParamsSchema, optionalTextSchema } from '@server/utils/schemas';

/** Vencimento: `YYYY-MM-DD` vira meio-dia no Brasil, para não trocar de dia em nenhum fuso. */
const dueDateSchema = z
  .string({ error: 'Informe o vencimento' })
  .refine((value) => isValidDateOnly(value) || !Number.isNaN(Date.parse(value)), {
    error: 'Vencimento inválido',
  })
  .transform((value) =>
    isValidDateOnly(value) ? `${value}T12:00:00.000-03:00` : new Date(value).toISOString(),
  );

const titleSchema = z
  .string({ error: 'Informe o título' })
  .trim()
  .min(1, { error: 'Informe o título' })
  .max(255, { error: 'O título pode ter no máximo 255 caracteres' });

const taskFields = {
  description: optionalTextSchema('Descrição inválida', 2000),
  priority: z.enum(TaskPriority, { error: 'Prioridade inválida' }).optional(),
  studentId: z.uuid({ error: 'Aluno inválido' }).nullable().optional(),
};

const createTaskSchema = z.object({ title: titleSchema, dueDate: dueDateSchema, ...taskFields });

const updateTaskSchema = z
  .object({ title: titleSchema.optional(), dueDate: dueDateSchema.optional(), ...taskFields })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    error: 'Informe ao menos um campo para alterar',
  });

const taskQuerySchema = z.object({
  completed: booleanQuerySchema,
  priority: z.enum(TaskPriority, { error: 'Prioridade inválida' }).optional(),
});

const completeSchema = z.object({ completed: z.boolean().default(true) });

/** `/api/tasks` (TASK-023): exige `tasks:write` (os três papéis têm); cada um só vê as próprias. */
export function createTasksRouter(repositories: Repositories): Router {
  const controller = createTasksController(createTaskService(repositories));
  const router = Router();

  router.use(createRequireAuth(repositories)(), requirePermission('tasks:write'));
  router.get('/', validate(taskQuerySchema, 'query'), controller.list);
  router.post('/', validate(createTaskSchema), controller.create);
  router.put(
    '/:id',
    validate(idParamsSchema, 'params'),
    validate(updateTaskSchema),
    controller.update,
  );
  router.put(
    '/:id/complete',
    validate(idParamsSchema, 'params'),
    validate(completeSchema),
    controller.complete,
  );
  router.delete('/:id', validate(idParamsSchema, 'params'), controller.remove);

  return router;
}
