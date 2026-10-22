import { AuditAction } from '@prisma/client';

import type { PublicUser, Repositories } from '@server/types/auth';
import type { StudentExportRecord, StudentFilter } from '@server/types/students';
import { todayDateOnly } from '@server/utils/dates';
import { HttpError } from '@server/utils/httpError';
import { hasPermission } from '@server/utils/permissions';

const STATUS_LABELS = { ativo: 'Ativo', inativo: 'Inativo', pausado: 'Pausado' } as const;

export interface StudentsExport {
  filename: string;
  content: string;
  rows: number;
}

export interface ReportService {
  exportStudentsCsv(filter: StudentFilter, actor: PublicUser): Promise<StudentsExport>;
}

/** Campo de CSV com `;`: aspas quando há separador, aspas ou quebra de linha. */
function csvField(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** `Date` → `dd/mm/aaaa` no fuso do negócio. */
function brDate(value: Date): string {
  const [year, month, day] = todayDateOnly(value).split('-');
  return `${day}/${month}/${year}`;
}

/**
 * CSV para o Excel em português: separador `;`, BOM UTF-8 (acentos) e CRLF. Colunas da TASK-028.
 * CPF vai como texto (`="…"`) para o Excel não comer o zero à esquerda.
 */
export function toStudentsCsv(students: StudentExportRecord[]): string {
  const header = ['Nome', 'E-mail', 'Telefone', 'CPF', 'Status', 'Vendedor', 'Cursos', 'Data de cadastro'];
  const lines = students.map((student) =>
    [
      student.name,
      student.email,
      student.phone ?? '',
      student.cpf ? `="${student.cpf}"` : '',
      STATUS_LABELS[student.status],
      student.assignedToUser?.name ?? '',
      student.purchases.map((purchase) => purchase.course.name).join(', '),
      brDate(student.createdAt),
    ]
      .map((value) => (value.startsWith('="') ? value : csvField(value)))
      .join(';'),
  );

  return `﻿${[header.join(';'), ...lines].join('\r\n')}\r\n`;
}

/**
 * Exportação de alunos (TASK-028). O CSV tem CPF e e-mail da base inteira, então só quem tem
 * `data:view-all` (admin e CEO) exporta — decisão S9-3. A exportação é auditada.
 */
export function createReportService({
  students,
  auditLogs,
}: Pick<Repositories, 'students' | 'auditLogs'>): ReportService {
  return {
    async exportStudentsCsv(filter, actor) {
      if (!hasPermission(actor.role, 'data:view-all')) {
        throw HttpError.forbidden();
      }

      const rows = await students.listForExport(filter);

      await auditLogs.record({
        action: AuditAction.STUDENTS_EXPORTED,
        actorId: actor.id,
        metadata: { rows: rows.length, filter: { ...filter } },
      });

      return {
        filename: `alunos-${todayDateOnly()}.csv`,
        content: toStudentsCsv(rows),
        rows: rows.length,
      };
    },
  };
}
