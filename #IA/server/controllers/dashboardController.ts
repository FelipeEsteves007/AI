import type { RequestHandler } from 'express';

import type { DashboardService } from '@server/services/dashboardService';
import type { DashboardQuery } from '@server/types/dashboard';
import { requireActor } from '@server/utils/requireActor';

export interface DashboardController {
  metrics: RequestHandler;
}

/** Handler de `/api/dashboard` (TASK-019). Camada fina: só HTTP. */
export function createDashboardController(service: DashboardService): DashboardController {
  return {
    metrics: async (req, res) => {
      const query = req.query as unknown as DashboardQuery;

      res.status(200).json(await service.getMetrics(query, requireActor(req.user)));
    },
  };
}
