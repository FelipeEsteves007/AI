import nodemailer from 'nodemailer';

import type { Mailer } from '@server/types/email';
import { logger } from '@server/utils/logger';

/**
 * Mailer a partir do ambiente (`SMTP_*`). Sem `SMTP_HOST`, usa o `jsonTransport` do nodemailer:
 * monta a mensagem e devolve um id, sem enviar nada — o "simulado em dev" da TASK-025.
 */
export function createMailerFromEnv(env: NodeJS.ProcessEnv = process.env): Mailer {
  const simulated = !env.SMTP_HOST;
  const transport = simulated
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT ?? 587),
        secure: Number(env.SMTP_PORT) === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      });
  const from = env.SMTP_FROM || 'CRM de Alunos <nao-responda@crm.local>';

  return {
    async send(message) {
      const info = await transport.sendMail({ from, ...message });
      if (simulated) {
        logger.info({ to: message.to, subject: message.subject }, 'E-mail simulado (sem SMTP_HOST)');
      }
      return { messageId: String(info.messageId) };
    },
  };
}

/** Escapa HTML e troca quebras de linha por `<br>`: o corpo digitado é texto puro. */
export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<div style="font-family: sans-serif; line-height: 1.5">${escaped.replace(/\r?\n/g, '<br>')}</div>`;
}

/** Substitui `{{name}}` e `{{course}}` (com ou sem espaços dentro das chaves). */
export function renderTemplate(text: string, vars: { name: string; course: string }): string {
  return text.replace(/\{\{\s*(name|course)\s*\}\}/g, (_, key: 'name' | 'course') => vars[key]);
}
