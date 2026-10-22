import type { IncomingMessage, ServerResponse } from 'node:http';

import type { NextApiRequest, NextApiResponse } from 'next';

import { createApp } from '@server/app';

/**
 * API Express servida pelo próprio Next (TASK-034): em produção na Vercel existe um projeto só, e o
 * navegador continua falando só com o domínio do Next — cookie de sessão HttpOnly de primeira parte,
 * sem CORS. O Express lê o corpo e trata os erros, então o parser do Next fica desligado.
 *
 * Em desenvolvimento e no E2E, com `API_URL` definida, o `next.config.mjs` reescreve `/api/*` para a
 * API separada (porta 3001/3101) **antes** desta rota — ela só atende quando não há `API_URL`.
 */
export const config = {
  api: { bodyParser: false, externalResolver: true },
};

const app = createApp();

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  app(req as unknown as IncomingMessage, res as unknown as ServerResponse);
}
