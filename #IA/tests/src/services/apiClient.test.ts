import { ApiError, apiClient, isApiError } from '@/services/apiClient';

type FetchMock = jest.SpyInstance<Promise<Response>, Parameters<typeof fetch>>;

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const emptyResponse = (status: number): Response => new Response(null, { status });

describe('apiClient', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch') as unknown as FetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('faz GET em caminho relativo, com cookie de mesma origem e sem Content-Type', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    const data = await apiClient<{ ok: boolean }>('/api/auth/me');

    expect(data).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/me');
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('same-origin');
    expect(init.body).toBeUndefined();
    expect(new Headers(init.headers).get('Content-Type')).toBeNull();
  });

  it('serializa o corpo em JSON e envia o Content-Type', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user: { id: 'u1' } }));

    await apiClient('/api/auth/login', {
      method: 'POST',
      body: { email: 'a@b.com', password: 'secret' },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.com', password: 'secret' }));
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('devolve null em 204 sem tentar fazer parse', async () => {
    const response = emptyResponse(204);
    const jsonSpy = jest.spyOn(response, 'json');
    const textSpy = jest.spyOn(response, 'text');
    fetchMock.mockResolvedValue(response);

    await expect(apiClient('/api/auth/logout', { method: 'POST' })).resolves.toBeNull();
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(textSpy).not.toHaveBeenCalled();
  });

  it('converte erro da API em ApiError com status, code, message e details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: { email: 'obrigatório' },
      }),
    );

    expect.assertions(6);
    try {
      await apiClient('/api/auth/login', { method: 'POST', body: {} });
    } catch (error) {
      expect(isApiError(error)).toBe(true);
      const apiError = error as ApiError;
      expect(apiError).toBeInstanceOf(Error);
      expect(apiError.status).toBe(400);
      expect(apiError.code).toBe('VALIDATION_ERROR');
      expect(apiError.message).toBe('Dados inválidos');
      expect(apiError.details).toEqual({ email: 'obrigatório' });
    }
  });

  it('usa código e mensagem padrão quando a resposta de erro não é JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>500</html>', { status: 500 }));

    await expect(apiClient('/api/auth/me')).rejects.toMatchObject({
      status: 500,
      code: 'UNKNOWN_ERROR',
    });
  });

  it('vira ApiError de rede quando o fetch falha', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiClient('/api/auth/me')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('nunca toca no localStorage', async () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem');
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    fetchMock.mockResolvedValue(jsonResponse(200, { user: { id: 'u1' } }));

    await apiClient('/api/auth/login', { method: 'POST', body: { email: 'a@b.com' } });

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});
