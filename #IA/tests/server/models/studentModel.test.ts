import type { PrismaClient } from '@prisma/client';

import { createStudentModel, escapeLikePattern } from '@server/models/studentModel';

describe('escapeLikePattern', () => {
  it('escapa %, _ e \\ com barra invertida', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
    expect(escapeLikePattern('ana_maria')).toBe('ana\\_maria');
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
  });

  it('não altera termo sem curinga, inclusive com acento', () => {
    expect(escapeLikePattern('JOÃO da Silva')).toBe('JOÃO da Silva');
    expect(escapeLikePattern('')).toBe('');
  });
});

/** PrismaClient falso: só registra os argumentos que o model monta para o Prisma. */
function fakeClient() {
  const findMany = jest.fn().mockResolvedValue([]);
  const count = jest.fn().mockResolvedValue(0);
  const findFirst = jest.fn().mockResolvedValue(null);
  const client = {
    student: { findMany, count, findFirst },
    $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  };

  return { client: client as unknown as PrismaClient, findMany, count, findFirst };
}

const VENDEDOR_ID = '6f1c1c1e-1111-4a4a-9b9b-000000000001';

describe('studentModel', () => {
  it('usa o mesmo where (com o escopo do vendedor) na página e na contagem', async () => {
    const { client, findMany, count } = fakeClient();

    await createStudentModel(client).list({
      filter: { status: 'ativo', search: 'joão', assignedTo: VENDEDOR_ID },
      sortBy: 'name',
      order: 'asc',
      skip: 100,
      take: 100,
    });

    const expectedWhere = {
      status: 'ativo',
      assignedTo: VENDEDOR_ID,
      OR: [
        { name: { contains: 'joão', mode: 'insensitive' } },
        { email: { contains: 'joão', mode: 'insensitive' } },
      ],
    };

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: 100,
        take: 100,
        include: { assignedToUser: { select: { name: true } } },
      }),
    );
    expect(count).toHaveBeenCalledWith({ where: expectedWhere });
  });

  it('escapa os curingas % e _ (e a barra) da busca antes de mandar ao Prisma', async () => {
    const { client, findMany, count } = fakeClient();

    await createStudentModel(client).list({
      filter: { search: '100%_a\\b' },
      sortBy: 'name',
      order: 'asc',
      skip: 0,
      take: 10,
    });

    const expectedWhere = {
      OR: [
        { name: { contains: '100\\%\\_a\\\\b', mode: 'insensitive' } },
        { email: { contains: '100\\%\\_a\\\\b', mode: 'insensitive' } },
      ],
    };
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }));
    expect(count).toHaveBeenCalledWith({ where: expectedWhere });
  });

  it('sem filtros, o where fica vazio', async () => {
    const { client, findMany, count } = fakeClient();

    await createStudentModel(client).list({
      filter: {},
      sortBy: 'createdAt',
      order: 'desc',
      skip: 0,
      take: 50,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] }),
    );
    expect(count).toHaveBeenCalledWith({ where: {} });
  });

  it('o detalhe aplica o escopo no where e carrega compras, leads e tarefas', async () => {
    const { client, findFirst } = fakeClient();

    const result = await createStudentModel(client).findDetail('aluno-1', {
      assignedTo: VENDEDOR_ID,
    });

    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'aluno-1', assignedTo: VENDEDOR_ID },
      include: {
        assignedToUser: { select: { name: true } },
        purchases: {
          include: { course: { select: { id: true, name: true } } },
          orderBy: { purchaseDate: 'desc' },
        },
        pipelineLeads: { where: { assignedTo: VENDEDOR_ID }, orderBy: { createdAt: 'desc' } },
        tasks: { where: { assignedTo: VENDEDOR_ID }, orderBy: { dueDate: 'asc' } },
      },
    });
  });

  it('sem escopo (admin, CEO), leads e tarefas do detalhe vêm sem filtro de responsável', async () => {
    const { client, findFirst } = fakeClient();

    await createStudentModel(client).findDetail('aluno-1', {});

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'aluno-1' },
        include: expect.objectContaining({
          pipelineLeads: { orderBy: { createdAt: 'desc' } },
          tasks: { orderBy: { dueDate: 'asc' } },
        }),
      }),
    );
  });
});

describe('studentModel (escrita)', () => {
  function writeClient() {
    const record = { id: 'aluno-1' };
    const findFirst = jest.fn().mockResolvedValue(record);
    const findUnique = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockResolvedValue(record);
    const update = jest.fn().mockResolvedValue(record);
    const remove = jest.fn().mockResolvedValue(record);
    const client = { student: { findFirst, findUnique, create, update, delete: remove } };

    return {
      client: client as unknown as PrismaClient,
      findFirst,
      findUnique,
      create,
      update,
      remove,
    };
  }

  const include = { assignedToUser: { select: { name: true } } };

  it('findById aplica o escopo e traz o nome do responsável', async () => {
    const { client, findFirst } = writeClient();

    await createStudentModel(client).findById('aluno-1', { assignedTo: VENDEDOR_ID });

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'aluno-1', assignedTo: VENDEDOR_ID },
      include,
    });
  });

  it('findByEmail normaliza o e-mail; findByCpf busca pelos dígitos', async () => {
    const { client, findUnique } = writeClient();
    const model = createStudentModel(client);

    await model.findByEmail('  JOAO@X.com ');
    await model.findByCpf('52998224725');

    expect(findUnique).toHaveBeenNthCalledWith(1, { where: { email: 'joao@x.com' } });
    expect(findUnique).toHaveBeenNthCalledWith(2, { where: { cpf: '52998224725' } });
  });

  it('create grava o e-mail normalizado e devolve com o responsável', async () => {
    const { client, create } = writeClient();

    await createStudentModel(client).create({
      name: 'Maria',
      email: 'Maria@X.com',
      phone: null,
      cpf: '52998224725',
      status: 'ativo',
      notes: null,
      assignedTo: VENDEDOR_ID,
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Maria',
        email: 'maria@x.com',
        phone: null,
        cpf: '52998224725',
        status: 'ativo',
        notes: null,
        assignedTo: VENDEDOR_ID,
      },
      include,
    });
  });

  it('update envia só os campos informados, com o e-mail normalizado', async () => {
    const { client, update } = writeClient();

    await createStudentModel(client).update('aluno-1', { email: ' A@B.COM', cpf: null }, {});

    expect(update).toHaveBeenCalledWith({
      where: { id: 'aluno-1' },
      data: { email: 'a@b.com', cpf: null },
      include,
    });
  });

  it('S6-11: update leva o escopo do vendedor no where (conferir e gravar num passo só)', async () => {
    const { client, update } = writeClient();

    await createStudentModel(client).update(
      'aluno-1',
      { name: 'Novo' },
      { assignedTo: VENDEDOR_ID },
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 'aluno-1', assignedTo: VENDEDOR_ID },
      data: { name: 'Novo' },
      include,
    });
  });

  function deleteClient(overrides: { createAudit?: jest.Mock; findUniqueOrThrow?: jest.Mock } = {}) {
    const findUniqueOrThrow =
      overrides.findUniqueOrThrow ??
      jest.fn().mockResolvedValue({
        id: 'aluno-1',
        name: 'Maria',
        email: 'maria@x.com',
        _count: { purchases: 2, pipelineLeads: 1, tasks: 3 },
      });
    const remove = jest.fn().mockResolvedValue({ id: 'aluno-1' });
    const update = jest.fn();
    const createAudit = overrides.createAudit ?? jest.fn().mockResolvedValue({ id: 'log-1' });
    const tx = { student: { findUniqueOrThrow, delete: remove, update }, auditLog: { create: createAudit } };
    const $transaction = jest.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx));
    // Fora da transação nada pode ser usado: `student`/`auditLog` do client raiz não existem.
    const client = { $transaction } as unknown as PrismaClient;

    return { client, $transaction, findUniqueOrThrow, remove, update, createAudit };
  }

  const auditOf = jest.fn((snapshot: { id: string; cascade: object }) => ({
    action: 'STUDENT_DELETED' as const,
    actorId: 'admin-1',
    metadata: { student: { id: snapshot.id }, cascade: snapshot.cascade },
  }));

  it('TASK-009: snapshot, delete e auditoria na MESMA transação, nessa ordem', async () => {
    const { client, $transaction, findUniqueOrThrow, remove, update, createAudit } = deleteClient();

    await expect(createStudentModel(client).delete('aluno-1', auditOf)).resolves.toEqual({
      id: 'aluno-1',
      name: 'Maria',
      email: 'maria@x.com',
      cascade: { purchases: 2, pipelineLeads: 1, tasks: 3 },
    });

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'aluno-1' },
      select: {
        id: true,
        name: true,
        email: true,
        _count: { select: { purchases: true, pipelineLeads: true, tasks: true } },
      },
    });
    expect(remove).toHaveBeenCalledWith({ where: { id: 'aluno-1' } });
    expect(auditOf).toHaveBeenCalledWith({
      id: 'aluno-1',
      name: 'Maria',
      email: 'maria@x.com',
      cascade: { purchases: 2, pipelineLeads: 1, tasks: 3 },
    });
    expect(createAudit).toHaveBeenCalledWith({
      data: {
        action: 'STUDENT_DELETED',
        actorId: 'admin-1',
        targetUserId: null,
        email: null,
        ip: null,
        metadata: {
          student: { id: 'aluno-1' },
          cascade: { purchases: 2, pipelineLeads: 1, tasks: 3 },
        },
      },
    });
    const order = [findUniqueOrThrow, remove, createAudit].map(
      (mock) => mock.mock.invocationCallOrder[0] ?? 0,
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(update).not.toHaveBeenCalled();
  });

  it('TASK-009: falha ao gravar a auditoria sobe de dentro da transação (Prisma faz rollback)', async () => {
    const boom = new Error('auditoria falhou');
    const { client, remove } = deleteClient({ createAudit: jest.fn().mockRejectedValue(boom) });

    await expect(createStudentModel(client).delete('aluno-1', auditOf)).rejects.toBe(boom);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('TASK-009: delete de id inexistente deixa subir o erro sem apagar nem auditar', async () => {
    const notFound = Object.assign(new Error('No Student found'), { code: 'P2025' });
    const { client, remove, createAudit } = deleteClient({
      findUniqueOrThrow: jest.fn().mockRejectedValue(notFound),
    });

    await expect(createStudentModel(client).delete('x', auditOf)).rejects.toBe(notFound);
    expect(remove).not.toHaveBeenCalled();
    expect(createAudit).not.toHaveBeenCalled();
  });
});
