import type { Request, RequestHandler } from 'express';
import type { z } from 'zod';

import { HttpError, type HttpErrorDetails } from '@server/utils/httpError';

/** Parte da requisição a validar. */
export type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Valida `body`, `params` ou `query` com um schema Zod 4 e substitui o valor
 * original pelo dado já validado e convertido. Falha vira
 * `HttpError.validation()` (400 `VALIDATION_ERROR`) com os detalhes por campo.
 */
export function validate(
  schema: z.ZodType,
  target: ValidationTarget = 'body',
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(HttpError.validation('Dados inválidos', toDetails(result.error, target)));
      return;
    }

    replaceTarget(req, target, result.data);
    next();
  };
}

/** Uma mensagem por campo — a primeira, que é a mais específica do Zod. */
function toDetails(error: z.ZodError, target: ValidationTarget): HttpErrorDetails {
  const details: HttpErrorDetails = {};

  for (const issue of error.issues) {
    const field = issue.path.map((segment) => String(segment)).join('.') || target;

    if (!(field in details)) {
      details[field] = issue.message;
    }
  }

  return details;
}

/**
 * No Express 5 `req.query` é um getter sem setter: atribuir direto lança.
 * Por isso a substituição usa `defineProperty` nesse caso.
 */
function replaceTarget(req: Request, target: ValidationTarget, value: unknown): void {
  if (target === 'query') {
    Object.defineProperty(req, 'query', {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    return;
  }

  if (target === 'params') {
    req.params = value as Request['params'];
    return;
  }

  req.body = value;
}
