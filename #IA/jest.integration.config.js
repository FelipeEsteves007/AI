/**
 * Jest da suíte de INTEGRAÇÃO (`npm run test:integration`): roda contra o Postgres real do
 * `.env.test` (banco `*_test`). Fica fora do `jest.config.js` de propósito — o `npm test` e a
 * cobertura precisam rodar sem banco.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.integration.test.ts'],
  transform: {
    '^.+\\.ts$': ['@swc/jest', { jsc: { parser: { syntax: 'typescript', tsx: false } } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
  },
  globalSetup: '<rootDir>/tests/integration/setup/globalSetup.ts',
  // Serial: os arquivos compartilham o mesmo banco.
  maxWorkers: 1,
  testTimeout: 30000,
};
