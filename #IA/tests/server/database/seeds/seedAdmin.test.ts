import { AuditAction, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { seedFirstAdmin } from '@server/database/seeds/seedAdmin';
import type { AuthRepositories } from '@server/types/auth';

import {
  InMemoryAuditLogRepository,
  InMemoryUserRepository,
} from '../../fakes/inMemoryRepositories';

const INPUT = { name: 'Admin', email: 'admin@exemplo.local' };

function buildRepositories(): AuthRepositories & {
  users: InMemoryUserRepository;
  auditLogs: InMemoryAuditLogRepository;
} {
  return { users: new InMemoryUserRepository(), auditLogs: new InMemoryAuditLogRepository() };
}

describe('seedFirstAdmin', () => {
  it('cria o primeiro admin com senha provisória quando não existe nenhum usuário', async () => {
    const repositories = buildRepositories();

    const result = await seedFirstAdmin(repositories, INPUT);

    expect(result.status).toBe('created');

    if (result.status !== 'created') {
      throw new Error('esperava um admin criado');
    }

    expect(result.user.email).toBe('admin@exemplo.local');
    expect(result.user.role).toBe(UserRole.admin);
    expect(result.user.isActive).toBe(true);
    expect(result.user.mustChangePassword).toBe(true);
    expect(result.temporaryPassword).toHaveLength(14);

    const stored = await repositories.users.findByEmail(INPUT.email);

    expect(stored).not.toBeNull();
    expect(stored?.role).toBe(UserRole.admin);
  });

  it('grava USER_CREATED na auditoria, sem a senha nos metadados', async () => {
    const repositories = buildRepositories();

    const result = await seedFirstAdmin(repositories, INPUT);
    const [entry] = repositories.auditLogs.entries;

    expect(repositories.auditLogs.entries).toHaveLength(1);
    expect(entry.action).toBe(AuditAction.USER_CREATED);
    expect(entry.email).toBe('admin@exemplo.local');
    expect(entry.actorId).toBeNull();
    expect(JSON.stringify(entry)).not.toContain(
      result.status === 'created' ? result.temporaryPassword : 'nunca',
    );
  });

  it('guarda só o hash bcrypt da senha provisória, nunca o texto puro (RN-13)', async () => {
    const repositories = buildRepositories();

    const result = await seedFirstAdmin(repositories, INPUT);

    if (result.status !== 'created') {
      throw new Error('esperava um admin criado');
    }

    const stored = await repositories.users.findByEmail(INPUT.email);

    expect(stored?.passwordHash).toBeDefined();
    expect(stored?.passwordHash).not.toBe(result.temporaryPassword);
    expect(await bcrypt.compare(result.temporaryPassword, stored?.passwordHash ?? '')).toBe(true);
    expect(Object.keys(result.user)).not.toContain('passwordHash');
  });

  it('devolve a senha provisória uma única vez: a segunda execução não a repete (RN-04)', async () => {
    const repositories = buildRepositories();

    const first = await seedFirstAdmin(repositories, INPUT);
    const second = await seedFirstAdmin(repositories, INPUT);

    expect(first.status).toBe('created');
    expect(second.status).toBe('skipped');
    expect(second).not.toHaveProperty('temporaryPassword');
    expect((await repositories.users.list()).length).toBe(1);
  });

  it('é idempotente: não cria nada quando já existe admin, e informa o motivo', async () => {
    const repositories = buildRepositories();

    await seedFirstAdmin(repositories, INPUT);
    repositories.auditLogs.entries.length = 0;

    const result = await seedFirstAdmin(repositories, { name: 'Outro', email: 'outro@exemplo.local' });

    if (result.status !== 'skipped') {
      throw new Error('esperava a execução ser pulada');
    }

    expect(result.reason).toMatch(/admin/i);
    expect(result.existingAdminEmail).toBe('admin@exemplo.local');
    expect(repositories.auditLogs.entries).toHaveLength(0);
    expect(await repositories.users.findByEmail('outro@exemplo.local')).toBeNull();
  });

  it('não cria nada quando o único admin existente está desativado', async () => {
    const repositories = buildRepositories();

    const created = await repositories.users.create({
      name: 'Admin antigo',
      email: 'antigo@exemplo.local',
      passwordHash: 'hash',
      role: UserRole.admin,
      isActive: false,
    });

    const result = await seedFirstAdmin(repositories, INPUT);

    expect(result.status).toBe('skipped');
    expect((await repositories.users.list()).map((user) => user.id)).toEqual([created.id]);
  });

  it('cria o admin mesmo quando já existem usuários de outros papéis', async () => {
    const repositories = buildRepositories();

    await repositories.users.create({
      name: 'Vendedor',
      email: 'vendedor@exemplo.local',
      passwordHash: 'hash',
      role: UserRole.vendedor,
    });

    const result = await seedFirstAdmin(repositories, INPUT);

    expect(result.status).toBe('created');
  });

  it('normaliza o e-mail: espaços nas bordas e maiúsculas', async () => {
    const repositories = buildRepositories();

    const result = await seedFirstAdmin(repositories, {
      name: '  Admin  ',
      email: '  Admin@Exemplo.Local  ',
    });

    if (result.status !== 'created') {
      throw new Error('esperava um admin criado');
    }

    expect(result.user.email).toBe('admin@exemplo.local');
    expect(result.user.name).toBe('Admin');
    expect(await repositories.users.findByEmail('ADMIN@EXEMPLO.LOCAL')).not.toBeNull();
  });

  it.each([
    ['ausente', undefined],
    ['vazio', '   '],
    ['sem arroba', 'admin.exemplo.local'],
    ['sem domínio', 'admin@'],
    ['com espaço no meio', 'ad min@exemplo.local'],
  ])('falha quando o e-mail é %s, sem criar usuário', async (_caso, email) => {
    const repositories = buildRepositories();

    await expect(seedFirstAdmin(repositories, { name: 'Admin', email })).rejects.toThrow(
      /SEED_ADMIN_EMAIL/,
    );
    expect(await repositories.users.list()).toHaveLength(0);
    expect(repositories.auditLogs.entries).toHaveLength(0);
  });

  it('usa um nome padrão quando o nome não é informado', async () => {
    const repositories = buildRepositories();

    const result = await seedFirstAdmin(repositories, { email: INPUT.email });

    if (result.status !== 'created') {
      throw new Error('esperava um admin criado');
    }

    expect(result.user.name.length).toBeGreaterThan(0);
  });
});
