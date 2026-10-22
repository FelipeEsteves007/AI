/**
 * Roda uma vez antes da suíte de integração (`npm run test:integration`, que carrega o
 * `.env.test`): confere a trava do banco `*_test` e aplica as migrations pendentes.
 *
 * Nunca `migrate reset`: só `migrate deploy`, idempotente e sem apagar nada.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { assertTestDatabase } from './testDatabase';

export default function globalSetup(): void {
  assertTestDatabase(process.env.DATABASE_URL);

  // CLI do Prisma chamado pelo próprio `node`, sem shell: no Windows o shell quebra caminhos com
  // espaço e `#`, e este projeto tem os dois.
  const prismaCli = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: process.env,
  });
}
