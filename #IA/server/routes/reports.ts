import { StudentStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { createReportsController } from '@server/controllers/reportsController';
import { createRequireAuth } from '@server/middleware/requireAuth';
import { requirePermission } from '@server/middleware/requirePermission';
import { validate } from '@server/middleware/validate';
import { createReportService } from '@server/services/reportService';
import type { Repositories } from '@server/types/auth';

/** Mesmos filtros da listagem de `/api/students` (status, busca e vendedor), sem paginação. */
const exportQuerySchema = z.object({
  format: z.enum(['csv'], { error: 'Formato indisponível: use csv' }).default('csv'),
  status: z.enum(StudentStatus, { error: 'Status inválido' }).optional(),
  search: z
    .string()
    .trim()
    .max(255, { error: 'A busca pode ter no máximo 255 caracteres' })
    .optional()
    .transform((value) => (value ? value : undefined)),
  assignedTo: z.uuid({ error: 'Vendedor inválido' }).optional(),
});

/** `GET /api/reports/students-export` (TASK-028): só admin e CEO (`data:view-all`). */
export function createReportsRouter(repositories: Repositories): Router {
  const controller = createReportsController(createReportService(repositories));
  const router = Router();

  router.use(createRequireAuth(repositories)());
  router.get(
    '/students-export',
    requirePermission('data:view-all'),
    validate(exportQuerySchema, 'query'),
    (req, _res, next) => {
      // `format` só escolhe o gerador; o filtro que desce ao serviço é o da listagem.
      const { format: _format, ...filter } = req.query as Record<string, unknown>;
      Object.defineProperty(req, 'query', { value: filter, writable: true, configurable: true });
      next();
    },
    controller.studentsExport,
  );

  return router;
}
