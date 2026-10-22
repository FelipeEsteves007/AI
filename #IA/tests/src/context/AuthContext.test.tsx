import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AuthProvider, useAuth } from '@/context/AuthContext';

type FetchMock = jest.SpyInstance<Promise<Response>, Parameters<typeof fetch>>;

const user = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@crm.com',
  role: 'admin' as const,
  isActive: true,
  mustChangePassword: false,
  createdAt: '2026-09-01T00:00:00.000Z',
};

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const meOk = () => jsonResponse(200, { user, permissions: ['users:manage', 'tasks:write'] });
const meUnauthorized = () => jsonResponse(401, { error: 'Não autenticado', code: 'UNAUTHENTICATED' });

let lastError: { code?: string; status?: number } | null = null;

function Probe(): JSX.Element {
  const { user: current, permissions, status, login, logout, refresh, can } = useAuth();

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{current ? current.name : 'sem usuário'}</span>
      <span data-testid="permissions">{permissions.join(',')}</span>
      <span data-testid="can-users">{String(can('users:manage'))}</span>
      <span data-testid="can-reports">{String(can('settings:manage'))}</span>
      <button
        onClick={async () => {
          lastError = null;
          try {
            await login({ email: 'ana@crm.com', password: 'x' });
          } catch (error) {
            lastError = error as { code?: string; status?: number };
          }
        }}
      >
        entrar
      </button>
      <button onClick={() => void logout()}>sair</button>
      <button onClick={() => void refresh()}>atualizar</button>
    </div>
  );
}

const renderProbe = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

describe('AuthContext', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    lastError = null;
    fetchMock = jest.spyOn(global, 'fetch') as unknown as FetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('carrega a sessão ao montar e fica autenticado', async () => {
    fetchMock.mockResolvedValue(meOk());

    renderProbe();

    expect(screen.getByTestId('status').textContent).toBe('loading');
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('Ana');
    expect(screen.getByTestId('permissions')).toHaveTextContent('users:manage,tasks:write');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/me');
  });

  it('401 no /me vira deslogado, sem erro visível', async () => {
    fetchMock.mockResolvedValue(meUnauthorized());

    renderProbe();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('sem usuário');
    expect(screen.getByTestId('permissions').textContent).toBe('');
  });

  it('login bem-sucedido preenche usuário e permissões', async () => {
    fetchMock
      .mockResolvedValueOnce(meUnauthorized())
      .mockResolvedValueOnce(jsonResponse(200, { user }))
      .mockResolvedValueOnce(meOk());

    renderProbe();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));

    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('Ana');
    expect(screen.getByTestId('permissions')).toHaveTextContent('users:manage,tasks:write');
    expect(lastError).toBeNull();
  });

  it('erro de credencial chega ao chamador e mantém deslogado', async () => {
    fetchMock
      .mockResolvedValueOnce(meUnauthorized())
      .mockResolvedValueOnce(
        jsonResponse(401, { error: 'E-mail ou senha incorretos', code: 'INVALID_CREDENTIALS' }),
      );

    renderProbe();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));

    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));

    await waitFor(() => expect(lastError?.code).toBe('INVALID_CREDENTIALS'));
    expect(lastError?.status).toBe(401);
    expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
  });

  it('erro de bloqueio chega ao chamador com LOGIN_BLOCKED', async () => {
    fetchMock
      .mockResolvedValueOnce(meUnauthorized())
      .mockResolvedValueOnce(
        jsonResponse(429, { error: 'Muitas tentativas', code: 'LOGIN_BLOCKED' }),
      );

    renderProbe();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));

    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));

    await waitFor(() => expect(lastError?.code).toBe('LOGIN_BLOCKED'));
    expect(lastError?.status).toBe(429);
  });

  it('logout limpa o estado', async () => {
    fetchMock
      .mockResolvedValueOnce(meOk())
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    renderProbe();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

    fireEvent.click(screen.getByRole('button', { name: 'sair' }));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('sem usuário');
    expect(screen.getByTestId('permissions').textContent).toBe('');
    expect(screen.getByTestId('can-users')).toHaveTextContent('false');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/logout');
  });

  it('logout limpa o estado mesmo se a API falhar', async () => {
    fetchMock
      .mockResolvedValueOnce(meOk())
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    renderProbe();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

    fireEvent.click(screen.getByRole('button', { name: 'sair' }));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
  });

  it('can() responde conforme as permissões recebidas do /me', async () => {
    fetchMock.mockResolvedValue(meOk());

    renderProbe();

    await waitFor(() => expect(screen.getByTestId('can-users')).toHaveTextContent('true'));
    expect(screen.getByTestId('can-reports')).toHaveTextContent('false');
  });

  it('refresh recarrega a sessão', async () => {
    fetchMock.mockResolvedValueOnce(meUnauthorized()).mockResolvedValueOnce(meOk());

    renderProbe();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));

    fireEvent.click(screen.getByRole('button', { name: 'atualizar' }));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('useAuth fora do provider falha com mensagem clara', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Probe />)).toThrow(/useAuth.*AuthProvider/i);

    consoleError.mockRestore();
  });

  it('erro inesperado no /me também deixa deslogado', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));

    await act(async () => {
      renderProbe();
    });

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
  });
});
