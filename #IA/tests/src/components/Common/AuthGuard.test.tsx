import { render, screen, waitFor } from '@testing-library/react';

import { AuthGuard } from '@/components/Common/AuthGuard';
import type { AuthContextValue } from '@/context/AuthContext';
import type { AuthStatus, AuthUser } from '@/types/auth';

const replace = jest.fn();
let pathname = '/';

jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname,
    replace: (...args: unknown[]) => replace(...args),
  }),
}));

const authValue: { current: Partial<AuthContextValue> } = { current: {} };

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => authValue.current,
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

function setup(options: { status: AuthStatus; user?: AuthUser | null; path?: string }): void {
  pathname = options.path ?? '/';
  authValue.current = { status: options.status, user: options.user ?? null };
  render(
    <AuthGuard>
      <p>conteúdo protegido</p>
    </AuthGuard>,
  );
}

beforeEach(() => {
  replace.mockClear();
});

describe('AuthGuard', () => {
  it('não mostra a página enquanto a sessão está carregando', () => {
    setup({ status: 'loading' });

    expect(screen.queryByText('conteúdo protegido')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/carregando/i);
    expect(replace).not.toHaveBeenCalled();
  });

  it('manda para /login quando não está autenticado', async () => {
    setup({ status: 'unauthenticated' });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('conteúdo protegido')).not.toBeInTheDocument();
  });

  it('manda para /change-password quando a senha é provisória', async () => {
    setup({ status: 'authenticated', user: makeUser(true), path: '/students' });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/change-password'));
    expect(screen.queryByText('conteúdo protegido')).not.toBeInTheDocument();
  });

  it('renderiza a página quando está autenticado e sem pendência', () => {
    setup({ status: 'authenticated', user: makeUser(false) });

    expect(screen.getByText('conteúdo protegido')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renderiza /login sem redirecionar, evitando laço', () => {
    setup({ status: 'unauthenticated', path: '/login' });

    expect(screen.getByText('conteúdo protegido')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('não redireciona a própria /change-password quando a senha é provisória', () => {
    setup({ status: 'authenticated', user: makeUser(true), path: '/change-password' });

    expect(screen.getByText('conteúdo protegido')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('manda /change-password para /login quando não há sessão', async () => {
    setup({ status: 'unauthenticated', path: '/change-password' });

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('não mostra carregando na rota pública durante o loading', () => {
    setup({ status: 'loading', path: '/login' });

    expect(screen.getByText('conteúdo protegido')).toBeInTheDocument();
  });
});
