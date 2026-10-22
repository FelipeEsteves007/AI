import { useCallback, useEffect, useState } from 'react';

import { TemporaryPasswordDialog } from '@/components/Users/TemporaryPasswordDialog';
import { UserFormModal } from '@/components/Users/UserFormModal';
import type { UserFormValues } from '@/components/Users/UserFormModal';
import { UserTable } from '@/components/Users/UserTable';
import { useAuth } from '@/context/AuthContext';
import { isApiError } from '@/services/apiClient';
import { createUser, listUsers, resetPassword, updateUser } from '@/services/usersService';
import type { AuthUser } from '@/types/auth';

const LOAD_ERROR = 'Não foi possível carregar os usuários agora. Tente novamente em instantes.';
const GENERIC_ERROR = 'Não foi possível concluir a operação. Tente novamente em instantes.';
const LAST_ADMIN_ERROR =
  'Este é o último admin ativo e não pode ser desativado nem rebaixado. Promova outro usuário a administrador antes de mudar este.';
const NOT_FOUND_ERROR = 'Usuário não encontrado. Atualize a lista e tente de novo.';

/** Senha provisória à espera de ser mostrada uma única vez (RN-04). */
interface TemporaryPassword {
  userName: string;
  password: string;
}

type FormState = { mode: 'create' } | { mode: 'edit'; user: AuthUser } | null;

function messageFor(error: unknown): string {
  if (!isApiError(error)) {
    return GENERIC_ERROR;
  }
  switch (error.code) {
    case 'LAST_ADMIN':
      return LAST_ADMIN_ERROR;
    case 'NOT_FOUND':
      return NOT_FOUND_ERROR;
    default:
      return error.status === 404 ? NOT_FOUND_ERROR : GENERIC_ERROR;
  }
}

export default function UsersPage(): JSX.Element {
  const { can } = useAuth();
  // Cosmético: esconder a tela é conveniência de interface. Quem chamar /api/users sem
  // `users:manage` leva 403 do backend de qualquer jeito (RBAC real fica lá, CU-13).
  const allowed = can('users:manage');

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<TemporaryPassword | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      setUsers(await listUsers());
      setPageError(null);
    } catch {
      setPageError(LOAD_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) {
      setIsLoading(false);
      return;
    }
    void reload();
  }, [allowed, reload]);

  if (!allowed) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Acesso negado: só administradores podem gerenciar usuários.
        </p>
      </section>
    );
  }

  /** Criação e edição vindas do modal. O erro sobe para o modal exibir no campo certo. */
  async function handleFormSubmit(values: UserFormValues): Promise<void> {
    if (form?.mode === 'create') {
      const created = await createUser({
        name: values.name,
        email: values.email,
        role: values.role,
      });
      setForm(null);
      setTemporaryPassword({
        userName: created.user.name,
        password: created.temporaryPassword,
      });
      await reload();
      return;
    }

    if (form?.mode === 'edit') {
      await updateUser(form.user.id, {
        name: values.name,
        role: values.role,
        isActive: values.isActive,
      });
      setForm(null);
      await reload();
    }
  }

  async function handleToggleActive(user: AuthUser): Promise<void> {
    setPageError(null);
    setBusyUserId(user.id);
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      await reload();
    } catch (error) {
      setPageError(messageFor(error));
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleResetPassword(user: AuthUser): Promise<void> {
    setPageError(null);
    setBusyUserId(user.id);
    try {
      const result = await resetPassword(user.id);
      setTemporaryPassword({
        userName: result.user.name,
        password: result.temporaryPassword,
      });
      await reload();
    } catch (error) {
      setPageError(messageFor(error));
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="mt-1 text-sm text-gray-500">
            Cadastre, edite, desative e redefina a senha da equipe.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ mode: 'create' })}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          Novo usuário
        </button>
      </div>

      {pageError ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {pageError}
        </p>
      ) : null}

      <div className="mt-6">
        {isLoading && users.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            Carregando usuários…
          </p>
        ) : (
          <UserTable
            users={users}
            busyUserId={busyUserId}
            onEdit={(user) => setForm({ mode: 'edit', user })}
            onToggleActive={(user) => {
              void handleToggleActive(user);
            }}
            onResetPassword={(user) => {
              void handleResetPassword(user);
            }}
          />
        )}
      </div>

      {form ? (
        <UserFormModal
          mode={form.mode}
          user={form.mode === 'edit' ? form.user : null}
          onSubmit={handleFormSubmit}
          onClose={() => setForm(null)}
        />
      ) : null}

      {temporaryPassword ? (
        <TemporaryPasswordDialog
          userName={temporaryPassword.userName}
          password={temporaryPassword.password}
          // Fechar apaga a senha do estado: ela não volta a ser exibida (RN-04).
          onClose={() => setTemporaryPassword(null)}
        />
      ) : null}
    </section>
  );
}
