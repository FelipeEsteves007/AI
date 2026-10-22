import { useRouter } from 'next/router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { CHANGE_PASSWORD_ROUTE } from '@/components/Common/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { isApiError } from '@/services/apiClient';

/** RN-06: a mensagem é sempre a mesma, sem revelar qual dos dois campos falhou. */
const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha incorretos';
const BLOCKED_MESSAGE =
  'Muitas tentativas de login. Aguarde alguns minutos antes de tentar de novo.';
const GENERIC_MESSAGE = 'Não foi possível entrar agora. Tente novamente em instantes.';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HOME_ROUTE = '/';

interface FieldErrors {
  email?: string;
  password?: string;
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) {
    errors.email = 'Informe o e-mail.';
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'E-mail inválido.';
  }
  if (!password) {
    errors.password = 'Informe a senha.';
  }
  return errors;
}

function messageFor(error: unknown): string {
  if (!isApiError(error)) {
    return GENERIC_MESSAGE;
  }
  if (error.code === 'LOGIN_BLOCKED' || error.status === 429) {
    return BLOCKED_MESSAGE;
  }
  if (error.status === 401 || error.status === 400) {
    return INVALID_CREDENTIALS_MESSAGE;
  }
  return GENERIC_MESSAGE;
}

export function LoginForm(): JSX.Element {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setFormError(null);
    const errors = validate(email, password);
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password });
      // RN-05: senha provisória vai direto para a troca; o resto entra na tela inicial.
      await router.replace(user.mustChangePassword ? CHANGE_PASSWORD_ROUTE : HOME_ROUTE);
    } catch (error) {
      setFormError(messageFor(error));
      setIsSubmitting(false);
    }
  }

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

      <div className="space-y-1">
        <label htmlFor="login-email" className="block text-sm font-medium text-gray-700">
          E-mail
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
          className={inputClass}
        />
        {fieldErrors.email ? (
          <p id="login-email-error" role="alert" className="text-xs text-red-600">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
          Senha
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
          className={inputClass}
        />
        {fieldErrors.password ? (
          <p id="login-password-error" role="alert" className="text-xs text-red-600">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
