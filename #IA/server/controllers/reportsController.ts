import type { RequestHandler } from 'express';

import type { ReportService } from '@server/services/reportService';
import type { StudentFilter } from '@server/types/students';
import { requireActor } from '@server/utils/requireActor';

export interface ReportsController {
  studentsExport: RequestHandler;
}

/** Handlers de `/api/reports` (TASK-028). Devolve o CSV como download. */
export function createReportsController(service: ReportService): ReportsController {
  return {
    studentsExport: async (req, res) => {
      const filter = req.query as unknown as StudentFilter;
      const report = await service.exportStudentsCsv(filter, requireActor(req.user));

      res
        .status(200)
        .setHeader('Content-Type', 'text/csv; charset=utf-8')
        .setHeader('Content-Disposition', `attachment; filename="${report.filename}"`)
        .setHeader('Cache-Control', 'no-store')
        .send(report.content);
    },
  };
}
