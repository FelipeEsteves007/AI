/* Tipos de e-mail (TASK-025 e TASK-026) — Sprint 9. */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Envio de e-mail. Em produção, SMTP via nodemailer; sem `SMTP_HOST` (dev/test), um transporte
 * simulado que não sai da máquina. Nos testes de rota entra um fake.
 */
export interface Mailer {
  send(message: MailMessage): Promise<{ messageId: string }>;
}

/** Corpo de `POST /api/email/send`. O destinatário é o aluno, nunca um e-mail livre. */
export interface SendEmailRequest {
  studentId: string;
  subject: string;
  /** Texto puro; aceita `{{name}}` e `{{course}}`. */
  body: string;
}

export interface SendEmailResponse {
  messageId: string;
  to: string;
}

/** Corpo de `POST /api/email/send-bulk`: envio manual para uma seleção (sem automação). */
export interface SendBulkEmailRequest {
  studentIds: string[];
  subject: string;
  body: string;
}

export interface BulkEmailResult {
  studentId: string;
  status: 'sent' | 'failed';
  messageId?: string;
  error?: string;
}

export interface SendBulkEmailResponse {
  sent: number;
  failed: number;
  results: BulkEmailResult[];
}
