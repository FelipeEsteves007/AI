import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ChangePasswordForm } from '@/components/Auth/ChangePasswordForm';
import { ApiError } from '@/services/apiClient';

const replace = jest.fn();
const changePassword = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/change-password',
    replace: (...args: unknown[]) => replace(...args),
  }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ changePassword }),
}));

const fill = (label: RegExp, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

const submit = (): void => {
  fireEvent.click(screen.getByRole('button'));
};

const fillAll = (current: string, next: string, confirmation: string): void => {
  fill(/senha atual/i, current);
  fill(/^nova senha$/i, next);
  fill(/confirmar nova senha/i, confirmation);
};

beforeEach(() => {
  replace.mockClear();
  changePassword.mockReset();
});

describe('ChangePasswordForm', () => {
  it('exige os três campos', async () => {
    render(<ChangePasswordForm />);
    submit();

    expect(await screen.findByText(/informe a senha atual/i)).toBeInTheDocument();
    expect(screen.getByText(/informe a nova senha/i)).toBeInTheDocument();
    expect(screen.getByText(/confirme a nova senha/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('exige no mínimo 6 caracteres na nova senha', async () => {
    render(<ChangePasswordForm />);
    fillAll('antiga1', '12345', '12345');
    submit();

    expect(await screen.findByText(/pelo menos 6 caracteres/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('exige que a confirmação bata com a nova senha', async () => {
    render(<ChangePasswordForm />);
    fillAll('antiga1', 'novasenha', 'novasenhaX');
    submit();

    expect(await screen.findByText(/confirmação não confere/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('exige que a nova senha seja diferente da atual', async () => {
    render(<ChangePasswordForm />);
    fillAll('mesmasenha', 'mesmasenha', 'mesmasenha');
    submit();

    expect(await screen.findByText(/diferente da senha atual/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('troca a senha e volta para a tela inicial', async () => {
    changePassword.mockResolvedValue(undefined);
    render(<ChangePasswordForm />);
    fillAll('antiga1', 'novasenha', 'novasenha');
    submit();

    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: 'antiga1',
        newPassword: 'novasenha',
      }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('mostra mensagem clara quando a senha atual está errada', async () => {
    changePassword.mockRejectedValue(
      new ApiError(400, 'WRONG_CURRENT_PASSWORD', 'Senha atual incorreta'),
    );
    render(<ChangePasswordForm />);
    fillAll('errada', 'novasenha', 'novasenha');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/senha atual está incorreta/i);
    expect(replace).not.toHaveBeenCalled();
  });

  it('mostra mensagem quando a API recusa senha igual à atual', async () => {
    changePassword.mockRejectedValue(new ApiError(400, 'SAME_PASSWORD', 'Senha igual'));
    render(<ChangePasswordForm />);
    fillAll('antiga1', 'novasenha', 'novasenha');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/diferente da senha atual/i);
  });

  it('mostra mensagem quando a API recusa a validação', async () => {
    changePassword.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'inválido'));
    render(<ChangePasswordForm />);
    fillAll('antiga1', 'novasenha', 'novasenha');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/pelo menos 6 caracteres/i);
  });

  it('desabilita o botão enquanto envia', async () => {
    let resolveChange: () => void = () => undefined;
    changePassword.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveChange = resolve;
        }),
    );
    render(<ChangePasswordForm />);
    fillAll('antiga1', 'novasenha', 'novasenha');
    submit();

    const button = await screen.findByRole('button', { name: /salvando/i });
    expect(button).toBeDisabled();
    submit();
    expect(changePassword).toHaveBeenCalledTimes(1);

    resolveChange();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });
});
