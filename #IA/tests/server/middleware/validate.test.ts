import { z } from 'zod';

import { validate } from '@server/middleware/validate';

import { buildTestApp, startTestServer, type TestServer } from '../helpers/expressTestApp';

let server: TestServer;

/** Zod 4: `z.email()` no lugar do antigo `z.string().email()`. */
const loginSchema = z.object({
  email: z.email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const idParamsSchema = z.object({ id: z.uuid('Id inválido') });

const listQuerySchema = z.object({ page: z.coerce.number().int().min(1) });

beforeAll(async () => {
  server = await startTestServer(
    buildTestApp((app) => {
      app.post('/login', validate(loginSchema), (req, res) => {
        res.json({ body: req.body });
      });
      app.get('/usuarios/:id', validate(idParamsSchema, 'params'), (req, res) => {
        res.json({ params: req.params });
      });
      app.get('/usuarios', validate(listQuerySchema, 'query'), (req, res) => {
        res.json({ page: (req.query as unknown as { page: number }).page });
      });
    }),
  );
});

afterAll(async () => {
  await server.close();
});

async function post(body: unknown): Promise<Response> {
  return fetch(`${server.baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('validate — body', () => {
  it('deixa passar o corpo válido e entrega os dados já validados ao handler', async () => {
    const response = await post({ email: 'Admin@Exemplo.com', password: 'segredo123' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      body: { email: 'Admin@Exemplo.com', password: 'segredo123' },
    });
  });

  it('remove os campos que o schema não declara', async () => {
    const response = await post({
      email: 'admin@exemplo.com',
      password: 'segredo123',
      role: 'admin',
    });

    const body = (await response.json()) as { body: Record<string, unknown> };
    expect(body.body).not.toHaveProperty('role');
  });

  it('responde 400 VALIDATION_ERROR com os detalhes por campo', async () => {
    const response = await post({ email: 'sem-arroba', password: '123' });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: {
        email: 'E-mail inválido',
        password: 'Senha deve ter no mínimo 6 caracteres',
      },
    });
  });

  it('responde 400 quando o campo obrigatório nem veio', async () => {
    const response = await post({});

    expect(response.status).toBe(400);
    const body = (await response.json()) as { details: Record<string, string> };
    expect(Object.keys(body.details).sort()).toEqual(['email', 'password']);
  });
});

describe('validate — params e query', () => {
  it('aceita o params válido', async () => {
    const id = '3f1e6b26-2c9e-4a1e-9f1f-2a0a1b6f7c88';

    const response = await fetch(`${server.baseUrl}/usuarios/${id}`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ params: { id } });
  });

  it('responde 400 no params inválido', async () => {
    const response = await fetch(`${server.baseUrl}/usuarios/nao-e-uuid`);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { id: 'Id inválido' },
    });
  });

  it('valida e converte a query', async () => {
    const response = await fetch(`${server.baseUrl}/usuarios?page=2`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ page: 2 });
  });

  it('responde 400 na query inválida', async () => {
    const response = await fetch(`${server.baseUrl}/usuarios?page=zero`);

    expect(response.status).toBe(400);
    const body = (await response.json()) as { details: Record<string, string> };
    expect(body.details).toHaveProperty('page');
  });
});
