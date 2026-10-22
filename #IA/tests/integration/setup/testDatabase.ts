/**
 * Trava de segurança dos testes de integração: só aceitam um banco cujo nome termina em `_test`
 * (mesma regra do `tests/e2e/globalSetup.ts`). Os testes gravam e apagam dados; num `.env`
 * errado isso destruiria o banco de desenvolvimento.
 */

export const REQUIRED_DATABASE_SUFFIX = '_test';

/** Extrai o nome do banco da URL de conexão (o caminho, sem a barra e sem a query string). */
function databaseNameFrom(databaseUrl: string): string {
  return decodeURIComponent(new URL(databaseUrl).pathname).replace(/^\//, '');
}

/** Devolve o nome do banco ou lança se a URL faltar, for inválida ou não apontar para `*_test`. */
export function assertTestDatabase(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL não definida. Rode com `npm run test:integration`, que carrega o .env.test.',
    );
  }

  let databaseName: string;
  try {
    databaseName = databaseNameFrom(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL inválida: não foi possível ler o nome do banco.');
  }

  if (!databaseName.endsWith(REQUIRED_DATABASE_SUFFIX)) {
    throw new Error(
      `Recusando rodar a integração: o banco "${databaseName}" não termina em "${REQUIRED_DATABASE_SUFFIX}".`,
    );
  }

  return databaseName;
}
