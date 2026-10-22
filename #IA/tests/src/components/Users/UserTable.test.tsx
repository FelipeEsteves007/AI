import { fireEvent, render, screen, within } from '@testing-library/react';

import { UserTable } from '@/components/Users/UserTable';
import type { AuthUser } from '@/types/auth';

const users: AuthUser[] = [
  {
    id: 'u-1',
    name: 'Ada Lovelace',
    email: 'ada@crm.dev',
    role: 'admin',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'u-2',
    name: 'Bob Vendedor',
    email: 'bob@crm.dev',
    role: 'vendedor',
    isActive: false,
    mustChangePassword: true,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

const handlers = {
  onEdit: jest.fn(),
  onToggleActive: jest.fn(),
  onResetPassword: jest.fn(),
};

beforeEach(() => {
  handlers.onEdit.mockReset();
  handlers.onToggleActive.mockReset();
  handlers.onResetPassword.mockReset();
});

const renderTable = (list: AuthUser[] = users): void => {
  render(<UserTable users={list} {...handlers} />);
};

describe('UserTable', () => {
  it('mostra nome, e-mail, papel e situação de cada usuário', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: /nome/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /e-mail/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /papel/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /situação/i })).toBeInTheDocument();

    const adaRow = screen.getByRole('row', { name: /ada lovelace/i });
    expect(within(adaRow).getByText('ada@crm.dev')).toBeInTheDocument();
    expect(within(adaRow).getByText(/administrador/i)).toBeInTheDocument();
    expect(within(adaRow).getByText(/^ativo$/i)).toBeInTheDocument();

    const bobRow = screen.getByRole('row', { name: /bob vendedor/i });
    expect(within(bobRow).getByText(/^inativo$/i)).toBeInTheDocument();
  });

  it('destaca visualmente a linha do usuário desativado', () => {
    renderTable();

    const bobRow = screen.getByRole('row', { name: /bob vendedor/i });
    expect(bobRow).toHaveAttribute('data-inactive', 'true');
    expect(bobRow.className).toMatch(/bg-gray-50/);

    const adaRow = screen.getByRole('row', { name: /ada lovelace/i });
    expect(adaRow).toHaveAttribute('data-inactive', 'false');
  });

  it('chama onEdit com o usuário da linha', () => {
    renderTable();

    const adaRow = screen.getByRole('row', { name: /ada lovelace/i });
    fireEvent.click(within(adaRow).getByRole('button', { name: /editar/i }));

    expect(handlers.onEdit).toHaveBeenCalledWith(users[0]);
  });

  it('oferece desativar para o ativo e reativar para o inativo', () => {
    renderTable();

    const adaRow = screen.getByRole('row', { name: /ada lovelace/i });
    fireEvent.click(within(adaRow).getByRole('button', { name: /desativar/i }));
    expect(handlers.onToggleActive).toHaveBeenCalledWith(users[0]);

    const bobRow = screen.getByRole('row', { name: /bob vendedor/i });
    fireEvent.click(within(bobRow).getByRole('button', { name: /reativar/i }));
    expect(handlers.onToggleActive).toHaveBeenCalledWith(users[1]);
  });

  it('chama onResetPassword ao redefinir a senha', () => {
    renderTable();

    const adaRow = screen.getByRole('row', { name: /ada lovelace/i });
    fireEvent.click(within(adaRow).getByRole('button', { name: /redefinir senha/i }));

    expect(handlers.onResetPassword).toHaveBeenCalledWith(users[0]);
  });

  it('mostra um aviso quando não há usuários', () => {
    renderTable([]);

    expect(screen.getByText(/nenhum usuário/i)).toBeInTheDocument();
  });
});
