import { LeadStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { createPipelineController } from '@server/controllers/pipelineController';
import { createRequireAuth } from '@server/middleware/requireAuth';
import { validate } from '@server/middleware/validate';
import { createPipelineService } from '@server/services/pipelineService';
import type { Repositories } from '@server/types/auth';
import { moneySchema } from '@server/utils/money';
import { dateOnlySchema, idParamsSchema, optionalTextSchema } from '@server/utils/schemas';

const leadValueSchema = moneySchema('Valor inválido: use até 2 casas decimais').nullable().optional();

const pipelineQuerySchema = z.object({
  assignedTo: z.uuid({ error: 'Vendedor inválido' }).optional(),
  from: dateOnlySchema('Data inicial inválida').optional(),
  to: dateOnlySchema('Data final inválida').optional(),
});

const createLeadSchema = z.object({
  studentId: z.uuid({ error: 'Aluno inválido' }),
  status: z.enum(LeadStatus, { error: 'Status inválido' }).optional(),
  value: leadValueSchema,
  assignedTo: z.uuid({ error: 'Responsável inválido' }).optional(),
});

const updateLeadSchema = z
  .object({
    value: leadValueSchema,
    lostReason: optionalTextSchema('Motivo inválido', 500),
    assignedTo: z.uuid({ error: 'Responsável inválido' }).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    error: 'Informe ao menos um campo para alterar',
  });

const leadStatusSchema = z.object({
  status: z.enum(LeadStatus, { error: 'Status inválido' }),
  lostReason: optionalTextSchema('Motivo inválido', 500),
});

/** `/api/pipeline` (TASK-021): todos os papéis, com o escopo do vendedor aplicado no serviço. */
export function createPipelineRouter(repositories: Repositories): Router {
  const controller = createPipelineController(createPipelineService(repositories));
  const router = Router();

  router.use(createRequireAuth(repositories)());
  router.get('/', validate(pipelineQuerySchema, 'query'), controller.list);
  router.post('/', validate(createLeadSchema), controller.create);
  router.put(
    '/:id',
    validate(idParamsSchema, 'params'),
    validate(updateLeadSchema),
    controller.update,
  );
  router.put(
    '/:id/status',
    validate(idParamsSchema, 'params'),
    validate(leadStatusSchema),
    controller.updateStatus,
  );

  return router;
}
