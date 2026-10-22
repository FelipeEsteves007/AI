import { Router } from 'express';
import { z } from 'zod';

import { createEmailController } from '@server/controllers/emailController';
import { createRequireAuth } from '@server/middleware/requireAuth';
import { validate } from '@server/middleware/validate';
import { createEmailService } from '@server/services/emailService';
import type { Repositories } from '@server/types/auth';

/** Máximo de alunos por envio manual: é seleção, não disparo para a base. */
export const BULK_EMAIL_MAX_STUDENTS = 100;

const subjectSchema = z
  .string({ error: 'Informe o assunto' })
  .trim()
  .min(1, { error: 'Informe o assunto' })
  .max(200, { error: 'O assunto pode ter no máximo 200 caracteres' });

const bodySchema = z
  .string({ error: 'Escreva a mensagem' })
  .trim()
  .min(1, { error: 'Escreva a mensagem' })
  .max(10_000, { error: 'A mensagem pode ter no máximo 10.000 caracteres' });

const sendSchema = z.object({
  studentId: z.uuid({ error: 'Aluno inválido' }),
  subject: subjectSchema,
  body: bodySchema,
});

const sendBulkSchema = z.object({
  studentIds: z
    .array(z.uuid({ error: 'Aluno inválido' }), { error: 'Selecione os alunos' })
    .min(1, { error: 'Selecione ao menos um aluno' })
    .max(BULK_EMAIL_MAX_STUDENTS, {
      error: `Selecione no máximo ${BULK_EMAIL_MAX_STUDENTS} alunos por envio`,
    })
    .transform((ids) => [...new Set(ids)]),
  subject: subjectSchema,
  body: bodySchema,
});

/**
 * `/api/email` (TASK-025 e TASK-026): todos os papéis, sempre para alunos do próprio escopo.
 * Envio só por ação manual — nunca automação (regra do `CLAUDE.md`).
 */
export function createEmailRouter(repositories: Repositories): Router {
  const controller = createEmailController(createEmailService(repositories));
  const router = Router();

  router.use(createRequireAuth(repositories)());
  router.post('/send', validate(sendSchema), controller.send);
  router.post('/send-bulk', validate(sendBulkSchema), controller.sendBulk);

  return router;
}
