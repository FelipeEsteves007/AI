import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import UsersPage from '@/pages/settings/users';
import { ApiError } from '@/services/apiClient';
import type { AuthUser } from '@/types/auth';

const can = jest.fn();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ can, user: { id: 'u-1' } }),
}));

const listUsers = jest.fn();
const createUser = jest.fn();
const updateUser = jest.fn();
const resetPassword = jest.fn();

jest.mock('@/services/usersService', () => ({
  listUsers: (...args: unknown[]) => listUsers(...args),
  createUser: (...args: unknown[]) => createUser(...args),
  updateUser: (...args: unknown[]) => updateUser(...args),
  resetPassword: (...args: unknown[]) => resetPassword(...args),
}));

const ada: AuthUser = {
  id: 'u-1',
  name: 'Ada Lovelace',
  email: 'ada@crm.dev',
  role: 'admin',
  isActive: true,
  mustChangePassword: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const bob: AuthUser = {
  id: 'u-2',
  name: 'Bob Vendedor',
  email: 'bob@crm.dev',
  role: 'vendedor',
  isActive: false,
  mustChangePassword: true,
  createdAt: '2026-02-01T00:00:00.000Z',
};

beforeEach(() => {
  can.mockReset().mockReturnValue(true);
  listUsers.mockReset().mockResolvedValue([ada, bob]);
  createUser.mockReset();
  updateUser.mockReset();
  resetPassword.mockReset();
});

const rowOf = (name: RegExp): HTMLElement => screen.getByRole('row', { name });

describe('página de usuários', () => {
  it('nega o acesso a quem não tem users:manage', async () => {
    can.mockReturnValue(false);

    render(<UsersPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/acesso negado/i);
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('lista os usuários vindos do serviço', async () => {
    render(<UsersPage />);

    expect(await screen.findByRole('row', { name: /ada lovelace/i })).toBeInTheDocument();
    expect(rowOf(/bob vendedor/i)).toBeInTheDocument();
    expect(listUsers).toHaveBeenCalledTimes(1);
  });

  it('cria um usuário e mostra a senha provisória uma única vez', async () => {
    const novo: AuthUser = { ...bob, id: 'u-3', name: 'Carol', email: 'carol@crm.dev' };
    createUser.mockResolvedValue({ user: novo, temporaryPassword: 'Prov1234' });
    listUsers.mockResolvedValueOnce([ada, bob]).mockResolvedValueOnce([ada, bob, novo]);

    render(<UsersPage />);
    fireEvent.click(await screen.findByRole('button', { name: /novo usuário/i }));

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Carol' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'carol@crm.dev' } });
    fireEvent.change(screen.getByLabelText(/papel/i), { target: { value: 'vendedor' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith({
        name: 'Carol',
        email: 'carol@crm.dev',
        role: 'vendedor',
      }),
    );

    // RN-04: a senha aparece uma vez, no diálogo…
    expect(await screen.findByText('Prov1234')).toBeInTheDocument();

    // …e some de vez quando o diálogo é fechado.
    fireEvent.click(screen.getByRole('button', { name: /entendi/i }));

    await waitFor(() => expect(screen.queryByText('Prov1234')).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Prov1234');
  });

  it('mostra EMAIL_IN_USE no formulário de criação', async () => {
    createUser.mockRejectedValue(new ApiError(409, 'EMAIL_IN_USE', 'E-mail já usado'));

    render(<UsersPage />);
    fireEvent.click(await screen.findByRole('button', { name: /novo usuário/i }));
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Carol' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ada@crm.dev' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText(/já existe um usuário com esse e-mail/i)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('desativa um usuário ativo', async () => {
    updateUser.mockResolvedValue({ ...ada, isActive: false });

    render(<UsersPage />);
    const row = await screen.findByRole('row', { name: /ada lovelace/i });
    fireEvent.click(within(row).getByRole('button', { name: /desativar/i }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith('u-1', { isActive: false }));
    await waitFor(() => expect(listUsers).toHaveBeenCalledTimes(2));
  });

  it('reativa um usuário inativo', async () => {
    updateUser.mockResolvedValue({ ...bob, isActive: true });

    render(<UsersPage />);
    const row = await screen.findByRole('row', { name: /bob vendedor/i });
    fireEvent.click(within(row).getByRole('button', { name: /reativar/i }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith('u-2', { isActive: true }));
  });

  it('explica o LAST_ADMIN ao tentar desativar o último admin', async () => {
    updateUser.mockRejectedValue(new ApiError(409, 'LAST_ADMIN', 'Último admin'));

    render(<UsersPage />);
    const row = await screen.findByRole('row', { name: /ada lovelace/i });
    fireEvent.click(within(row).getByRole('button', { name: /desativar/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/último admin ativo/i);
  });

  it('redefine a senha e mostra a nova senha provisória uma vez', async () => {
    resetPassword.mockResolvedValue({ user: bob, temporaryPassword: 'Nova4567' });

    render(<UsersPage />);
    const row = await screen.findByRole('row', { name: /bob vendedor/i });
    fireEvent.click(within(row).getByRole('button', { name: /redefinir senha/i }));

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('u-2'));
    expect(await screen.findByText('Nova4567')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /entendi/i }));
    await waitFor(() => expect(screen.queryByText('Nova4567')).not.toBeInTheDocument());
  });

  it('edita nome e papel de um usuário', async () => {
    updateUser.mockResolvedValue({ ...bob, name: 'Bob B.', role: 'ceo' });

    render(<UsersPage />);
    const row = await screen.findByRole('row', { name: /bob vendedor/i });
    fireEvent.click(within(row).getByRole('button', { name: /editar/i }));

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Bob B.' } });
    fireEvent.change(screen.getByLabelText(/papel/i), { target: { value: 'ceo' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith('u-2', {
        name: 'Bob B.',
        role: 'ceo',
        isActive: false,
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('avisa quando a listagem falha', async () => {
    listUsers.mockRejectedValue(new ApiError(500, 'UNKNOWN_ERROR', 'boom'));

    render(<UsersPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar/i);
  });
});
