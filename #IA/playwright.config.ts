import { defineConfig } from '@playwright/test';

/**
 * Configuração do E2E (TASK-216).
 *
 * O ambiente vem do `.env.test`, carregado pelo script `npm run e2e` (`dotenv -e .env.test`).
 * As portas são próprias do teste (3100/3101) para não atropelar o ambiente de desenvolvimento
 * (3000/3001) nem o banco `crm_alunos`.
 */

const apiPort = Number(process.env.API_PORT ?? 3101);
const apiUrl = process.env.API_URL ?? `http://localhost:${apiPort}`;
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const webPort = new URL(baseURL).port || '3100';

export default defineConfig({
  testDir: './tests/e2e',
  // Prepara o banco de teste (trava de segurança, migrations, massa) antes de qualquer spec.
  globalSetup: './tests/e2e/globalSetup.ts',
  // Um worker só: os specs compartilham o mesmo banco e o mesmo par de servidores. Cada teste
  // continua independente — o que se evita aqui é a corrida entre processos, não a ordem.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list']],
  use: {
    baseURL,
    // O dev server do Next compila a página no primeiro acesso: a primeira navegação é lenta.
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
  },
  expect: {
    timeout: 15_000,
  },
  webServer: [
    {
      // API Express na porta de teste; herda DATABASE_URL e JWT_SECRET do `.env.test`.
      command: 'npx tsx server/server.ts',
      url: `${apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // `--turbopack` é obrigatório: com webpack o `#` no caminho da pasta quebra o Next (500).
      command: `npx next dev --turbopack -p ${webPort}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
