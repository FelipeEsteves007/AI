import { AuditAction, StudentStatus, type User } from '@prisma/client';
import { z } from 'zod';

import type { PublicUser, Repositories } from '@server/types/auth';
import type {
  CreateStudentData,
  StudentImportError,
  StudentImportResponse,
} from '@server/types/students';
import { isValidCpf, normalizeCpf } from '@server/utils/cpf';
import { parseCsv } from '@server/utils/csv';
import { HttpError } from '@server/utils/httpError';
import { hasPermission } from '@server/utils/permissions';
import { normalizeEmail } from '@server/utils/userMapper';

/** Limite por importação (TASK-012). */
export const IMPORT_MAX_ROWS = 10_000;
/** Tamanho de cada `createMany`: 3.000 alunos viram 3 INSERTs. */
const INSERT_BATCH_SIZE = 1_000;

type ImportColumn = 'name' | 'email' | 'phone' | 'cpf' | 'status' | 'assignedToEmail';

/** Cabeçalhos aceitos (sem acento, minúsculos), em inglês como no contrato ou em português. */
const HEADER_ALIASES: Readonly<Record<string, ImportColumn>> = {
  name: 'name',
  nome: 'name',
  email: 'email',
  'e-mail': 'email',
  phone: 'phone',
  telefone: 'phone',
  cpf: 'cpf',
  status: 'status',
  assigned_to_email: 'assignedToEmail',
  responsavel: 'assignedToEmail',
  responsavel_email: 'assignedToEmail',
  vendedor: 'assignedToEmail',
  vendedor_email: 'assignedToEmail',
};

const emailSchema = z.email();

export interface StudentImportService {
  importStudents(csv: string, actor: PublicUser): Promise<StudentImportResponse>;
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

function summaryFor({ imported, failed, duplicates }: Omit<StudentImportResponse, 'summary' | 'errors'>) {
  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

  return [
    `${plural(imported, 'aluno importado', 'alunos importados')}.`,
    `${plural(failed, 'linha inválida', 'linhas inválidas')}.`,
    `${plural(duplicates, 'duplicata', 'duplicatas')}.`,
  ].join(' ');
}

/**
 * Importação de alunos por CSV (TASK-012). Linha a linha: uma linha ruim é pulada e entra no
 * relatório, sem abortar as outras (regra do `CLAUDE.md`, que prevalece sobre o "insert all ou
 * rollback" da task). Nunca integra com a Hotmart: o arquivo vem sempre do upload manual.
 */
export function createStudentImportService({
  students,
  users,
  auditLogs,
}: Pick<Repositories, 'students' | 'users' | 'auditLogs'>): StudentImportService {
  return {
    async importStudents(csv, actor) {
      // A rota já exige `students:import`; repetir mantém a regra para outros chamadores.
      if (!hasPermission(actor.role, 'students:import')) {
        throw HttpError.forbidden();
      }

      const [header, ...lines] = parseCsv(csv);

      if (!header) {
        throw HttpError.validation('Arquivo vazio', { file: 'O arquivo CSV está vazio' });
      }

      const columns = header.map((value) => HEADER_ALIASES[normalizeHeader(value)]);

      if (!columns.includes('name') || !columns.includes('email')) {
        throw HttpError.validation('Cabeçalho inválido', {
          file: 'O CSV precisa das colunas name e email (ou nome e e-mail)',
        });
      }

      if (lines.length > IMPORT_MAX_ROWS) {
        throw HttpError.validation('Arquivo grande demais', {
          file: `O limite é de ${IMPORT_MAX_ROWS.toLocaleString('pt-BR')} alunos por importação`,
        });
      }

      const usersByEmail = new Map<string, User>(
        (await users.list()).map((user) => [user.email, user]),
      );
      const errors: StudentImportError[] = [];
      let failed = 0;
      let duplicates = 0;
      const candidates: { row: number; data: CreateStudentData }[] = [];
      const seenEmails = new Set<string>();
      const seenCpfs = new Set<string>();

      lines.forEach((values, index) => {
        const row = index + 2;
        const cell = (column: ImportColumn) => {
          const position = columns.indexOf(column);
          return position === -1 ? '' : (values[position] ?? '').trim();
        };
        const name = cell('name');
        const fail = (error: string) => {
          failed += 1;
          errors.push({ row, name, error });
        };
        const duplicate = (error: string) => {
          duplicates += 1;
          errors.push({ row, name, error });
        };

        if (!name) return fail('Nome obrigatório');
        if (name.length > 255) return fail('Nome com mais de 255 caracteres');

        const email = normalizeEmail(cell('email'));
        if (!emailSchema.safeParse(email).success) return fail('E-mail inválido');

        const rawCpf = cell('cpf');
        if (rawCpf && !isValidCpf(rawCpf)) return fail('CPF inválido');
        const cpf = rawCpf ? normalizeCpf(rawCpf) : null;

        const rawStatus = cell('status').toLowerCase();
        if (rawStatus && !(rawStatus in StudentStatus)) return fail('Status inválido');
        const status = rawStatus ? (rawStatus as StudentStatus) : StudentStatus.ativo;

        const assignedEmail = normalizeEmail(cell('assignedToEmail'));
        let assignedTo: string | null = null;
        if (assignedEmail) {
          const assignee = usersByEmail.get(assignedEmail);
          if (!assignee) return fail('Responsável não encontrado');
          if (!assignee.isActive) return fail('Responsável desativado');
          assignedTo = assignee.id;
        }

        if (seenEmails.has(email)) return duplicate('E-mail repetido no arquivo');
        if (cpf && seenCpfs.has(cpf)) return duplicate('CPF repetido no arquivo');
        seenEmails.add(email);
        if (cpf) seenCpfs.add(cpf);

        const phone = cell('phone');
        candidates.push({
          row,
          data: { name, email, phone: phone || null, cpf, status, notes: null, assignedTo },
        });
      });

      const existing = await students.findExistingKeys(
        candidates.map(({ data }) => data.email),
        candidates.flatMap(({ data }) => (data.cpf ? [data.cpf] : [])),
      );
      const existingEmails = new Set(existing.emails);
      const existingCpfs = new Set(existing.cpfs);
      const toInsert: CreateStudentData[] = [];

      for (const { row, data } of candidates) {
        if (existingEmails.has(data.email)) {
          duplicates += 1;
          errors.push({ row, name: data.name, error: 'E-mail já cadastrado' });
        } else if (data.cpf && existingCpfs.has(data.cpf)) {
          duplicates += 1;
          errors.push({ row, name: data.name, error: 'CPF já cadastrado' });
        } else {
          toInsert.push(data);
        }
      }

      let imported = 0;
      for (let start = 0; start < toInsert.length; start += INSERT_BATCH_SIZE) {
        imported += await students.createMany(toInsert.slice(start, start + INSERT_BATCH_SIZE));
      }

      errors.sort((a, b) => a.row - b.row);
      const report = { imported, failed, duplicates };

      // Constituição: importação é ação crítica auditada (quem, quando, quantos).
      await auditLogs.record({
        action: AuditAction.STUDENTS_IMPORTED,
        actorId: actor.id,
        metadata: { ...report, totalRows: lines.length },
      });

      return { ...report, errors, summary: summaryFor(report) };
    },
  };
}
