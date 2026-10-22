import { ApiError, apiClient } from '@/services/apiClient';

export interface SendEmailPayload {
  subject: string;
  /** Texto puro; aceita `{{name}}` e `{{course}}`. */
  body: string;
}

export interface SendBulkEmailResponse {
  sent: number;
  failed: number;
  results: { studentId: string; status: 'sent' | 'failed'; messageId?: string; error?: string }[];
}

function requireBody<T>(body: T | null, path: string): T {
  if (body === null || body === undefined) {
    throw new ApiError(0, 'EMPTY_RESPONSE', `Resposta vazia em ${path}`);
  }
  return body;
}

/** `POST /api/email/send` — 502 `EMAIL_SEND_FAILED` se o provedor recusar. */
export async function sendEmail(
  studentId: string,
  payload: SendEmailPayload,
): Promise<{ messageId: string; to: string }> {
  const path = '/api/email/send';
  return requireBody(
    await apiClient<{ messageId: string; to: string }>(path, {
      method: 'POST',
      body: { studentId, ...payload },
    }),
    path,
  );
}

/** `POST /api/email/send-bulk` — envio manual para uma seleção (máx. 100). */
export async function sendBulkEmail(
  studentIds: string[],
  payload: SendEmailPayload,
): Promise<SendBulkEmailResponse> {
  const path = '/api/email/send-bulk';
  return requireBody(
    await apiClient<SendBulkEmailResponse>(path, { method: 'POST', body: { studentIds, ...payload } }),
    path,
  );
}
