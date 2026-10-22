import type { RequestHandler } from 'express';

import type { PipelineService } from '@server/services/pipelineService';
import type {
  CreateLeadRequest,
  PipelineListQuery,
  UpdateLeadRequest,
  UpdateLeadStatusRequest,
} from '@server/types/pipeline';
import { requireActor } from '@server/utils/requireActor';

export interface PipelineController {
  list: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  updateStatus: RequestHandler;
}

/** Handlers de `/api/pipeline` (TASK-021). Camada fina: o RBAC fica no `pipelineService`. */
export function createPipelineController(service: PipelineService): PipelineController {
  return {
    list: async (req, res) => {
      const query = req.query as unknown as PipelineListQuery;

      res.status(200).json(await service.listLeads(query, requireActor(req.user)));
    },

    create: async (req, res) => {
      const input = req.body as CreateLeadRequest;

      res.status(201).json(await service.createLead(input, requireActor(req.user)));
    },

    update: async (req, res) => {
      const { id } = req.params as { id: string };
      const input = req.body as UpdateLeadRequest;

      res.status(200).json(await service.updateLead(id, input, requireActor(req.user)));
    },

    updateStatus: async (req, res) => {
      const { id } = req.params as { id: string };
      const input = req.body as UpdateLeadStatusRequest;

      res.status(200).json(await service.updateStatus(id, input, requireActor(req.user)));
    },
  };
}
