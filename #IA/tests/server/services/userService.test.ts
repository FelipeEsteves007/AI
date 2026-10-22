import { AuditAction, UserRole, type User } from '@prisma/client';

import { createUserService } from '@server/services/userService';
import { HttpError } from '@server/utils/httpError';
import { verifyPassword } from '@server/utils/password';

import {
  InMemoryAuditLogRepository,
  InMemoryUserRepository,
} from '../fakes/inMemoryRepositories';

const ACTOR_ID = 'actor-admin-id';

/** Monta o serviço com os fakes e devolve também os repositórios, para asserção. */
function buildService(seed: User[] = []) {
  const users = new InMemoryUserRepository(seed);
  const auditLogs = new InMemoryAuditLogRepository();
  const service = createUserService({ users, auditLogs });

  return { service, users, auditLogs };
}

/** Usuário já existente no banco, com todos os campos do schema. */
function existingUser(overrides: Partial<User> = {}): User {
  const now = new Date('2026-09-01T10:00:00.000Z');

  return {
    id: 'user-1',
    name: 'Usuário',
    email: 'usuario@x.com',
    passwordHash: 'hash-existente',
    role: UserRole.vendedor,
    isActive: true,
    mustChangePassword: false,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('userService', () => {
  describe('createUser', () => {
    it('cria o usuário com senha provisória, guardando só o hash (RN-04, RN-13)', async () => {
      const { service, users } = buildService();

      const { user, temporaryPassword } = await service.createUser(
        { name: 'Adriano', email: 'Adriano@Exemplo.com', role: UserRole.admin },
        ACTOR_ID,
      );

      expect(temporaryPassword).toEqual(expect.any(String));
      expect(temporaryPassword.length).toBeGreaterThanOrEqual(12);
      expect(user).toMatchObject({
        name: 'Adriano',
        email: 'adriano@exemplo.com',
        role: UserRole.admin,
        isActive: true,
        mustChangePassword: true,
      });

      const stored = await users.findById(user.id);

      expect(stored?.passwordHash).not.toBe(temporaryPassword);
      expect(await verifyPassword(temporaryPassword, stored?.passwordHash ?? '')).toBe(true);
    });

    it('não devolve passwordHash nem tokenVersion (RN-13)', async () => {
      const { service } = buildService();

      const { user } = await service.createUser(
        { name: 'CEO', email: 'ceo@x.com', role: UserRole.ceo },
        ACTOR_ID,
      );

      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('tokenVersion');
    });

    it('recusa e-mail já cadastrado, inclusive com caixa diferente (RN-01)', async () => {
      const { service } = buildService([existingUser({ email: 'admin@x.com' })]);

      await expect(
        service.createUser(
          { name: 'Outro', email: '  Admin@X.com ', role: UserRole.vendedor },
          ACTOR_ID,
        ),
      ).rejects.toMatchObject({ status: 409, code: 'EMAIL_IN_USE' });
    });

    it('não cria o usuário quando o e-mail já existe', async () => {
      const { service, users, auditLogs } = buildService([existingUser({ email: 'admin@x.com' })]);

      await expect(
        service.createUser({ name: 'Outro', email: 'ADMIN@X.COM', role: UserRole.ceo }, ACTOR_ID),
      ).rejects.toBeInstanceOf(HttpError);

      expect(await users.list()).toHaveLength(1);
      expect(auditLogs.entries).toHaveLength(0);
    });

    it('grava USER_CREATED na auditoria com o ator e sem a senha em texto puro (RN-14)', async () => {
      const { service, auditLogs } = buildService();

      const { user, temporaryPassword } = await service.createUser(
        { name: 'Vendedor', email: 'vendedor@x.com', role: UserRole.vendedor },
        ACTOR_ID,
      );

      expect(auditLogs.entries).toHaveLength(1);
      expect(auditLogs.entries[0]).toMatchObject({
        action: AuditAction.USER_CREATED,
        actorId: ACTOR_ID,
        targetUserId: user.id,
        email: 'vendedor@x.com',
      });
      expect(JSON.stringify(auditLogs.entries[0])).not.toContain(temporaryPassword);
    });
  });

  describe('listUsers', () => {
    it('devolve os usuários públicos, sem passwordHash nem tokenVersion (RN-13)', async () => {
      const { service } = buildService([
        existingUser({ id: 'user-1', email: 'a@x.com' }),
        existingUser({ id: 'user-2', email: 'b@x.com', role: UserRole.admin }),
      ]);

      const list = await service.listUsers();

      expect(list).toHaveLength(2);
      list.forEach((user) => {
        expect(user).not.toHaveProperty('passwordHash');
        expect(user).not.toHaveProperty('tokenVersion');
      });
      expect(list.map((user) => user.email)).toEqual(['a@x.com', 'b@x.com']);
    });

    it('devolve lista vazia quando não há usuários', async () => {
      const { service } = buildService();

      await expect(service.listUsers()).resolves.toEqual([]);
    });
  });

  describe('updateUser', () => {
    it('recusa id inexistente com 404', async () => {
      const { service } = buildService();

      await expect(
        service.updateUser('nao-existe', { name: 'Novo' }, ACTOR_ID),
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    it('altera o nome sem gravar auditoria de papel ou estado', async () => {
      const { service, auditLogs } = buildService([existingUser()]);

      const updated = await service.updateUser('user-1', { name: 'Nome Novo' }, ACTOR_ID);

      expect(updated.name).toBe('Nome Novo');
      expect(updated).not.toHaveProperty('passwordHash');
      expect(auditLogs.entries).toHaveLength(0);
    });

    it('grava USER_ROLE_CHANGED ao trocar o papel (RN-14)', async () => {
      const { service, auditLogs } = buildService([existingUser()]);

      const updated = await service.updateUser('user-1', { role: UserRole.ceo }, ACTOR_ID);

      expect(updated.role).toBe(UserRole.ceo);
      expect(auditLogs.entries).toHaveLength(1);
      expect(auditLogs.entries[0]).toMatchObject({
        action: AuditAction.USER_ROLE_CHANGED,
        actorId: ACTOR_ID,
        targetUserId: 'user-1',
        metadata: { from: UserRole.vendedor, to: UserRole.ceo },
      });
    });

    it('não grava USER_ROLE_CHANGED quando o papel enviado é o mesmo', async () => {
      const { service, auditLogs } = buildService([existingUser()]);

      await service.updateUser('user-1', { role: UserRole.vendedor }, ACTOR_ID);

      expect(auditLogs.entries).toHaveLength(0);
    });

    it('desativa incrementando tokenVersion e grava USER_DEACTIVATED (RN-09)', async () => {
      const { service, users, auditLogs } = buildService([existingUser({ tokenVersion: 3 })]);

      const updated = await service.updateUser('user-1', { isActive: false }, ACTOR_ID);

      expect(updated.isActive).toBe(false);
      expect((await users.findById('user-1'))?.tokenVersion).toBe(4);
      expect(auditLogs.entries).toHaveLength(1);
      expect(auditLogs.entries[0]).toMatchObject({
        action: AuditAction.USER_DEACTIVATED,
        actorId: ACTOR_ID,
        targetUserId: 'user-1',
      });
    });

    it('reativa sem mexer no tokenVersion e grava USER_REACTIVATED', async () => {
      const { service, users, auditLogs } = buildService([
        existingUser({ isActive: false, tokenVersion: 4 }),
      ]);

      const updated = await service.updateUser('user-1', { isActive: true }, ACTOR_ID);

      expect(updated.isActive).toBe(true);
      expect((await users.findById('user-1'))?.tokenVersion).toBe(4);
      expect(auditLogs.entries).toHaveLength(1);
      expect(auditLogs.entries[0]).toMatchObject({
        action: AuditAction.USER_REACTIVATED,
        targetUserId: 'user-1',
      });
    });

    it('não grava auditoria de estado quando isActive não muda', async () => {
      const { service, users, auditLogs } = buildService([existingUser({ tokenVersion: 2 })]);

      await service.updateUser('user-1', { isActive: true }, ACTOR_ID);

      expect((await users.findById('user-1'))?.tokenVersion).toBe(2);
      expect(auditLogs.entries).toHaveLength(0);
    });

    it('grava as duas entradas quando troca papel e desativa na mesma chamada', async () => {
      const { service, auditLogs } = buildService([
        existingUser({ id: 'admin-1', role: UserRole.admin, email: 'admin@x.com' }),
        existingUser({ id: 'admin-2', role: UserRole.admin, email: 'admin2@x.com' }),
      ]);

      await service.updateUser('admin-2', { role: UserRole.ceo, isActive: false }, ACTOR_ID);

      expect(auditLogs.entries.map((entry) => entry.action)).toEqual([
        AuditAction.USER_ROLE_CHANGED,
        AuditAction.USER_DEACTIVATED,
      ]);
    });

    describe('último admin ativo (RN-12)', () => {
      const soAdmin = () => [
        existingUser({ id: 'admin-1', role: UserRole.admin, email: 'admin@x.com' }),
        existingUser({ id: 'user-2', role: UserRole.vendedor, email: 'v@x.com' }),
      ];

      const doisAdmins = () => [
        existingUser({ id: 'admin-1', role: UserRole.admin, email: 'admin@x.com' }),
        existingUser({ id: 'admin-2', role: UserRole.admin, email: 'admin2@x.com' }),
      ];

      it('recusa desativar o último admin ativo', async () => {
        const { service, users, auditLogs } = buildService(soAdmin());

        await expect(
          service.updateUser('admin-1', { isActive: false }, ACTOR_ID),
        ).rejects.toMatchObject({ status: 409, code: 'LAST_ADMIN' });

        expect((await users.findById('admin-1'))?.isActive).toBe(true);
        expect(auditLogs.entries).toHaveLength(0);
      });

      it('recusa rebaixar o último admin ativo', async () => {
        const { service, users } = buildService(soAdmin());

        await expect(
          service.updateUser('admin-1', { role: UserRole.ceo }, ACTOR_ID),
        ).rejects.toMatchObject({ status: 409, code: 'LAST_ADMIN' });

        expect((await users.findById('admin-1'))?.role).toBe(UserRole.admin);
      });

      it('permite desativar um admin quando existem dois admins ativos', async () => {
        const { service } = buildService(doisAdmins());

        const updated = await service.updateUser('admin-2', { isActive: false }, ACTOR_ID);

        expect(updated.isActive).toBe(false);
      });

      it('permite rebaixar um admin quando existem dois admins ativos', async () => {
        const { service } = buildService(doisAdmins());

        const updated = await service.updateUser('admin-2', { role: UserRole.vendedor }, ACTOR_ID);

        expect(updated.role).toBe(UserRole.vendedor);
      });

      it('permite atualizar o último admin sem mexer em papel nem em isActive', async () => {
        const { service } = buildService(soAdmin());

        const updated = await service.updateUser('admin-1', { name: 'Adriano' }, ACTOR_ID);

        expect(updated).toMatchObject({ name: 'Adriano', role: UserRole.admin, isActive: true });
      });

      it('permite reativar um admin desativado mesmo sem outro admin ativo', async () => {
        const { service } = buildService([
          existingUser({
            id: 'admin-1',
            role: UserRole.admin,
            email: 'admin@x.com',
            isActive: false,
          }),
        ]);

        const updated = await service.updateUser('admin-1', { isActive: true }, ACTOR_ID);

        expect(updated.isActive).toBe(true);
      });
    });
  });

  describe('resetPassword', () => {
    it('gera nova senha provisória, exige troca e derruba as sessões (RN-04, RN-10)', async () => {
      const { service, users } = buildService([
        existingUser({ mustChangePassword: false, tokenVersion: 2 }),
      ]);

      const { user, temporaryPassword } = await service.resetPassword('user-1', ACTOR_ID);

      expect(temporaryPassword).toEqual(expect.any(String));
      expect(user).toMatchObject({ id: 'user-1', mustChangePassword: true });
      expect(user).not.toHaveProperty('passwordHash');

      const stored = await users.findById('user-1');

      expect(stored?.tokenVersion).toBe(3);
      expect(stored?.passwordHash).not.toBe('hash-existente');
      expect(await verifyPassword(temporaryPassword, stored?.passwordHash ?? '')).toBe(true);
    });

    it('grava PASSWORD_RESET sem a senha em texto puro (RN-14)', async () => {
      const { service, auditLogs } = buildService([existingUser()]);

      const { temporaryPassword } = await service.resetPassword('user-1', ACTOR_ID);

      expect(auditLogs.entries).toHaveLength(1);
      expect(auditLogs.entries[0]).toMatchObject({
        action: AuditAction.PASSWORD_RESET,
        actorId: ACTOR_ID,
        targetUserId: 'user-1',
        email: 'usuario@x.com',
      });
      expect(JSON.stringify(auditLogs.entries[0])).not.toContain(temporaryPassword);
    });

    it('recusa id inexistente com 404', async () => {
      const { service, auditLogs } = buildService();

      await expect(service.resetPassword('nao-existe', ACTOR_ID)).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
      expect(auditLogs.entries).toHaveLength(0);
    });
  });
});
