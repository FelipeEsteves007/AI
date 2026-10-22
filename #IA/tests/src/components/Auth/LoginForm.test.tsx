import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LoginForm } from '@/components/Auth/LoginForm';
import { ApiError } from '@/services/apiClient';
import type { AuthUser } from '@/types/auth';

const replace = jest.fn();
const login = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/login', replace: (...args: unknown[]) => replace(...args) }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ login }),
}));

const makeUser = (mustChangePassword: boolean): AuthUser => ({
  id: 'u1',
  name: 'Ana',
  email: 'ana@crm.com',
  role: 'admin',
  isActive: true,
  mustChangePassword,
  createdAt: '2026-09-01T00:00:00.000Z',
});

const fill = (label: RegExp, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

const submit = (): void => {
  fireEvent.click(screen.getByRole('button'));
};

beforeEach(() => {
  replace.mockClear();
  login.mockReset();
});

describe('LoginForm', () => {
  it('exige e-mail e senha antes de chamar a API', async () => {
    render(<LoginForm />);
    submit();

    expect(await screen.findByText(/informe o e-mail/i)).toBeInTheDocument();
    expect(screen.getByText(/informe a senha/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('valida o formato do e-mail', async () => {
    render(<LoginForm />);
    fill(/e-mail/i, 'ana');
    fill(/senha/i, 'segredo1');
    submit();

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('envia as credenciais e vai para a tela inicial', async () => {
    login.mockResolvedValue(makeUser(false));
    render(<LoginForm />);
    fill(/e-mail/i, 'ana@crm.com');
    fill(/senha/i, 'segredo1');
    submit();

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({ email: 'ana@crm.com', password: 'segredo1' }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('leva quem tem senha provisória para a troca de senha', async () => {
    login.mockResolvedValue(makeUser(true));
    render(<LoginForm />);
    fill(/e-mail/i, 'ana@crm.com');
    fill(/senha/i, 'provisoria');
    submit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/change-password'));
  });

  it('mostra "E-mail ou senha incorretos" sem dizer qual campo falhou', async () => {
    login.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas'));
    render(<LoginForm />);
    fill(/e-mail/i, 'ana@crm.com');
    fill(/senha/i, 'errada');
    submit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('E-mail ou senha incorretos');
    expect(replace).not.toHaveBeenCalled();
  });

  it('mostra aviso de bloqueio temporário quando a API responde LOGIN_BLOCKED', async () => {
    login.mockRejectedValue(new ApiError(429, 'LOGIN_BLOCKED', 'Bloqueado'));
    render(<LoginForm />);
    fill(/e-mail/i, 'ana@crm.com');
    fill(/senha/i, 'errada');
    submit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/muitas tentativas/i);
    expect(alert).not.toHaveTextContent('E-mail ou senha incorretos');
  });

  it('desabilita o botão enquanto envia, para não duplicar a requisição', async () => {
    let resolveLogin: (user: AuthUser) => void = () => undefined;
    login.mockImplementation(
      () =>
        new Promise<AuthUser>((resolve) => {
          resolveLogin = resolve;
        }),
    );
    render(<LoginForm />);
    fill(/e-mail/i, 'ana@crm.com');
    fill(/senha/i, 'segredo1');
    submit();

    const button = await screen.findByRole('button', { name: /entrando/i });
    expect(button).toBeDisabled();
    submit();
    expect(login).toHaveBeenCalledTimes(1);

    resolveLogin(makeUser(false));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });
});
