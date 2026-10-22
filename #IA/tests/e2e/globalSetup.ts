/**
 * Preparação do banco antes de qualquer teste E2E (TASK-216).
 *
 * Roda uma única vez por execução de `npm run e2e`, que carrega o `.env.test` — o banco é o
 * `crm_alunos_test`, nunca o de desenvolvimento. Três etapas, nesta ordem:
 *
 * 1. trava de segurança: recusa rodar se o banco não terminar em `_test`;
 * 2. schema em dia (`prisma migrate deploy`) e dados zerados (`TRUNCATE`);
 * 3. massa de teste do `fixtures.ts`, com hash bcrypt pelo mesmo utilitário da aplicação.
 */

import { execSync } from 'node:child_process';

import { PrismaClient, UserRole } from '@prisma/client';

import { hashPassword } from '../../server/utils/password';
import { e2eUsers } from './fixtures';

/** Sufixo obrigatório no nome do banco: a trava que protege o banco de desenvolvimento. */
const REQUIRED_DATABASE_SUFFIX = '_test';

/** Extrai o nome do banco da URL de conexão (o caminho, sem a barra e sem a query string). */
function databaseNameFrom(databaseUrl: string): string {
  return decodeURIComponent(new URL(databaseUrl).pathname).replace(/^\//, '');
}

/**
 * Aborta se a `DATABASE_URL` não apontar para um banco `*_test`.
 *
 * Esta função existe para que um `.env` errado (ou esquecido) nunca apague o banco de
 * desenvolvimento: o `globalSetup` trunca tabelas, e truncar é irreversível.
 */
export function assertTestDatabase(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL não definida. Rode os testes E2E com `npm run e2e`, que carrega o .env.test.',
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
      `Recusando rodar o E2E: o banco "${databaseName}" não termina em "${REQUIRED_DATABASE_SUFFIX}". ` +
        'O globalSetup apaga os dados, então só um banco de teste é aceito.',
    );
  }

  return databaseName;
}

/** Garante o schema do banco de teste. Idempotente: sem migration pendente, não faz nada. */
function applyMigrations(): void {
  // Comando em string única (`execSync`): no Windows o `npx` é um .cmd, que só roda pelo shell.
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}

export default async function globalSetup(): Promise<void> {
  assertTestDatabase(process.env.DATABASE_URL);

  applyMigrations();

  const prisma = new PrismaClient();

  try {
    // TRUNCATE em vez de derrubar o banco: zera os dados sem tocar no schema nem nas migrations.
    // Os models de negócio entram explicitamente: aluno sem responsável e curso não dependem de
    // `Users`, e nenhum spec pode herdar aluno de uma execução anterior.
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Users", "AuditLogs", "Students", "Courses", "Purchases", "PipelineLeads", "Tasks" RESTART IDENTITY CASCADE',
    );

    const users = await Promise.all(
      e2eUsers.map(async (user) => ({
        name: user.name,
        email: user.email,
        passwordHash: await hashPassword(user.password),
        role: user.role as UserRole,
        isActive: true,
        mustChangePassword: user.mustChangePassword,
      })),
    );

    await prisma.user.createMany({ data: users });
  } finally {
    await prisma.$disconnect();
  }
}
