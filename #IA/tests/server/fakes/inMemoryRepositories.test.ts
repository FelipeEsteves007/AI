import { randomUUID } from 'node:crypto';

import { AuditAction, Prisma, UserRole } from '@prisma/client';

import {
  makeCourse,
  makeLead,
  makePurchase,
  makeStudent,
  makeTask,
} from '../helpers/studentFixture';
import { makeUser } from '../helpers/userFixture';
import {
  InMemoryAuditLogRepository,
  InMemoryStudentRepository,
  InMemoryUserRepository,
} from './inMemoryRepositories';

describe('InMemoryUserRepository', () => {
  it('cria o usuário com os padrões do schema e devolve o registro completo', async () => {
    const users = new InMemoryUserRepository();

    const created = await users.create({
      name: 'Adriano',
      email: 'adriano@exemplo.com',
      passwordHash: 'hash-1',
      role: UserRole.admin,
    });

    expect(created.id).toEqual(expect.any(String));
    expect(created.isActive).toBe(true);
    expect(created.mustChangePassword).toBe(true);
    expect(created.tokenVersion).toBe(0);
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(await users.findById(created.id)).toEqual(created);
  });

  it('não distingue maiúsculas de minúsculas no e-mail (RN-01)', async () => {
    const users = new InMemoryUserRepository();
    const created = await users.create({
      name: 'Adriano',
      email: 'Admin@X.com',
      passwordHash: 'hash-1',
      role: UserRole.admin,
    });

    expect(created.email).toBe('admin@x.com');
    expect(await users.findByEmail('admin@x.com')).toEqual(created);
    expect(await users.findByEmail('  ADMIN@X.COM ')).toEqual(created);
    expect(await users.findByEmail('outro@x.com')).toBeNull();
  });

  it('devolve null ao buscar id inexistente', async () => {
    const users = new InMemoryUserRepository();

    expect(await users.findById('nao-existe')).toBeNull();
  });

  it('atualiza só os campos informados e lista todos os usuários', async () => {
    const users = new InMemoryUserRepository();
    const created = await users.create({
      name: 'Vendedor',
      email: 'vendedor@x.com',
      passwordHash: 'hash-1',
      role: UserRole.vendedor,
    });

    const updated = await users.update(created.id, {
      role: UserRole.ceo,
      isActive: false,
      tokenVersion: 1,
    });

    expect(updated.name).toBe('Vendedor');
    expect(updated.role).toBe(UserRole.ceo);
    expect(updated.isActive).toBe(false);
    expect(updated.tokenVersion).toBe(1);
    expect(await users.list()).toEqual([updated]);
  });

  it('conta apenas os admins ativos (RN-12)', async () => {
    const users = new InMemoryUserRepository();
    const admin = await users.create({
      name: 'Admin 1',
      email: 'a1@x.com',
      passwordHash: 'h',
      role: UserRole.admin,
    });
    await users.create({
      name: 'Admin 2',
      email: 'a2@x.com',
      passwordHash: 'h',
      role: UserRole.admin,
    });
    await users.create({
      name: 'CEO',
      email: 'ceo@x.com',
      passwordHash: 'h',
      role: UserRole.ceo,
    });

    expect(await users.countActiveAdmins()).toBe(2);

    await users.update(admin.id, { isActive: false });

    expect(await users.countActiveAdmins()).toBe(1);
  });
});

describe('InMemoryAuditLogRepository', () => {
  const email = 'Admin@X.com';

  it('registra a entrada e conta as falhas de login dentro da janela', async () => {
    const audit = new InMemoryAuditLogRepository();
    const now = new Date('2026-09-12T12:00:00.000Z');
    const since = new Date(now.getTime() - 15 * 60 * 1000);

    await audit.record({
      action: AuditAction.LOGIN_FAILURE,
      email,
      ip: '127.0.0.1',
      createdAt: new Date('2026-09-12T11:40:00.000Z'),
    });
    await audit.record({
      action: AuditAction.LOGIN_FAILURE,
      email,
      createdAt: new Date('2026-09-12T11:50:00.000Z'),
    });
    await audit.record({
      action: AuditAction.LOGIN_FAILURE,
      email: 'outro@x.com',
      createdAt: new Date('2026-09-12T11:55:00.000Z'),
    });
    await audit.record({
      action: AuditAction.LOGIN_SUCCESS,
      email,
      createdAt: new Date('2026-09-12T11:58:00.000Z'),
    });

    expect(await audit.countFailedLoginsSince(email, since)).toBe(1);
    expect(await audit.countFailedLoginsSince('ADMIN@x.com', since)).toBe(1);
    expect(await audit.countFailedLoginsSince(email, now)).toBe(0);
  });

  it('devolve a data do último login bem-sucedido, sem distinguir caixa (RN-07)', async () => {
    const audit = new InMemoryAuditLogRepository();

    expect(await audit.findLastSuccessfulLoginAt(email)).toBeNull();

    await audit.record({
      action: AuditAction.LOGIN_SUCCESS,
      email,
      createdAt: new Date('2026-09-12T10:00:00.000Z'),
    });
    await audit.record({
      action: AuditAction.LOGIN_SUCCESS,
      email: 'admin@x.com',
      createdAt: new Date('2026-09-12T11:00:00.000Z'),
    });
    await audit.record({
      action: AuditAction.LOGIN_SUCCESS,
      email: 'outro@x.com',
      createdAt: new Date('2026-09-12T11:30:00.000Z'),
    });

    expect(await audit.findLastSuccessfulLoginAt('ADMIN@X.COM')).toEqual(
      new Date('2026-09-12T11:00:00.000Z'),
    );
  });

  it('guarda as entradas registradas para inspeção nos testes', async () => {
    const audit = new InMemoryAuditLogRepository();

    await audit.record({ action: AuditAction.USER_CREATED, actorId: 'a', targetUserId: 'b' });

    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      action: AuditAction.USER_CREATED,
      actorId: 'a',
      targetUserId: 'b',
    });
    expect(audit.entries[0]?.createdAt).toBeInstanceOf(Date);
  });
});

/** Builder de auditoria mínimo, como o serviço passa ao `delete`. */
const auditOf = (snapshot: { id: string }) => ({
  action: AuditAction.STUDENT_DELETED,
  actorId: 'ator-1',
  metadata: { studentId: snapshot.id },
});

describe('InMemoryStudentRepository (escrita e exclusão)', () => {
  const ana = makeUser({ name: 'Ana', email: 'ana@x.com', role: UserRole.vendedor });
  const bruno = makeUser({ name: 'Bruno', email: 'bruno@x.com', role: UserRole.vendedor });

  function isP2025(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }

  it('S6-11: update fora do escopo lança P2025 e não grava', async () => {
    const aluno = makeStudent({ name: 'Do Bruno', assignedTo: bruno.id });
    const repository = new InMemoryStudentRepository({ students: [aluno], users: [ana, bruno] });

    const error = await repository
      .update(aluno.id, { name: 'Invasão' }, { assignedTo: ana.id })
      .catch((e: unknown) => e);

    expect(isP2025(error)).toBe(true);
    expect((await repository.findById(aluno.id, {}))?.name).toBe('Do Bruno');
  });

  it('S6-11: update de id inexistente lança P2025', async () => {
    const repository = new InMemoryStudentRepository();

    const error = await repository.update(randomUUID(), { name: 'X' }, {}).catch((e: unknown) => e);

    expect(isP2025(error)).toBe(true);
  });

  it('delete de id inexistente lança P2025', async () => {
    const repository = new InMemoryStudentRepository();

    expect(isP2025(await repository.delete(randomUUID(), auditOf).catch((e: unknown) => e))).toBe(true);
  });

  it('delete leva junto compras, leads e tarefas do aluno; os de outros ficam', async () => {
    const course = makeCourse();
    const excluido = makeStudent({ assignedTo: ana.id });
    const outro = makeStudent({ assignedTo: bruno.id });
    const repository = new InMemoryStudentRepository({
      students: [excluido, outro],
      users: [ana, bruno],
      courses: [course],
      purchases: [
        makePurchase({ studentId: excluido.id, courseId: course.id }),
        makePurchase({ studentId: outro.id, courseId: course.id }),
      ],
      pipelineLeads: [
        makeLead({ studentId: excluido.id, assignedTo: ana.id }),
        makeLead({ studentId: outro.id, assignedTo: bruno.id }),
      ],
      tasks: [
        makeTask({ assignedTo: ana.id, relatedTo: excluido.id }),
        makeTask({ assignedTo: bruno.id, relatedTo: outro.id }),
        makeTask({ assignedTo: ana.id, relatedTo: null }),
      ],
    });

    const deleted = await repository.delete(excluido.id, auditOf);

    expect(deleted).toEqual({
      id: excluido.id,
      name: excluido.name,
      email: excluido.email,
      cascade: { purchases: 1, pipelineLeads: 1, tasks: 1 },
    });
    expect(await repository.findById(excluido.id, {})).toBeNull();
    expect(repository.snapshot()).toMatchObject({
      purchases: [expect.objectContaining({ studentId: outro.id })],
      pipelineLeads: [expect.objectContaining({ studentId: outro.id })],
      tasks: [
        expect.objectContaining({ relatedTo: outro.id }),
        expect.objectContaining({ relatedTo: null }),
      ],
    });
    expect(repository.snapshot().purchases).toHaveLength(1);
    expect(repository.snapshot().pipelineLeads).toHaveLength(1);
    expect(repository.snapshot().tasks).toHaveLength(2);
    expect(repository.snapshot().courses).toHaveLength(1);
  });

  it('delete grava a auditoria montada pelo builder, com o snapshot, no repositório ligado', async () => {
    const auditLogs = new InMemoryAuditLogRepository();
    const aluno = makeStudent();
    const repository = new InMemoryStudentRepository({ students: [aluno] }, auditLogs);

    await repository.delete(aluno.id, auditOf);

    expect(auditLogs.entries).toEqual([
      expect.objectContaining({
        action: AuditAction.STUDENT_DELETED,
        actorId: 'ator-1',
        metadata: { studentId: aluno.id },
      }),
    ]);
  });

  it('delete: se a auditoria falhar, nada é apagado (como o rollback da transação)', async () => {
    const auditLogs = new InMemoryAuditLogRepository();
    const course = makeCourse();
    const aluno = makeStudent();
    const repository = new InMemoryStudentRepository(
      {
        students: [aluno],
        courses: [course],
        purchases: [makePurchase({ studentId: aluno.id, courseId: course.id })],
        tasks: [makeTask({ assignedTo: 'u', relatedTo: aluno.id })],
      },
      auditLogs,
    );
    const antes = repository.snapshot();
    jest.spyOn(auditLogs, 'record').mockRejectedValueOnce(new Error('falhou'));

    await expect(repository.delete(aluno.id, auditOf)).rejects.toThrow('falhou');

    expect(repository.snapshot()).toEqual(antes);
  });

  it('delete sem repositório de auditoria informado usa um próprio, exposto em `auditLogs`', async () => {
    const aluno = makeStudent();
    const repository = new InMemoryStudentRepository({ students: [aluno] });

    await repository.delete(aluno.id, auditOf);

    expect(repository.auditLogs).toBeInstanceOf(InMemoryAuditLogRepository);
    expect((repository.auditLogs as InMemoryAuditLogRepository).entries).toHaveLength(1);
  });
});
