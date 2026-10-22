import type { Prisma, PrismaClient } from '@prisma/client';

import type {
  StudentFilter,
  StudentListParams,
  StudentRepository,
  UpdateStudentData,
} from '@server/types/students';
import { normalizeEmail } from '@server/utils/userMapper';

import { toAuditLogCreateData } from './auditLogModel';
import { prisma } from './prismaClient';

const assigneeName = { assignedToUser: { select: { name: true } } } as const;

/**
 * O Prisma NÃO escapa os curingas no `contains`: ele gera `ILIKE '%<termo>%'` com o termo cru,
 * então `100%` casaria `1000` e `%` sozinho casaria tudo. Escapa `\`, `%` e `_` com `\`, o
 * escape padrão do `LIKE`/`ILIKE` no Postgres, para a busca tratá-los como literais.
 */
export function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * `where` único para contagem e página: é o que garante que o `total` do vendedor conte só
 * os alunos dele. Os filtros usam os índices `Students(assignedTo)` e `Students(status)`;
 * a busca `ILIKE` em nome/e-mail não usa índice (varredura aceitável para ~3.000 linhas).
 */
function toWhere({ status, search, assignedTo }: StudentFilter): Prisma.StudentWhereInput {
  const pattern = search === undefined ? undefined : escapeLikePattern(search);

  return {
    ...(status === undefined ? {} : { status }),
    ...(assignedTo === undefined ? {} : { assignedTo }),
    ...(pattern === undefined
      ? {}
      : {
          OR: [
            { name: { contains: pattern, mode: 'insensitive' } },
            { email: { contains: pattern, mode: 'insensitive' } },
          ],
        }),
  };
}

/** Repositório de alunos sobre o Prisma. Camada fina: só acesso a dados, sem regra de negócio. */
export function createStudentModel(client: PrismaClient = prisma): StudentRepository {
  return {
    async list({ filter, sortBy, order, skip, take }: StudentListParams) {
      const where = toWhere(filter);
      // `id` como desempate: sem ele, registros com o mesmo valor podem trocar de página.
      const orderBy: Prisma.StudentOrderByWithRelationInput[] = [
        { [sortBy]: order },
        { id: 'asc' },
      ];

      const [rows, total] = await client.$transaction([
        client.student.findMany({
          where,
          orderBy,
          skip,
          take,
          include: assigneeName,
        }),
        client.student.count({ where }),
      ]);

      return { rows, total };
    },

    async findDetail(id, scope) {
      // S6-9: com escopo (vendedor), leads e tarefas do aluno também ficam presos ao próprio
      // responsável — um aluno reatribuído não expõe o pipeline do vendedor anterior.
      const ownedOnly =
        scope.assignedTo === undefined ? {} : { where: { assignedTo: scope.assignedTo } };

      return client.student.findFirst({
        where: { id, ...toWhere(scope) },
        include: {
          ...assigneeName,
          purchases: {
            include: { course: { select: { id: true, name: true } } },
            orderBy: { purchaseDate: 'desc' },
          },
          pipelineLeads: { ...ownedOnly, orderBy: { createdAt: 'desc' } },
          tasks: { ...ownedOnly, orderBy: { dueDate: 'asc' } },
        },
      });
    },

    async findById(id, scope) {
      return client.student.findFirst({ where: { id, ...toWhere(scope) }, include: assigneeName });
    },

    async findByEmail(email) {
      return client.student.findUnique({ where: { email: normalizeEmail(email) } });
    },

    async findByCpf(cpf) {
      return client.student.findUnique({ where: { cpf } });
    },

    async create(data) {
      return client.student.create({ data: withNormalizedEmail(data), include: assigneeName });
    },

    async update(id, data, scope) {
      // S6-11: escopo no `where` do próprio `update` (Prisma 6 aceita campos não únicos junto
      // do `id`). Fora do escopo ou inexistente, o Prisma lança `P2025`.
      const where: Prisma.StudentWhereUniqueInput =
        scope.assignedTo === undefined ? { id } : { id, assignedTo: scope.assignedTo };

      return client.student.update({
        where,
        data: withNormalizedEmail(data),
        include: assigneeName,
      });
    },

    async delete(id, audit) {
      // Snapshot, exclusão e auditoria numa transação só: as contagens são as dos filhos que a
      // cascata (`onDelete: Cascade`) leva junto, e se o INSERT do log falhar o Postgres desfaz
      // o DELETE — aluno excluído sem registro não existe. Inexistente: `P2025`, sem log.
      return client.$transaction(async (tx) => {
        const { _count, ...student } = await tx.student.findUniqueOrThrow({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            _count: { select: { purchases: true, pipelineLeads: true, tasks: true } },
          },
        });

        await tx.student.delete({ where: { id } });

        const snapshot = { ...student, cascade: _count };

        await tx.auditLog.create({ data: toAuditLogCreateData(audit(snapshot)) });

        return snapshot;
      });
    },

    async findExistingKeys(emails, cpfs) {
      const rows = await client.student.findMany({
        where: { OR: [{ email: { in: emails.map(normalizeEmail) } }, { cpf: { in: cpfs } }] },
        select: { email: true, cpf: true },
      });

      return {
        emails: rows.map((row) => row.email),
        cpfs: rows.flatMap((row) => (row.cpf ? [row.cpf] : [])),
      };
    },

    listForExport(filter) {
      return client.student.findMany({
        where: toWhere(filter),
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        include: {
          ...assigneeName,
          purchases: {
            select: { course: { select: { name: true } } },
            orderBy: { purchaseDate: 'desc' },
          },
        },
      });
    },

    async createMany(data) {
      // `skipDuplicates`: quem entrou entre a checagem e o INSERT fica de fora sem abortar o lote.
      const { count } = await client.student.createMany({
        data: data.map(withNormalizedEmail),
        skipDuplicates: true,
      });

      return count;
    },
  };
}

/** Normaliza o e-mail só se vier: no `update`, chave ausente continua ausente. */
function withNormalizedEmail<T extends UpdateStudentData>(data: T): T {
  return data.email === undefined ? data : { ...data, email: normalizeEmail(data.email) };
}

export const studentModel: StudentRepository = createStudentModel();
