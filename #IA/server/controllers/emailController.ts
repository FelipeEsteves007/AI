import type { RequestHandler } from 'express';

import type { EmailService } from '@server/services/emailService';
import type { SendBulkEmailRequest, SendEmailRequest } from '@server/types/email';
import { requireActor } from '@server/utils/requireActor';

export interface EmailController {
  send: RequestHandler;
  sendBulk: RequestHandler;
}

/** Handlers de `/api/email` (TASK-025 e TASK-026). Camada fina: só HTTP. */
export function createEmailController(service: EmailService): EmailController {
  return {
    send: async (req, res) => {
      const input = req.body as SendEmailRequest;

      res.status(200).json(await service.sendToStudent(input, requireActor(req.user)));
    },

    sendBulk: async (req, res) => {
      const input = req.body as SendBulkEmailRequest;

      res.status(200).json(await service.sendBulk(input, requireActor(req.user)));
    },
  };
}
