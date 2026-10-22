import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UserFormModal } from '@/components/Users/UserFormModal';
import { ApiError } from '@/services/apiClient';
import type { AuthUser } from '@/types/auth';

const existing: AuthUser = {
  id: 'u-1',
  name: 'Ada Lovelace',
  email: 'ada@crm.dev',
  role: 'admin',
  isActive: true,
  mustChangePassword: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const onSubmit = jest.fn();
const onClose = jest.fn();

beforeEach(() => {
  onSubmit.mockReset();
  onSubmit.mockResolvedValue(undefined);
  onClose.mockReset();
});

const save = (): void => {
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
};

describe('UserFormModal — criação', () => {
  it('é um diálogo acessível e foca o primeiro campo', () => {
    render(<UserFormModal mode="create" onSubmit={onSubmit} onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: /novo usuário/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nome/i)).toHaveFocus();
  });

  it('valida nome e e-mail no cliente antes de chamar o serviço', async () => {
    render(<UserFormModal mode="create" onSubmit={onSubmit} onClose={onClose} />);

    save();
    expect(await screen.findByText(/informe o nome/i)).toBeInTheDocument();
    expect(screen.getByText(/informe o e-mail/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'nao-e-email' } });
    save();

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envia nome, e-mail e papel', async () => {
    render(<UserFormModal mode="create" onSubmit={onSubmit} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ada@crm.dev' } });
    fireEvent.change(screen.getByLabelText(/papel/i), { target: { value: 'vendedor' } });
    save();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Ada',
        email: 'ada@crm.dev',
        role: 'vendedor',
        isActive: true,
      }),
    );
  });

  it('mostra EMAIL_IN_USE no campo de e-mail', async () => {
    onSubmit.mockRejectedValue(new ApiError(409, 'EMAIL_IN_USE', 'E-mail já usado'));
    render(<UserFormModal mode="create" onSubmit={onSubmit} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ada@crm.dev' } });
    save();

    const message = await screen.findByText(/já existe um usuário com esse e-mail/i);
    expect(message).toBeInTheDocument();
    const email = screen.getByLabelText(/e-mail/i);
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-describedby', message.id);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('UserFormModal — edição', () => {
  it('abre com os dados do usuário e sem permitir trocar o e-mail', () => {
    render(<UserFormModal mode="edit" user={existing} onSubmit={onSubmit} onClose={onClose} />);

    expect(screen.getByRole('heading', { name: /editar usuário/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nome/i)).toHaveValue('Ada Lovelace');
    expect(screen.getByLabelText(/papel/i)).toHaveValue('admin');
    expect(screen.getByLabelText(/usuário ativo/i)).toBeChecked();
    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
    expect(screen.getByText('ada@crm.dev')).toBeInTheDocument();
  });

  it('envia nome, papel e situação', async () => {
    render(<UserFormModal mode="edit" user={existing} onSubmit={onSubmit} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/papel/i), { target: { value: 'ceo' } });
    fireEvent.click(screen.getByLabelText(/usuário ativo/i));
    save();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Ada Lovelace',
        email: 'ada@crm.dev',
        role: 'ceo',
        isActive: false,
      }),
    );
  });

  it('explica o erro LAST_ADMIN em um alerta', async () => {
    onSubmit.mockRejectedValue(new ApiError(409, 'LAST_ADMIN', 'Último admin'));
    render(<UserFormModal mode="edit" user={existing} onSubmit={onSubmit} onClose={onClose} />);

    save();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/último admin ativo/i);
    expect(alert).toHaveTextContent(/não pode ser desativado nem rebaixado/i);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('fecha no botão cancelar', () => {
    render(<UserFormModal mode="edit" user={existing} onSubmit={onSubmit} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
