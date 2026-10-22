import { changePassword, getSession, login, logout } from '@/services/authService';

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

describe('authService', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch') as unknown as FetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('login envia credenciais para /api/auth/login e devolve o usuário', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user }));

    await expect(login({ email: 'ana@crm.com', password: 'x' })).resolves.toEqual({ user });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
  });

  it('login propaga o código de credencial inválida', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: 'E-mail ou senha incorretos', code: 'INVALID_CREDENTIALS' }),
    );

    await expect(login({ email: 'ana@crm.com', password: 'x' })).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('logout faz POST em /api/auth/logout', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(logout()).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/logout');
  });

  it('getSession devolve usuário e permissões de /api/auth/me', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user, permissions: ['users:manage'] }));

    await expect(getSession()).resolves.toEqual({ user, permissions: ['users:manage'] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/me');
    expect(init.method).toBe('GET');
  });

  it('changePassword faz PUT em /api/auth/password', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(
      changePassword({ currentPassword: 'old', newPassword: 'new' }),
    ).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/password');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify({ currentPassword: 'old', newPassword: 'new' }));
  });
});
