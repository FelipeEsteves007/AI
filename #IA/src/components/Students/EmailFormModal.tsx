import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { useDialogFocus } from '@/hooks/useDialogFocus';
import { isApiError } from '@/services/apiClient';
import type { SendEmailPayload } from '@/services/emailService';

export interface EmailFormModalProps {
  /** Texto do "Para": e-mail do aluno ou "N alunos selecionados". */
  recipients: string;
  onSubmit: (payload: SendEmailPayload) => Promise<void>;
  onClose: () => void;
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

/** Modal de envio de e-mail (TASK-027). Corpo em texto puro, com `{{name}}` e `{{course}}`. */
export function EmailFormModal({ recipients, onSubmit, onClose }: EmailFormModalProps): JSX.Element {
  const subjectRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>({ initialFocusRef: subjectRef, onEscape: onClose });

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSending) return;
    if (!subject.trim() || !body.trim()) {
      setError('Preencha o assunto e a mensagem.');
      return;
    }
    setError(null);
    setIsSending(true);
    try {
      await onSubmit({ subject: subject.trim(), body: body.trim() });
    } catch (caught) {
      setError(
        isApiError(caught) && caught.code === 'EMAIL_SEND_FAILED'
          ? 'O servidor de e-mail recusou o envio. Tente novamente em instantes.'
          : 'Não foi possível enviar agora. Tente novamente em instantes.',
      );
      setIsSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-form-title"
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="email-form-title" className="text-lg font-semibold text-gray-900">
          Enviar e-mail
        </h2>
        <p className="mt-1 text-sm text-gray-500">Para: {recipients}</p>

        <form noValidate onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="space-y-1">
            <label htmlFor="email-subject" className="block text-sm font-medium text-gray-700">
              Assunto
            </label>
            <input
              id="email-subject"
              ref={subjectRef}
              type="text"
              maxLength={200}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email-body" className="block text-sm font-medium text-gray-700">
              Mensagem
            </label>
            <textarea
              id="email-body"
              rows={8}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-gray-500">
              Use <code>{'{{name}}'}</code> para o nome do aluno e <code>{'{{course}}'}</code> para o
              curso mais recente.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
