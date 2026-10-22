import type { ErrorRequestHandler } from 'express';

import { isHttpError, type HttpErrorDetails } from '@server/utils/httpError';
import { logger } from '@server/utils/logger';

interface ErrorResponseBody {
  error: string;
  code: string;
  details?: HttpErrorDetails;
}

/**
 * Middleware de erro do Express 5 (precisa dos quatro parâmetros).
 *
 * `HttpError` vira `{ error, code, details? }` com o status certo; qualquer
 * outro erro vira 500 genérico, sem vazar mensagem interna nem stack.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (isHttpError(error)) {
    const body: ErrorResponseBody = { error: error.message, code: error.code };

    if (error.details) {
      body.details = error.details;
    }

    res.status(error.status).json(body);
    return;
  }

  // Só o inesperado vai para o log; a resposta continua genérica, sem stack.
  logger.error({ err: error, method: req.method, path: req.path }, 'Erro não tratado na API');

  res.status(500).json({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
};
