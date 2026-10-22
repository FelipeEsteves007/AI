import { Router } from 'express';
import { z } from 'zod';

import { createDashboardController } from '@server/controllers/dashboardController';
import { createRequireAuth } from '@server/middleware/requireAuth';
import { validate } from '@server/middleware/validate';
import { createDashboardService } from '@server/services/dashboardService';
import type { Repositories } from '@server/types/auth';
import { DASHBOARD_PERIODS } from '@server/types/dashboard';
import { dateOnlySchema } from '@server/utils/schemas';

const dashboardQuerySchema = z
  .object({
    period: z.enum(DASHBOARD_PERIODS, { error: 'Período inválido' }).default('30days'),
    from: dateOnlySchema('Data inicial inválida').optional(),
    to: dateOnlySchema('Data final inválida').optional(),
  })
  .refine((query) => query.period !== 'custom' || (query.from && query.to), {
    error: 'Informe from e to no período personalizado',
    path: ['period'],
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    error: 'A data inicial não pode ser depois da final',
    path: ['from'],
  });

/** `GET /api/dashboard/metrics` (TASK-019): todos os papéis; o vendedor vê só a própria carteira. */
export function createDashboardRouter(repositories: Repositories): Router {
  const controller = createDashboardController(createDashboardService(repositories));
  const router = Router();

  router.use(createRequireAuth(repositories)());
  router.get('/metrics', validate(dashboardQuerySchema, 'query'), controller.metrics);

  return router;
}
