import { AuditAction } from '@prisma/client';

import type { PublicUser, Repositories } from '@server/types/auth';
import type {
  BulkEmailResult,
  SendBulkEmailRequest,
  SendBulkEmailResponse,
  SendEmailRequest,
  SendEmailResponse,
} from '@server/types/email';
import { HttpError } from '@server/utils/httpError';
import { logger } from '@server/utils/logger';
import { renderTemplate, textToHtml } from '@server/utils/mailer';
import { hasPermission } from '@server/utils/permissions';

export interface EmailService {
  sendToStudent(input: SendEmailRequest, actor: PublicUser): Promise<SendEmailResponse>;
  sendBulk(input: SendBulkEmailRequest, actor: PublicUser): Promise<SendBulkEmailResponse>;
}

/**
 * E-mail para alunos (TASK-025 e TASK-026). Sempre disparado à mão por um usuário: não há gatilho,
 * régua nem sequência — é o que separa o envio para uma seleção da "automação de e-mail em massa"
 * proibida pelo `CLAUDE.md` (decisão S9-1). O destinatário é sempre um aluno do escopo do ator.
 * O corpo não vai para a auditoria (só assunto e contagens).
 */
export function createEmailService({
  students,
  purchases,
  auditLogs,
  mailer,
}: Pick<Repositories, 'students' | 'purchases' | 'auditLogs' | 'mailer'>): EmailService {
  const scopeOf = (actor: PublicUser) =>
    hasPermission(actor.role, 'data:view-all') ? {} : { assignedTo: actor.id };

  /** `{{course}}` = curso da compra mais recente do aluno (vazio se não comprou nada). */
  async function varsFor(student: { id: string; name: string }) {
    const [latest] = await purchases.listByStudent(student.id);
    return { name: student.name, course: latest?.course.name ?? '' };
  }

  async function deliver(student: { id: string; name: string; email: string }, subject: string, body: string) {
    const vars = await varsFor(student);
    const text = renderTemplate(body, vars);

    return mailer.send({
      to: student.email,
      subject: renderTemplate(subject, vars),
      text,
      html: textToHtml(text),
    });
  }

  return {
    async sendToStudent({ studentId, subject, body }, actor) {
      const student = await students.findById(studentId, scopeOf(actor));
      if (!student) {
        throw HttpError.notFound('Aluno não encontrado');
      }

      let messageId: string;
      try {
        ({ messageId } = await deliver(student, subject, body));
      } catch (error) {
        // Falha do provedor não derruba a API com 500: vira 502 com mensagem clara.
        logger.warn({ err: error, studentId }, 'Falha ao enviar e-mail');
        throw new HttpError(502, 'EMAIL_SEND_FAILED', 'Não foi possível enviar o e-mail agora');
      }

      await auditLogs.record({
        action: AuditAction.EMAIL_SENT,
        actorId: actor.id,
        metadata: { studentIds: [student.id], subject, sent: 1, failed: 0 },
      });

      return { messageId, to: student.email };
    },

    async sendBulk({ studentIds, subject, body }, actor) {
      const results: BulkEmailResult[] = [];

      // Um por vez, na ordem: poucos alunos por envio (máx. 100) e sem fila — fila é v2.
      for (const studentId of studentIds) {
        const student = await students.findById(studentId, scopeOf(actor));
        if (!student) {
          results.push({ studentId, status: 'failed', error: 'Aluno não encontrado' });
          continue;
        }
        try {
          const { messageId } = await deliver(student, subject, body);
          results.push({ studentId, status: 'sent', messageId });
        } catch (error) {
          logger.warn({ err: error, studentId }, 'Falha ao enviar e-mail do lote');
          results.push({ studentId, status: 'failed', error: 'Falha no envio' });
        }
      }

      const sent = results.filter((result) => result.status === 'sent').length;
      const failed = results.length - sent;

      await auditLogs.record({
        action: AuditAction.EMAIL_SENT,
        actorId: actor.id,
        metadata: { studentIds, subject, sent, failed, bulk: true },
      });

      return { sent, failed, results };
    },
  };
}
