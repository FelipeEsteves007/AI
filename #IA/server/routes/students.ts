import { StudentStatus } from '@prisma/client';
import express, { Router } from 'express';
import { z } from 'zod';

import { createStudentsController } from '@server/controllers/studentsController';
import { createRequireAuth } from '@server/middleware/requireAuth';
import { mountPurchaseRoutes } from '@server/routes/courses';
import { requirePermission } from '@server/middleware/requirePermission';
import { validate } from '@server/middleware/validate';
import { createStudentImportService } from '@server/services/studentImportService';
import { createStudentService } from '@server/services/studentService';
import type { Repositories } from '@server/types/auth';
import { SORT_ORDERS, STUDENT_SORT_FIELDS } from '@server/types/students';
import { isValidCpf, normalizeCpf } from '@server/utils/cpf';

export const STUDENT_LIST_MAX_LIMIT = 500;
export const STUDENT_LIST_DEFAULT_LIMIT = 50;

const idParamsSchema = z.object({
  id: z.uuid({ error: 'Identificador inválido' }),
});

/**
 * Query de `GET /api/students`. Valores chegam como string; `page` e `limit` são convertidos.
 * `search` vazio (ou só espaços) equivale a não buscar.
 */
const listQuerySchema = z.object({
  page: z.coerce
    .number({ error: 'Página inválida' })
    .int({ error: 'Página inválida' })
    .min(1, { error: 'A página começa em 1' })
    .default(1),
  limit: z.coerce
    .number({ error: 'Limite inválido' })
    .int({ error: 'Limite inválido' })
    .min(1, { error: 'O limite mínimo é 1' })
    .max(STUDENT_LIST_MAX_LIMIT, { error: `O limite máximo é ${STUDENT_LIST_MAX_LIMIT}` })
    .default(STUDENT_LIST_DEFAULT_LIMIT),
  status: z.enum(StudentStatus, { error: 'Status inválido' }).optional(),
  search: z
    .string({ error: 'Busca inválida' })
    .trim()
    .max(255, { error: 'A busca pode ter no máximo 255 caracteres' })
    .optional()
    .transform((value) => (value ? value : undefined)),
  assignedTo: z.uuid({ error: 'Vendedor inválido' }).optional(),
  sortBy: z.enum(STUDENT_SORT_FIELDS, { error: 'Ordenação inválida' }).default('createdAt'),
  order: z.enum(SORT_ORDERS, { error: 'Sentido de ordenação inválido' }).default('desc'),
});

const nameSchema = z
  .string({ error: 'Informe o nome' })
  .trim()
  .min(1, { error: 'Informe o nome' })
  .max(255, { error: 'O nome pode ter no máximo 255 caracteres' });

/** E-mail sem diferenciar maiúsculas: normalizado antes de validar, gravar e checar duplicidade. */
const emailSchema = z
  .string({ error: 'Informe o e-mail' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'E-mail inválido' }));

/** Texto opcional: `null` limpa, e string vazia (ou só espaços) também vira `null`. */
const optionalTextSchema = (error: string) =>
  z
    .string({ error })
    .trim()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

/** CPF com ou sem máscara, validado pelos dígitos verificadores e devolvido só com dígitos. */
const cpfSchema = z
  .string({ error: 'CPF inválido' })
  .trim()
  .refine((value) => value === '' || isValidCpf(value), { error: 'CPF inválido' })
  .transform((value) => (value === '' ? null : normalizeCpf(value)))
  .nullable()
  .optional();

const studentFields = {
  phone: optionalTextSchema('Telefone inválido'),
  cpf: cpfSchema,
  notes: optionalTextSchema('Observações inválidas'),
  /** Validado para todos; para o vendedor, o serviço ignora o valor. */
  assignedTo: z.uuid({ error: 'Responsável inválido' }).nullable().optional(),
};

const createStudentSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  status: z.enum(StudentStatus, { error: 'Status inválido' }).default(StudentStatus.ativo),
  ...studentFields,
});

/** Parcial, mas corpo sem nenhum campo não é atualização: 400. */
const updateStudentSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    status: z.enum(StudentStatus, { error: 'Status inválido' }).optional(),
    ...studentFields,
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    error: 'Informe ao menos um campo para alterar',
  });

/**
 * Rotas de `/api/students`: listagem e detalhe (TASK-007), criação e edição (TASK-008) e
 * exclusão (TASK-009).
 *
 * Toda rota exige sessão, e o `requireAuth()` padrão já barra a senha provisória com 403.
 * Não há `requirePermission` na leitura nem na escrita: todos os papéis leem, criam e editam
 * (S6-6), e o escopo do vendedor é aplicado pelo serviço. A validação vem depois da
 * autenticação, como em `routes/users.ts`.
 *
 * `DELETE` é só do admin: `requirePermission('students:delete')` vem antes da validação do
 * `:id`, então CEO e vendedor recebem 403 sem descobrir se o id existe ou é válido.
 */
export function createStudentsRouter(repositories: Repositories): Router {
  const controller = createStudentsController(
    createStudentService(repositories),
    createStudentImportService(repositories),
  );
  const requireAuth = createRequireAuth(repositories);
  const router = Router();

  router.use(requireAuth());

  // TASK-012: só admin (`students:import`), checado antes de ler o corpo. O CSV vem como texto
  // (`text/csv`), sem multipart: ~3.000 alunos cabem com folga em 15 MB.
  router.post(
    '/bulk-import',
    requirePermission('students:import'),
    express.text({ type: ['text/csv', 'text/plain'], limit: '15mb' }),
    controller.import,
  );

  router.get('/', validate(listQuerySchema, 'query'), controller.list);
  router.get('/:id', validate(idParamsSchema, 'params'), controller.show);
  router.post('/', validate(createStudentSchema), controller.create);
  router.put(
    '/:id',
    validate(idParamsSchema, 'params'),
    validate(updateStudentSchema),
    controller.update,
  );
  router.delete(
    '/:id',
    requirePermission('students:delete'),
    validate(idParamsSchema, 'params'),
    controller.remove,
  );

  mountPurchaseRoutes(router, repositories);

  return router;
}
