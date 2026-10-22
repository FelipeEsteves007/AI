import type { User } from '@prisma/client';
import jsonwebtoken from 'jsonwebtoken';

import { createRequireAuth } from '@server/middleware/requireAuth';
import type { AuthRepositories } from '@server/types/auth';
import { SESSION_COOKIE_NAME, signSessionToken } from '@server/utils/jwt';

import {
  InMemoryAuditLogRepository,
  InMemoryUserRepository,
} from '../fakes/inMemoryRepositories';
import { buildTestApp, startTestServer, type TestServer } from '../helpers/expressTestApp';
import { makeUser } from '../helpers/userFixture';

/** RN-08: segredo HS256 com pelo menos 32 caracteres. */
const SECRET = 'segredo-de-teste-suficientemente-longo-32+';
const OUTRO_SECRET = 'outro-segredo-de-teste-tambem-bem-longo-32';
const originalEnv = { ...process.env };

let server: TestServer;

async function startWith(users: User[]): Promise<void> {
  const repositories: AuthRepositories = {
    users: new InMemoryUserRepository(users),
    auditLogs: new InMemoryAuditLogRepository(),
  };
  const requireAuth = createRequireAuth(repositories);

  server = await startTestServer(
    buildTestApp((app) => {
      // Padrão fail-closed (RN-05): senha provisória não passa.
      app.get('/protegida', requireAuth(), (req, res) => {
        res.json({ user: req.user });
      });
      // Rota que optou explicitamente por funcionar com senha provisória.
      app.get('/auth/me', requireAuth({ allowPasswordChangePending: true }), (req, res) => {
        res.json({ user: req.user });
      });
    }),
  );
}

function get(path: string, token?: string): Promise<Response> {
  return fetch(`${server.baseUrl}${path}`, {
    headers: token ? { cookie: `${SESSION_COOKIE_NAME}=${token}` } : {},
  });
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

afterEach(async () => {
  process.env = { ...originalEnv };
  await server?.close();
});

describe('requireAuth — sessão ausente ou inválida (RN-08)', () => {
  it('responde 401 UNAUTHORIZED sem cookie de sessão', async () => {
    await startWith([makeUser()]);

    const response = await get('/protegida');

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('responde 401 com token que não é um JWT', async () => {
    await startWith([makeUser()]);

    const response = await get('/protegida', 'isso-nao-e-um-token');

    expect(response.status).toBe(401);
  });

  it('responde 401 com token expirado', async () => {
    const user = makeUser();
    await startWith([user]);
    const expirado = jsonwebtoken.sign({ tv: user.tokenVersion }, SECRET, {
      algorithm: 'HS256',
      subject: user.id,
      expiresIn: -10,
    });

    const response = await get('/protegida', expirado);

    expect(response.status).toBe(401);
  });

  it('responde 401 com token adulterado', async () => {
    const user = makeUser();
    await startWith([user]);
    const token = signSessionToken({ userId: user.id, tokenVersion: user.tokenVersion });
    const [header, payload, assinatura] = token.split('.');
    const adulterado = `${header}.${Buffer.from(
      JSON.stringify({ sub: 'outro-usuario', tv: 0 }),
    ).toString('base64url')}.${assinatura}`;
    expect(payload).toBeDefined();

    const response = await get('/protegida', adulterado);

    expect(response.status).toBe(401);
  });

  it('responde 401 com token assinado por outro segredo', async () => {
    const user = makeUser();
    await startWith([user]);
    const forjado = jsonwebtoken.sign({ tv: user.tokenVersion }, OUTRO_SECRET, {
      algorithm: 'HS256',
      subject: user.id,
      expiresIn: '24h',
    });

    const response = await get('/protegida', forjado);

    expect(response.status).toBe(401);
  });

  it('responde 401 quando o usuário do token não existe mais', async () => {
    await startWith([]);
    const token = signSessionToken({ userId: 'usuario-inexistente', tokenVersion: 0 });

    const response = await get('/protegida', token);

    expect(response.status).toBe(401);
  });

  it('não responde 401 quando a falha é de configuração (JWT_SECRET ausente)', async () => {
    const user = makeUser();
    await startWith([user]);
    const token = signSessionToken({ userId: user.id, tokenVersion: user.tokenVersion });
    delete process.env.JWT_SECRET;

    const response = await get('/protegida', token);

    expect(response.status).toBe(500);
  });
});

describe('requireAuth — estado do usuário (RN-09 e RN-10)', () => {
  it('responde 401 para usuário desativado, mesmo com sessão válida (RN-09)', async () => {
    const user = makeUser({ isActive: false });
    await startWith([user]);
    const token = signSessionToken({ userId: user.id, tokenVersion: user.tokenVersion });

    const response = await get('/protegida', token);

    expect(response.status).toBe(401);
  });

  it('responde 401 quando o tokenVersion do token ficou para trás (RN-10)', async () => {
    const user = makeUser({ tokenVersion: 3 });
    await startWith([user]);
    const token = signSessionToken({ userId: user.id, tokenVersion: 2 });

    const response = await get('/protegida', token);

    expect(response.status).toBe(401);
  });
});

describe('requireAuth — sucesso', () => {
  it('preenche req.user e segue, sem passwordHash nem tokenVersion (RN-13)', async () => {
    const user = makeUser({ name: 'Adriano', email: 'admin@exemplo.com' });
    await startWith([user]);
    const token = signSessionToken({ userId: user.id, tokenVersion: user.tokenVersion });

    const response = await get('/protegida', token);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { user: Record<string, unknown> };
    expect(body.user).toMatchObject({
      id: user.id,
      name: 'Adriano',
      email: 'admin@exemplo.com',
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    });
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(body.user).not.toHaveProperty('tokenVersion');
  });
});

describe('requireAuth — senha provisória (RN-05, fail-closed)', () => {
  it('bloqueia com 403 PASSWORD_CHANGE_REQUIRED por padrão', async () => {
    const user = makeUser({ mustChangePassword: true });
    await startWith([user]);
    const token = signSessionToken({ userId: user.id, tokenVersion: user.tokenVersion });

    const response = await get('/protegida', token);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'PASSWORD_CHANGE_REQUIRED' });
  });

  it('libera a rota que optou por allowPasswordChangePending', async () => {
    const user = makeUser({ mustChangePassword: true });
    await startWith([user]);
    const token = signSessionToken({ userId: user.id, tokenVersion: user.tokenVersion });

    const response = await get('/auth/me', token);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      user: { id: user.id, mustChangePassword: true },
    });
  });

  it('não exige nada de quem já trocou a senha, nas duas rotas', async () => {
    const user = makeUser({ mustChangePassword: false });
    await startWith([user]);
    const token = signSessionToken({ userId: user.id, tokenVersion: user.tokenVersion });

    await expect(get('/protegida', token).then((r) => r.status)).resolves.toBe(200);
    await expect(get('/auth/me', token).then((r) => r.status)).resolves.toBe(200);
  });
});
