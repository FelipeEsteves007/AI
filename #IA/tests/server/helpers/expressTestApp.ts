import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';

import { errorHandler } from '@server/middleware/errorHandler';

/**
 * App Express mínimo para testar um middleware isoladamente: JSON, cookies e o
 * `errorHandler` no fim da cadeia — nada de rotas reais da aplicação.
 */
export function buildTestApp(configure: (app: Express) => void): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(cookieParser());
  configure(app);
  app.use(errorHandler);

  return app;
}

export interface TestServer {
  baseUrl: string;
  close(): Promise<void>;
}

/** Sobe o app em uma porta livre e devolve a URL base e o encerramento. */
export async function startTestServer(app: Express): Promise<TestServer> {
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
