import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { ROLE_LABELS, ROLE_OPTIONS } from '@/components/Users/roleLabels';
import { isApiError } from '@/services/apiClient';
import type { AuthUser, UserRole } from '@/types/auth';

/** Valores do formulário. Na edição o e-mail é só leitura, mas viaja junto para simplificar. */
export interface UserFormValues {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface UserFormModalProps {
  mode: 'create' | 'edit';
  /** Obrigatório no modo `edit`; ignorado no modo `create`. */
  user?: AuthUser | null;
  onSubmit: (values: UserFormValues) => Promise<void>;
  onClose: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const EMAIL_IN_USE_MESSAGE = 'Já existe um usuário com esse e-mail.';
const LAST_ADMIN_MESSAGE =
  'Este é o último admin ativo e não pode ser desativado nem rebaixado. Promova outro usuário a administrador antes de mudar este.';
const GENERIC_MESSAGE = 'Não foi possível salvar agora. Tente novamente em instantes.';
const VALIDATION_MESSAGE = 'Revise os dados informados: a API recusou o formulário.';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

interface FieldErrors {
  name?: string;
  email?: string;
}

function validate(mode: 'create' | 'edit', values: UserFormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.name.trim()) {
    errors.name = 'Informe o nome.';
  }

  if (mode === 'create') {
    if (!values.email.trim()) {
      errors.email = 'Informe o e-mail.';
    } else if (!EMAIL_PATTERN.test(values.email.trim())) {
      errors.email = 'E-mail inválido.';
    }
  }

  return errors;
}

/** Modal de criação e edição de usuário. Erros do backend viram mensagem no campo certo. */
export function UserFormModal({
  mode,
  user = null,
  onSubmit,
  onClose,
}: UserFormModalProps): JSX.Element {
  const isEdit = mode === 'edit';
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'vendedor');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const values: UserFormValues = { name: name.trim(), email: email.trim(), role, isActive };
    setFormError(null);
    const errors = validate(mode, values);
    setFieldErrors(errors);
    if (errors.name || errors.email) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      if (isApiError(error) && error.code === 'EMAIL_IN_USE') {
        setFieldErrors({ email: EMAIL_IN_USE_MESSAGE });
      } else if (isApiError(error) && error.code === 'LAST_ADMIN') {
        setFormError(LAST_ADMIN_MESSAGE);
      } else if (isApiError(error) && error.code === 'VALIDATION_ERROR') {
        setFormError(VALIDATION_MESSAGE);
      } else {
        setFormError(GENERIC_MESSAGE);
      }
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="user-form-title" className="text-xl font-semibold text-gray-900">
          {isEdit ? 'Editar usuário' : 'Novo usuário'}
        </h2>

        <form noValidate onSubmit={handleSubmit} className="mt-4 space-y-4">
          {formError ? (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {formError}
            </p>
          ) : null}

          <div className="space-y-1">
            <label htmlFor="user-name" className="block text-sm font-medium text-gray-700">
              Nome
            </label>
            <input
              id="user-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? 'user-name-error' : undefined}
              className={inputClass}
            />
            {fieldErrors.name ? (
              <p id="user-name-error" role="alert" className="text-xs text-red-600">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>

          {isEdit ? (
            // RN-01: o e-mail identifica o usuário e não muda depois de criado.
            <div className="space-y-1">
              <span className="block text-sm font-medium text-gray-700">E-mail</span>
              <p className="text-sm text-gray-500">{email}</p>
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="user-email" className="block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <input
                id="user-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? 'user-email-error' : undefined}
                className={inputClass}
              />
              {fieldErrors.email ? (
                <p id="user-email-error" role="alert" className="text-xs text-red-600">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="user-role" className="block text-sm font-medium text-gray-700">
              Papel
            </label>
            <select
              id="user-role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className={inputClass}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {ROLE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>

          {isEdit ? (
            <div className="flex items-center gap-2">
              <input
                id="user-active"
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              <label htmlFor="user-active" className="text-sm text-gray-700">
                Usuário ativo
              </label>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
