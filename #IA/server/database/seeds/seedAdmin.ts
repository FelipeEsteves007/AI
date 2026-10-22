/**
 * Seed do primeiro admin (CU-14).
 *
 * Numa instalação nova não existe ninguém para cadastrar o primeiro admin pela tela, então
 * este script cria esse usuário direto no banco, com senha provisória e troca obrigatória
 * no primeiro login (RN-04/RN-05). Só grava o hash bcrypt (RN-13).
 *
 * O arquivo tem duas partes bem separadas:
 * 1. `seedFirstAdmin(repositories, input)` — função pura, sem I/O de console nem `process`,
 *    testada com os repositórios em memória;
 * 2. o wrapper de linha de comando no fim, que lê o ambiente, imprime o resultado e encerra
 *    o processo. Ele só roda quando o arquivo é chamado direto (`npm run db:seed-admin`);
 *    ao ser importado por um teste, nada acontece.
 *
 * Sobre a saída em stdout: este é um utilitário de linha de comando, não código de runtime da
 * aplicação. A senha provisória precisa aparecer no terminal de quem instalou (RN-04), por isso
 * usamos `process.stdout.write` — nunca `console.log`, proibido pela constitution no runtime.
 */

import path from 'node:path';

import { AuditAction, UserRole } from '@prisma/client';

import type { AuthRepositories, PublicUser } from '@server/types/auth';
import { HttpError } from '@server/utils/httpError';
import { generateTemporaryPassword, hashPassword } from '@server/utils/password';
import { normalizeEmail, toPublicUser } from '@server/utils/userMapper';

/** Nome usado quando `SEED_ADMIN_NAME` não vem no ambiente. */
const DEFAULT_ADMIN_NAME = 'Admin';

/**
 * E-mail em formato mínimo aceitável: algo, arroba, domínio com ponto, sem espaços.
 * O objetivo aqui não é validar RFC, é impedir que o seed grave lixo no banco.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Entrada do seed. Os dois campos chegam do ambiente, então podem vir ausentes. */
export interface SeedAdminInput {
  name?: string;
  email?: string;
}

/** Admin criado: a senha provisória sai aqui **uma única vez** (RN-04). */
export interface SeedAdminCreated {
  status: 'created';
  user: PublicUser;
  temporaryPassword: string;
}

/** Nada foi criado porque já existe admin. Sem senha: ela não é recuperável. */
export interface SeedAdminSkipped {
  status: 'skipped';
  reason: string;
  existingAdminEmail: string;
}

export type SeedAdminResult = SeedAdminCreated | SeedAdminSkipped;

/**
 * Cria o primeiro admin, se ainda não houver nenhum.
 *
 * Idempotência: qualquer usuário com papel `admin` bloqueia a criação, **inclusive um admin
 * desativado** — reativar o admin existente é decisão de quem administra, e criar um segundo
 * admin por trás disso deixaria uma conta extra com senha provisória viva no sistema.
 *
 * @throws {HttpError} 400 quando o e-mail está ausente ou é inválido.
 */
export async function seedFirstAdmin(
  { users, auditLogs }: AuthRepositories,
  input: SeedAdminInput,
): Promise<SeedAdminResult> {
  const email = requireValidEmail(input.email);
  const name = input.name?.trim() || DEFAULT_ADMIN_NAME;

  const existingAdmin = (await users.list()).find((user) => user.role === UserRole.admin);

  if (existingAdmin) {
    return {
      status: 'skipped',
      reason: existingAdmin.isActive
        ? 'Já existe um admin cadastrado; nada a fazer.'
        : 'Já existe um admin cadastrado (desativado); reative-o em vez de criar outro.',
      existingAdminEmail: existingAdmin.email,
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const created = await users.create({
    name,
    email,
    passwordHash: await hashPassword(temporaryPassword),
    role: UserRole.admin,
    mustChangePassword: true,
    isActive: true,
  });

  // Sem ator: o seed roda antes de existir qualquer usuário para assinar a ação (RN-14).
  await auditLogs.record({
    action: AuditAction.USER_CREATED,
    actorId: null,
    targetUserId: created.id,
    email: created.email,
    metadata: { role: created.role, source: 'seed' },
  });

  return { status: 'created', user: toPublicUser(created), temporaryPassword };
}

/** Recusa a execução antes de tocar no banco quando o e-mail do ambiente não serve. */
function requireValidEmail(email: string | undefined): string {
  const normalized = normalizeEmail(email ?? '');

  if (!normalized) {
    throw HttpError.validation('SEED_ADMIN_EMAIL é obrigatório para criar o primeiro admin');
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    throw HttpError.validation(`SEED_ADMIN_EMAIL inválido: "${email ?? ''}"`);
  }

  return normalized;
}

/* -------------------------------------------------------------------------- */
/* Wrapper de linha de comando — nada abaixo daqui é usado pela aplicação.     */
/* -------------------------------------------------------------------------- */

/** Monta a mensagem impressa no terminal a partir do resultado do seed. */
export function formatSeedAdminResult(result: SeedAdminResult): string {
  if (result.status === 'skipped') {
    return [
      'Seed do primeiro admin: nada criado.',
      `Motivo: ${result.reason}`,
      `Admin existente: ${result.existingAdminEmail}`,
      '',
    ].join('\n');
  }

  return [
    'Primeiro admin criado com sucesso.',
    `Nome:  ${result.user.name}`,
    `E-mail: ${result.user.email}`,
    `Senha provisória: ${result.temporaryPassword}`,
    '',
    'Anote a senha agora: ela é exibida uma única vez (RN-04) e será trocada no primeiro login.',
    '',
  ].join('\n');
}

/**
 * Executa o seed com os repositórios Prisma e devolve o código de saída do processo.
 * Os modelos entram por import dinâmico para o Prisma Client só ser instanciado quando o
 * script roda de verdade — importar este arquivo num teste não abre conexão com o banco.
 */
async function runCli(): Promise<number> {
  try {
    const [{ createUserModel }, { createAuditLogModel }] = await Promise.all([
      import('@server/models/userModel'),
      import('@server/models/auditLogModel'),
    ]);

    const result = await seedFirstAdmin(
      { users: createUserModel(), auditLogs: createAuditLogModel() },
      { name: process.env.SEED_ADMIN_NAME, email: process.env.SEED_ADMIN_EMAIL },
    );

    process.stdout.write(formatSeedAdminResult(result));

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    process.stderr.write(`Seed do primeiro admin falhou: ${message}\n`);

    return 1;
  }
}

/** Verdadeiro só quando o Node foi chamado com este arquivo, não quando ele é importado. */
function isDirectRun(): boolean {
  const entry = process.argv[1];

  return entry !== undefined && path.resolve(entry) === path.resolve(__filename);
}

if (isDirectRun()) {
  void runCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
