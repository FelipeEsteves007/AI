import { AuditAction, UserRole, type User } from '@prisma/client';

import { createApp } from '@server/app';
import { createRequireAuth } from '@server/middleware/requireAuth';
import type { Repositories } from '@server/types/auth';
import { SESSION_COOKIE_NAME } from '@server/utils/jwt';
import { hashPassword } from '@server/utils/password';

import {
  InMemoryAuditLogRepository,
  InMemoryStudentRepository,
  catalogRepositories,
  InMemoryUserRepository,
} from '../fakes/inMemoryRepositories';
import { buildTestApp, startTestServer, type TestServer } from '../helpers/expressTestApp';
import { makeUser } from '../helpers/userFixture';

/** RN-08: segredo HS256 com pelo menos 32 caracteres. */
const SECRET = 'segredo-de-teste-suficientemente-longo-32+';
const SENHA = 'SenhaAtual1';
const NOVA_SENHA = 'SenhaNova123';

const originalEnv = { ...process.env };

let passwordHash: string;
let repositories: Repositories;
let server: TestServer;
let baseUrl: string;

/** Sobe `createApp(fakes)` com os usuários informados já cadastrados. */
async function startApp(users: User[]): Promise<void> {
  repositories = {
    users: new InMemoryUserRepository(users),
    auditLogs: new InMemoryAuditLogRepository(),
    students: new InMemoryStudentRepository(),
    ...catalogRepositories(),
  };
  server = await startTestServer(createApp(repositories));
  baseUrl = server.baseUrl;
}

function post(path: string, body?: unknown, cookie?: string): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
}

function put(path: string, body: unknown, cookie?: string): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function get(path: string, cookie?: string): Promise<Response> {
  return fetch(`${baseUrl}${path}`, { headers: cookie ? { cookie } : {} });
}

/** Primeiro `Set-Cookie` da resposta, cru (com os atributos). */
function rawSessionCookie(response: Response): string {
  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!cookie) {
    throw new Error('A resposta não trouxe o cookie de sessão');
  }

  return cookie;
}

/** Cookie pronto para reenviar no header `Cookie`. */
function sessionCookie(response: Response): string {
  return rawSessionCookie(response).split(';')[0] as string;
}

async function login(email: string, password: string): Promise<Response> {
  return post('/api/auth/login', { email, password });
}

async function loginCookie(email = 'admin@exemplo.com', password = SENHA): Promise<string> {
  const response = await login(email, password);

  expect(response.status).toBe(200);

  return sessionCookie(response);
}

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  passwordHash = await hashPassword(SENHA);
});

afterAll(() => {
  process.env = { ...originalEnv };
});

afterEach(async () => {
  await server.close();
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await startApp([makeUser({ email: 'admin@exemplo.com', passwordHash })]);
  });

  it('responde 200 com o usuário público e o cookie de sessão HttpOnly', async () => {
    const response = await login('admin@exemplo.com', SENHA);

    expect(response.status).toBe(200);

    const body = (await response.json()) as { user: Record<string, unknown> };

    expect(body.user).toMatchObject({
      email: 'admin@exemplo.com',
      name: 'Adriano',
      role: UserRole.admin,
      isActive: true,
      mustChangePassword: false,
    });
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(body.user).not.toHaveProperty('tokenVersion');

    const cookie = rawSessionCookie(response);

    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
  });

  it('aceita o e-mail com outra caixa e registra o sucesso na auditoria', async () => {
    const response = await login('ADMIN@Exemplo.com', SENHA);

    expect(response.status).toBe(200);
    expect(
      (repositories.auditLogs as InMemoryAuditLogRepository).entries.map((entry) => entry.action),
    ).toEqual([AuditAction.LOGIN_SUCCESS]);
  });

  it('responde 401 genérico para senha errada', async () => {
    const response = await login('admin@exemplo.com', 'senha-errada');

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'E-mail ou senha incorretos',
      code: 'INVALID_CREDENTIALS',
    });
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });

  it('responde o mesmo 401 para e-mail inexistente', async () => {
    const response = await login('ninguem@exemplo.com', SENHA);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'E-mail ou senha incorretos',
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('responde 400 quando o corpo é inválido', async () => {
    const semSenha = await post('/api/auth/login', { email: 'admin@exemplo.com' });
    const emailQuebrado = await login('nao-e-email', SENHA);

    expect(semSenha.status).toBe(400);
    expect(emailQuebrado.status).toBe(400);

    const body = (await emailQuebrado.json()) as { code: string; details?: Record<string, string> };

    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toHaveProperty('email');
  });
});

describe('POST /api/auth/login com usuário desativado', () => {
  beforeEach(async () => {
    await startApp([makeUser({ email: 'inativo@exemplo.com', passwordHash, isActive: false })]);
  });

  it('responde o mesmo 401 genérico (RN-06)', async () => {
    const response = await login('inativo@exemplo.com', SENHA);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'E-mail ou senha incorretos',
      code: 'INVALID_CREDENTIALS',
    });
  });
});

describe('POST /api/auth/login bloqueado (RN-07)', () => {
  beforeEach(async () => {
    await startApp([makeUser({ email: 'admin@exemplo.com', passwordHash })]);
  });

  it('responde 429 depois de 5 falhas na janela', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await login('admin@exemplo.com', 'senha-errada')).status).toBe(401);
    }

    const bloqueado = await login('admin@exemplo.com', SENHA);

    expect(bloqueado.status).toBe(429);

    const body = (await bloqueado.json()) as { code: string };

    expect(body.code).toBe('LOGIN_BLOCKED');
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(async () => {
    await startApp([
      makeUser({ email: 'vendedor@exemplo.com', passwordHash, role: UserRole.vendedor }),
    ]);
  });

  it('responde 401 sem cookie de sessão', async () => {
    const response = await get('/api/auth/me');

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Sessão inválida ou expirada',
      code: 'UNAUTHORIZED',
    });
  });

  it('responde 200 com o usuário e as permissões do papel', async () => {
    const cookie = await loginCookie('vendedor@exemplo.com');
    const response = await get('/api/auth/me', cookie);

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      user: Record<string, unknown>;
      permissions: string[];
    };

    expect(body.user).toMatchObject({ email: 'vendedor@exemplo.com', role: UserRole.vendedor });
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(body.permissions).toEqual(['tasks:write']);
  });
});

describe('PUT /api/auth/password', () => {
  beforeEach(async () => {
    await startApp([makeUser({ email: 'admin@exemplo.com', passwordHash })]);
  });

  it('responde 204, devolve cookie novo e derruba a sessão antiga (RN-10)', async () => {
    const cookieAntigo = await loginCookie();
    const response = await put(
      '/api/auth/password',
      { currentPassword: SENHA, newPassword: NOVA_SENHA },
      cookieAntigo,
    );

    expect(response.status).toBe(204);

    const cookieNovo = sessionCookie(response);

    expect(cookieNovo).not.toBe(cookieAntigo);
    expect(rawSessionCookie(response)).toContain('HttpOnly');

    expect((await get('/api/auth/me', cookieAntigo)).status).toBe(401);
    expect((await get('/api/auth/me', cookieNovo)).status).toBe(200);

    expect((await login('admin@exemplo.com', SENHA)).status).toBe(401);
    expect((await login('admin@exemplo.com', NOVA_SENHA)).status).toBe(200);
  });

  it('responde 401 sem sessão', async () => {
    const response = await put('/api/auth/password', {
      currentPassword: SENHA,
      newPassword: NOVA_SENHA,
    });

    expect(response.status).toBe(401);
  });

  it('responde 400 quando a nova senha é curta demais', async () => {
    const cookie = await loginCookie();
    const response = await put(
      '/api/auth/password',
      { currentPassword: SENHA, newPassword: 'abc' },
      cookie,
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as { code: string; details?: Record<string, string> };

    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toHaveProperty('newPassword');
  });

  it('responde 422 quando a senha atual está errada', async () => {
    const cookie = await loginCookie();
    const response = await put(
      '/api/auth/password',
      { currentPassword: 'outra-senha', newPassword: NOVA_SENHA },
      cookie,
    );

    expect(response.status).toBe(422);
    expect(((await response.json()) as { code: string }).code).toBe('WRONG_CURRENT_PASSWORD');
  });
});

describe('POST /api/auth/logout', () => {
  beforeEach(async () => {
    await startApp([makeUser({ email: 'admin@exemplo.com', passwordHash })]);
  });

  it('responde 204 e devolve o cookie expirado, com as mesmas opções da criação', async () => {
    const cookie = await loginCookie();
    const response = await post('/api/auth/logout', undefined, cookie);

    expect(response.status).toBe(204);

    const expirado = rawSessionCookie(response);

    expect(expirado).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(expirado).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    expect(expirado).toContain('Path=/');
    expect(expirado).toContain('SameSite=Lax');
    expect(expirado).toContain('HttpOnly');
  });

  it('responde 204 mesmo sem sessão (rota pública)', async () => {
    const response = await post('/api/auth/logout');

    expect(response.status).toBe(204);
  });
});

describe('sessão com senha provisória (RN-05)', () => {
  beforeEach(async () => {
    await startApp([
      makeUser({ email: 'novo@exemplo.com', passwordHash, mustChangePassword: true }),
    ]);
  });

  it('libera /me, /password e /logout, mas barra outra rota autenticada', async () => {
    const cookie = await loginCookie('novo@exemplo.com');

    expect((await get('/api/auth/me', cookie)).status).toBe(200);

    // Qualquer outra rota autenticada usa o `requireAuth` no modo padrão.
    const outraRota = buildTestApp((app) => {
      app.get('/api/protegida', createRequireAuth(repositories)(), (_req, res) => {
        res.json({ ok: true });
      });
    });
    const outroServidor = await startTestServer(outraRota);
    const bloqueada = await fetch(`${outroServidor.baseUrl}/api/protegida`, {
      headers: { cookie },
    });

    expect(bloqueada.status).toBe(403);
    expect(((await bloqueada.json()) as { code: string }).code).toBe('PASSWORD_CHANGE_REQUIRED');
    await outroServidor.close();

    const trocou = await put(
      '/api/auth/password',
      { currentPassword: SENHA, newPassword: NOVA_SENHA },
      cookie,
    );

    expect(trocou.status).toBe(204);

    const cookieNovo = sessionCookie(trocou);
    const me = await get('/api/auth/me', cookieNovo);

    expect(((await me.json()) as { user: { mustChangePassword: boolean } }).user
      .mustChangePassword).toBe(false);

    expect((await post('/api/auth/logout', undefined, cookieNovo)).status).toBe(204);
  });
});

describe('GET /health', () => {
  beforeEach(async () => {
    await startApp([]);
  });

  it('continua público, sem sessão', async () => {
    const response = await get('/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
