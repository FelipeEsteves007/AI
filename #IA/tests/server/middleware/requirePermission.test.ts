import { UserRole } from '@prisma/client';
import type { RequestHandler } from 'express';

import { requirePermission } from '@server/middleware/requirePermission';
import { toPublicUser } from '@server/utils/userMapper';

import { buildTestApp, startTestServer, type TestServer } from '../helpers/expressTestApp';
import { makeUser } from '../helpers/userFixture';

let server: TestServer;

/** Simula o que o `requireAuth` faria antes: só preenche `req.user`. */
function authenticatedAs(role: UserRole | null): RequestHandler {
  return (req, _res, next) => {
    if (role) {
      req.user = toPublicUser(makeUser({ role }));
    }
    next();
  };
}

async function startWith(role: UserRole | null): Promise<void> {
  server = await startTestServer(
    buildTestApp((app) => {
      app.get(
        '/usuarios',
        authenticatedAs(role),
        requirePermission('users:manage'),
        (_req, res) => {
          res.json({ ok: true });
        },
      );
    }),
  );
}

afterEach(async () => {
  await server?.close();
});

describe('requirePermission (matriz da spec, sem redeclarar papéis)', () => {
  it('deixa o admin passar em users:manage', async () => {
    await startWith(UserRole.admin);

    const response = await fetch(`${server.baseUrl}/usuarios`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('responde 403 FORBIDDEN para o CEO em users:manage (CU-13)', async () => {
    await startWith(UserRole.ceo);

    const response = await fetch(`${server.baseUrl}/usuarios`);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('responde 403 FORBIDDEN para o vendedor em users:manage (CU-13)', async () => {
    await startWith(UserRole.vendedor);

    const response = await fetch(`${server.baseUrl}/usuarios`);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('responde 401 quando não há usuário autenticado na requisição', async () => {
    await startWith(null);

    const response = await fetch(`${server.baseUrl}/usuarios`);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
