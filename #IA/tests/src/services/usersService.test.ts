import { ApiError } from '@/services/apiClient';
import { createUser, listUsers, resetPassword, updateUser } from '@/services/usersService';

const fetchMock = jest.fn();

const admin = {
  id: 'u-1',
  name: 'Ada',
  email: 'ada@crm.dev',
  role: 'admin' as const,
  isActive: true,
  mustChangePassword: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('usersService', () => {
  it('lista usuários em GET /api/users', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { users: [admin] }));

    await expect(listUsers()).resolves.toEqual([admin]);

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/users');
    expect(init.method).toBe('GET');
  });

  it('cria usuário em POST /api/users e devolve a senha provisória', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { user: admin, temporaryPassword: 'Prov1234' }));

    const result = await createUser({ name: 'Ada', email: 'ada@crm.dev', role: 'admin' });

    expect(result).toEqual({ user: admin, temporaryPassword: 'Prov1234' });
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/users');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Ada',
      email: 'ada@crm.dev',
      role: 'admin',
    });
  });

  it('propaga o ApiError EMAIL_IN_USE da criação', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: 'E-mail já usado', code: 'EMAIL_IN_USE' }));

    await expect(
      createUser({ name: 'Ada', email: 'ada@crm.dev', role: 'admin' }),
    ).rejects.toMatchObject({ status: 409, code: 'EMAIL_IN_USE' });
  });

  it('atualiza usuário em PUT /api/users/{id}', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user: { ...admin, isActive: false } }));

    const user = await updateUser('u-1', { isActive: false });

    expect(user.isActive).toBe(false);
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/users/u-1');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ isActive: false });
  });

  it('propaga o ApiError LAST_ADMIN da atualização', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { error: 'Último admin ativo', code: 'LAST_ADMIN' }),
    );

    const error = await updateUser('u-1', { role: 'ceo' }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('LAST_ADMIN');
  });

  it('redefine a senha em POST /api/users/{id}/password-reset', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user: admin, temporaryPassword: 'Nova4567' }));

    const result = await resetPassword('u-1');

    expect(result.temporaryPassword).toBe('Nova4567');
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/users/u-1/password-reset');
    expect(init.method).toBe('POST');
  });
});
