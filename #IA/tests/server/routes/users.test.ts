import { randomUUID } from 'node:crypto';

import { UserRole, type User } from '@prisma/client';

import { createApp } from '@server/app';
import type { Repositories } from '@server/types/auth';
import { SESSION_COOKIE_NAME } from '@server/utils/jwt';
import { hashPassword } from '@server/utils/password';

import {
  InMemoryAuditLogRepository,
  InMemoryStudentRepository,
  catalogRepositories,
  InMemoryUserRepository,
} from '../fakes/inMemoryRepositories';
import { startTestServer, type TestServer } from '../helpers/expressTestApp';
import { makeUser } from '../helpers/userFixture';

/** RN-08: segredo HS256 com pelo menos 32 caracteres. */
const SECRET = 'segredo-de-teste-suficientemente-longo-32+';
const SENHA = 'SenhaAtual1';

const ADMIN_EMAIL = 'admin@exemplo.com';
const CEO_EMAIL = 'ceo@exemplo.com';
const VENDEDOR_EMAIL = 'vendedor@exemplo.com';

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

function request(method: string, path: string, cookie?: string, body?: unknown): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const get = (path: string, cookie?: string): Promise<Response> => request('GET', path, cookie);
const post = (path: string, cookie?: string, body?: unknown): Promise<Response> =>
  request('POST', path, cookie, body ?? {});
const put = (path: string, cookie?: string, body?: unknown): Promise<Response> =>
  request('PUT', path, cookie, body ?? {});

/** Faz login e devolve o cookie de sessão pronto para reenviar. */
async function loginCookie(email: string, password = SENHA): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  expect(response.status).toBe(200);

  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!cookie) {
    throw new Error('A resposta de login não trouxe o cookie de sessão');
  }

  return cookie.split(';')[0] as string;
}

/** RN-13: nada de `passwordHash` nem `tokenVersion` no JSON, em nenhum nível. */
async function expectSemSegredos(response: Response): Promise<unknown> {
  const text = await response.text();

  expect(text).not.toContain('passwordHash');
  expect(text).not.toContain('tokenVersion');

  return text.length > 0 ? (JSON.parse(text) as unknown) : undefined;
}

/** As quatro rotas de `/api/users`, para os testes que valem para todas. */
function todasAsRotas(cookie?: string, id: string = randomUUID()): Promise<Response>[] {
  return [
    get('/api/users', cookie),
    post('/api/users', cookie, { name: 'Novo', email: 'novo@exemplo.com', role: UserRole.ceo }),
    put(`/api/users/${id}`, cookie, { name: 'Outro' }),
    post(`/api/users/${id}/password-reset`, cookie),
  ];
}

function seedPapeis(): User[] {
  return [
    makeUser({ email: ADMIN_EMAIL, passwordHash, role: UserRole.admin }),
    makeUser({ email: CEO_EMAIL, passwordHash, role: UserRole.ceo }),
    makeUser({ email: VENDEDOR_EMAIL, passwordHash, role: UserRole.vendedor }),
  ];
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

describe('/api/users com admin', () => {
  let cookie: string;
  let vendedor: User;

  beforeEach(async () => {
    await startApp(seedPapeis());
    cookie = await loginCookie(ADMIN_EMAIL);
    vendedor = (await repositories.users.findByEmail(VENDEDOR_EMAIL)) as User;
  });

  it('GET responde 200 com a lista de usuários públicos (CU-08)', async () => {
    const response = await get('/api/users', cookie);

    expect(response.status).toBe(200);

    const body = (await expectSemSegredos(response)) as { users: Record<string, unknown>[] };

    expect(body.users).toHaveLength(3);
    expect(body.users.map((user) => user.email)).toEqual([
      ADMIN_EMAIL,
      CEO_EMAIL,
      VENDEDOR_EMAIL,
    ]);
    expect(body.users[0]).toMatchObject({
      id: expect.any(String),
      name: 'Adriano',
      role: UserRole.admin,
      isActive: true,
      mustChangePassword: false,
    });
  });

  it('POST responde 201 com o usuário e a senha provisória em texto puro (RN-04)', async () => {
    const response = await post('/api/users', cookie, {
      name: 'Novo Vendedor',
      email: 'Novo@Exemplo.com',
      role: UserRole.vendedor,
    });

    expect(response.status).toBe(201);

    const body = (await expectSemSegredos(response)) as {
      user: Record<string, unknown>;
      temporaryPassword: string;
    };

    expect(body.user).toMatchObject({
      name: 'Novo Vendedor',
      email: 'novo@exemplo.com',
      role: UserRole.vendedor,
      isActive: true,
      mustChangePassword: true,
    });
    expect(body.temporaryPassword).toEqual(expect.any(String));
    expect(body.temporaryPassword.length).toBeGreaterThanOrEqual(8);

    // A senha provisória sai uma única vez: a listagem seguinte não a repete.
    const lista = await get('/api/users', cookie);

    expect(await lista.text()).not.toContain(body.temporaryPassword);
  });

  it('PUT responde 200 com o usuário atualizado (CU-09, CU-10)', async () => {
    const response = await put(`/api/users/${vendedor.id}`, cookie, {
      name: 'Vendedor Promovido',
      role: UserRole.ceo,
      isActive: false,
    });

    expect(response.status).toBe(200);

    const body = (await expectSemSegredos(response)) as { user: Record<string, unknown> };

    expect(body.user).toMatchObject({
      id: vendedor.id,
      name: 'Vendedor Promovido',
      role: UserRole.ceo,
      isActive: false,
    });
  });

  it('POST /{id}/password-reset responde 200 com nova senha provisória (CU-12)', async () => {
    const response = await post(`/api/users/${vendedor.id}/password-reset`, cookie);

    expect(response.status).toBe(200);

    const body = (await expectSemSegredos(response)) as {
      temporaryPassword: string;
      user?: Record<string, unknown>;
    };

    expect(body.temporaryPassword).toEqual(expect.any(String));

    const atualizado = (await repositories.users.findById(vendedor.id)) as User;

    expect(atualizado.mustChangePassword).toBe(true);
    expect(atualizado.passwordHash).not.toBe(vendedor.passwordHash);
    expect(atualizado.tokenVersion).toBe(vendedor.tokenVersion + 1);
  });

  it('POST responde 409 EMAIL_IN_USE, inclusive com o e-mail em outra caixa (RN-01)', async () => {
    const response = await post('/api/users', cookie, {
      name: 'Clone',
      email: 'ADMIN@Exemplo.COM',
      role: UserRole.admin,
    });

    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe('EMAIL_IN_USE');
  });

  it('POST responde 400 quando o corpo é inválido', async () => {
    const semNome = await post('/api/users', cookie, {
      email: 'x@exemplo.com',
      role: UserRole.ceo,
    });
    const papelInvalido = await post('/api/users', cookie, {
      name: 'X',
      email: 'x@exemplo.com',
      role: 'root',
    });
    const emailInvalido = await post('/api/users', cookie, {
      name: 'X',
      email: 'nao-e-email',
      role: UserRole.ceo,
    });

    expect(semNome.status).toBe(400);
    expect(papelInvalido.status).toBe(400);
    expect(emailInvalido.status).toBe(400);

    const body = (await emailInvalido.json()) as { code: string; details?: Record<string, string> };

    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toHaveProperty('email');
  });

  it('PUT responde 400 com corpo vazio ou campo inválido', async () => {
    const vazio = await put(`/api/users/${vendedor.id}`, cookie, {});
    const papelInvalido = await put(`/api/users/${vendedor.id}`, cookie, { role: 'root' });

    expect(vazio.status).toBe(400);
    expect(papelInvalido.status).toBe(400);
    expect(((await vazio.json()) as { code: string }).code).toBe('VALIDATION_ERROR');
  });

  it('responde 400 quando o id do caminho não é um uuid', async () => {
    const atualizar = await put('/api/users/nao-e-uuid', cookie, { name: 'X' });
    const redefinir = await post('/api/users/nao-e-uuid/password-reset', cookie);

    expect(atualizar.status).toBe(400);
    expect(redefinir.status).toBe(400);

    const body = (await atualizar.json()) as { code: string; details?: Record<string, string> };

    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toHaveProperty('id');
  });

  it('responde 404 com id inexistente', async () => {
    const id = randomUUID();
    const atualizar = await put(`/api/users/${id}`, cookie, { name: 'X' });
    const redefinir = await post(`/api/users/${id}/password-reset`, cookie);

    expect(atualizar.status).toBe(404);
    expect(redefinir.status).toBe(404);
    expect(((await atualizar.json()) as { code: string }).code).toBe('NOT_FOUND');
  });

  it('nenhuma resposta de sucesso traz passwordHash ou tokenVersion (RN-13)', async () => {
    const respostas = [
      await get('/api/users', cookie),
      await post('/api/users', cookie, {
        name: 'Mais Um',
        email: 'maisum@exemplo.com',
        role: UserRole.ceo,
      }),
      await put(`/api/users/${vendedor.id}`, cookie, { name: 'Renomeado' }),
      await post(`/api/users/${vendedor.id}/password-reset`, cookie),
    ];

    for (const resposta of respostas) {
      expect(resposta.ok).toBe(true);
      await expectSemSegredos(resposta);
    }
  });
});

describe('/api/users e o último admin ativo (RN-12, CU-11)', () => {
  let cookie: string;
  let adminId: string;

  beforeEach(async () => {
    await startApp(seedPapeis());
    cookie = await loginCookie(ADMIN_EMAIL);
    adminId = ((await repositories.users.findByEmail(ADMIN_EMAIL)) as User).id;
  });

  it('responde 409 LAST_ADMIN ao desativar o último admin ativo', async () => {
    const response = await put(`/api/users/${adminId}`, cookie, { isActive: false });

    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe('LAST_ADMIN');
  });

  it('responde 409 LAST_ADMIN ao rebaixar o último admin ativo', async () => {
    const response = await put(`/api/users/${adminId}`, cookie, { role: UserRole.ceo });

    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe('LAST_ADMIN');
  });

  it('permite rebaixar quando há outro admin ativo', async () => {
    const criado = await post('/api/users', cookie, {
      name: 'Segundo Admin',
      email: 'admin2@exemplo.com',
      role: UserRole.admin,
    });

    expect(criado.status).toBe(201);

    const response = await put(`/api/users/${adminId}`, cookie, { role: UserRole.ceo });

    expect(response.status).toBe(200);
  });
});

describe('/api/users sem sessão', () => {
  beforeEach(async () => {
    await startApp(seedPapeis());
  });

  it('responde 401 nas quatro rotas', async () => {
    for (const requisicao of todasAsRotas()) {
      const response = await requisicao;

      expect(response.status).toBe(401);
      expect(((await response.json()) as { code: string }).code).toBe('UNAUTHORIZED');
    }
  });
});

describe.each([
  ['CEO', CEO_EMAIL],
  ['vendedor', VENDEDOR_EMAIL],
])('/api/users com %s (CU-13, critério 4)', (_papel, email) => {
  let cookie: string;

  beforeEach(async () => {
    await startApp(seedPapeis());
    cookie = await loginCookie(email);
  });

  it('responde 403 nas quatro rotas, mesmo com sessão válida', async () => {
    const admin = (await repositories.users.findByEmail(ADMIN_EMAIL)) as User;

    for (const requisicao of todasAsRotas(cookie, admin.id)) {
      const response = await requisicao;

      expect(response.status).toBe(403);
      expect(((await response.json()) as { code: string }).code).toBe('FORBIDDEN');
    }
  });

  it('não cria nem altera nada ao tentar', async () => {
    const antes = await repositories.users.list();

    await post('/api/users', cookie, {
      name: 'Intruso',
      email: 'intruso@exemplo.com',
      role: UserRole.admin,
    });

    expect(await repositories.users.list()).toEqual(antes);
  });
});

describe('/api/users com senha provisória pendente (RN-05)', () => {
  beforeEach(async () => {
    await startApp([
      makeUser({
        email: ADMIN_EMAIL,
        passwordHash,
        role: UserRole.admin,
        mustChangePassword: true,
      }),
    ]);
  });

  it('responde 403 PASSWORD_CHANGE_REQUIRED nas quatro rotas, mesmo sendo admin', async () => {
    const cookie = await loginCookie(ADMIN_EMAIL);

    for (const requisicao of todasAsRotas(cookie)) {
      const response = await requisicao;

      expect(response.status).toBe(403);
      expect(((await response.json()) as { code: string }).code).toBe('PASSWORD_CHANGE_REQUIRED');
    }
  });
});
