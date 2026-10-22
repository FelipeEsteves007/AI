import { ROLE_LABELS } from '@/components/Users/roleLabels';
import type { AuthUser } from '@/types/auth';

export interface UserTableProps {
  users: AuthUser[];
  onEdit: (user: AuthUser) => void;
  /** Desativa o ativo, reativa o inativo (RN-11: usuário nunca é excluído). */
  onToggleActive: (user: AuthUser) => void;
  onResetPassword: (user: AuthUser) => void;
  /** Id da linha com operação em andamento — só desabilita os botões dela. */
  busyUserId?: string | null;
}

const headerClass =
  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500';
const cellClass = 'px-4 py-3 text-sm text-gray-700';
const actionClass =
  'rounded-md border border-gray-300 bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50';

function StatusBadge({ isActive }: { isActive: boolean }): JSX.Element {
  const style = isActive
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : 'bg-gray-100 text-gray-600 ring-gray-300';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${style}`}
    >
      {isActive ? 'Ativo' : 'Inativo'}
    </span>
  );
}

/** Tabela de usuários com as ações por linha. Todo o estado fica na página. */
export function UserTable({
  users,
  onEdit,
  onToggleActive,
  onResetPassword,
  busyUserId = null,
}: UserTableProps): JSX.Element {
  if (users.length === 0) {
    return (
      <p className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
        Nenhum usuário cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <caption className="sr-only">Usuários do CRM</caption>
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className={headerClass}>
              Nome
            </th>
            <th scope="col" className={headerClass}>
              E-mail
            </th>
            <th scope="col" className={headerClass}>
              Papel
            </th>
            <th scope="col" className={headerClass}>
              Situação
            </th>
            <th scope="col" className={`${headerClass} text-right`}>
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => {
            const isBusy = busyUserId === user.id;
            // Linha de desativado fica cinza e esmaecida, para se distinguir à primeira vista.
            const rowClass = user.isActive ? 'bg-white' : 'bg-gray-50 text-gray-400 opacity-75';

            return (
              <tr key={user.id} data-inactive={String(!user.isActive)} className={rowClass}>
                <th scope="row" className={`${cellClass} font-medium text-gray-900`}>
                  {user.name}
                </th>
                <td className={cellClass}>{user.email}</td>
                <td className={cellClass}>{ROLE_LABELS[user.role]}</td>
                <td className={cellClass}>
                  <StatusBadge isActive={user.isActive} />
                </td>
                <td className={`${cellClass} text-right`}>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className={actionClass}
                      disabled={isBusy}
                      onClick={() => onEdit(user)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className={actionClass}
                      disabled={isBusy}
                      onClick={() => onToggleActive(user)}
                    >
                      {user.isActive ? 'Desativar' : 'Reativar'}
                    </button>
                    <button
                      type="button"
                      className={actionClass}
                      disabled={isBusy}
                      onClick={() => onResetPassword(user)}
                    >
                      Redefinir senha
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
