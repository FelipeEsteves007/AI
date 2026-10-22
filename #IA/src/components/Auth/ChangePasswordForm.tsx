import { useRouter } from 'next/router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { useAuth } from '@/context/AuthContext';
import { isApiError } from '@/services/apiClient';

/** RN-03: mínimo de 6 caracteres e nova senha diferente da atual. */
const MIN_PASSWORD_LENGTH = 6;
const TOO_SHORT_MESSAGE = `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
const SAME_PASSWORD_MESSAGE = 'A nova senha precisa ser diferente da senha atual.';
const WRONG_CURRENT_MESSAGE = 'A senha atual está incorreta.';
const GENERIC_MESSAGE = 'Não foi possível trocar a senha agora. Tente novamente em instantes.';

const HOME_ROUTE = '/';

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmation?: string;
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

function validate(current: string, next: string, confirmation: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!current) {
    errors.currentPassword = 'Informe a senha atual.';
  }

  if (!next) {
    errors.newPassword = 'Informe a nova senha.';
  } else if (next.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = TOO_SHORT_MESSAGE;
  } else if (next === current) {
    errors.newPassword = SAME_PASSWORD_MESSAGE;
  }

  if (!confirmation) {
    errors.confirmation = 'Confirme a nova senha.';
  } else if (next && confirmation !== next) {
    errors.confirmation = 'A confirmação não confere com a nova senha.';
  }

  return errors;
}

function messageFor(error: unknown): string {
  if (!isApiError(error)) {
    return GENERIC_MESSAGE;
  }
  switch (error.code) {
    case 'WRONG_CURRENT_PASSWORD':
      return WRONG_CURRENT_MESSAGE;
    case 'SAME_PASSWORD':
      return SAME_PASSWORD_MESSAGE;
    case 'VALIDATION_ERROR':
      return TOO_SHORT_MESSAGE;
    default:
      return GENERIC_MESSAGE;
  }
}

export function ChangePasswordForm(): JSX.Element {
  const router = useRouter();
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setFormError(null);
    const errors = validate(currentPassword, newPassword, confirmation);
    setFieldErrors(errors);
    if (errors.currentPassword || errors.newPassword || errors.confirmation) {
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      await router.replace(HOME_ROUTE);
    } catch (error) {
      setFormError(messageFor(error));
      setIsSubmitting(false);
    }
  }

  const fields = [
    {
      id: 'current-password',
      label: 'Senha atual',
      value: currentPassword,
      onChange: setCurrentPassword,
      autoComplete: 'current-password',
      error: fieldErrors.currentPassword,
    },
    {
      id: 'new-password',
      label: 'Nova senha',
      value: newPassword,
      onChange: setNewPassword,
      autoComplete: 'new-password',
      error: fieldErrors.newPassword,
    },
    {
      id: 'confirm-password',
      label: 'Confirmar nova senha',
      value: confirmation,
      onChange: setConfirmation,
      autoComplete: 'new-password',
      error: fieldErrors.confirmation,
    },
  ];

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      {formError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {formError}
        </p>
      ) : null}

      {fields.map((field) => (
        <div key={field.id} className="space-y-1">
          <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
            {field.label}
          </label>
          <input
            id={field.id}
            name={field.id}
            type="password"
            autoComplete={field.autoComplete}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
            aria-invalid={field.error ? true : undefined}
            aria-describedby={field.error ? `${field.id}-error` : undefined}
            className={inputClass}
          />
          {field.error ? (
            <p id={`${field.id}-error`} role="alert" className="text-xs text-red-600">
              {field.error}
            </p>
          ) : null}
        </div>
      ))}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
      </button>
    </form>
  );
}
