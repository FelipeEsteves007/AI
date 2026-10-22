import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { createApp } from '@server/app';

describe('servidor da API', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = await new Promise<Server>((resolve) => {
      const listening = createApp().listen(0, () => resolve(listening));
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('sobe e responde 200 em GET /health', async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
