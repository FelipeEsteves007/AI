/**
 * @jest-environment node
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import handler, { config } from '@/pages/api/[...path]';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  // Monta o handler do Next num servidor HTTP cru: é o mesmo `(req, res)` que a Vercel entrega.
  server = createServer((req, res) => handler(req as never, res as never));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('rota catch-all /api/* (produção na Vercel)', () => {
  it('entrega a requisição ao Express: /api/auth/me sem sessão → 401 do backend', async () => {
    const response = await fetch(`${baseUrl}/api/auth/me`);

    expect(response.status).toBe(401);
    expect(((await response.json()) as { code: string }).code).toBe('UNAUTHORIZED');
  });

  it('corpo JSON chega ao Express (parser do Next desligado): login inválido → 400', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nao-e-email' }),
    });

    expect(response.status).toBe(400);
  });

  it('desliga o bodyParser do Next e marca resolver externo', () => {
    expect(config).toEqual({ api: { bodyParser: false, externalResolver: true } });
  });
});
