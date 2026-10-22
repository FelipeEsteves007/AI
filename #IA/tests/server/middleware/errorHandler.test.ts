import type { Request, Response } from 'express';

import { errorHandler } from '@server/middleware/errorHandler';
import { HttpError } from '@server/utils/httpError';

import { buildTestApp, startTestServer, type TestServer } from '../helpers/expressTestApp';

let server: TestServer | undefined;

async function startThrowing(error: unknown): Promise<string> {
  server = await startTestServer(
    buildTestApp((app) => {
      app.get('/boom', () => {
        throw error;
      });
    }),
  );

  return server.baseUrl;
}

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe('errorHandler — HttpError', () => {
  it('devolve status, mensagem e código do HttpError', async () => {
    const baseUrl = await startThrowing(HttpError.emailInUse());

    const response = await fetch(`${baseUrl}/boom`);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'E-mail já cadastrado',
      code: 'EMAIL_IN_USE',
    });
  });

  it('inclui os detalhes por campo quando existirem', async () => {
    const baseUrl = await startThrowing(
      HttpError.validation('Dados inválidos', { email: 'E-mail inválido' }),
    );

    const response = await fetch(`${baseUrl}/boom`);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: { email: 'E-mail inválido' },
    });
  });

  it('omite a chave details quando o erro não tem detalhes', async () => {
    const baseUrl = await startThrowing(HttpError.forbidden());

    const response = await fetch(`${baseUrl}/boom`);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty('details');
  });
});

describe('errorHandler — erro inesperado', () => {
  it('vira 500 genérico, sem vazar mensagem interna nem stack', async () => {
    const baseUrl = await startThrowing(new Error('connect ECONNREFUSED 127.0.0.1:5432 senha=segredo'));

    const response = await fetch(`${baseUrl}/boom`);

    expect(response.status).toBe(500);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' });
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(body)).not.toContain('segredo');
    expect(body).not.toHaveProperty('stack');
  });

  it('trata valor lançado que nem é Error', async () => {
    const baseUrl = await startThrowing('string solta');

    const response = await fetch(`${baseUrl}/boom`);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  });
});

describe('errorHandler — contrato de middleware de erro do Express 5', () => {
  it('declara os quatro parâmetros exigidos pelo Express', () => {
    expect(errorHandler).toHaveLength(4);
  });

  it('delega ao next quando os headers já foram enviados', () => {
    const next = jest.fn();
    const res = { headersSent: true, status: jest.fn(), json: jest.fn() };
    const erro = new Error('tarde demais');

    errorHandler(erro, {} as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledWith(erro);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
