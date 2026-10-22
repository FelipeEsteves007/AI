/**
 * Integração do `studentModel` contra o Postgres real (`.env.test`, banco `*_test`).
 *
 * O fake em memória prova o fake; aqui ficam os comportamentos que só o banco decide: `ILIKE`
 * com acento, collation na ordenação, curingas na busca, `P2025` no update com escopo e a
 * cascata do DELETE.
 *
 * Isolamento: cada execução usa uma etiqueta única (`tag`) nos usuários, alunos e cursos que
 * cria, lista sempre dentro do escopo dos próprios vendedores e apaga só o que criou.
 */

import { randomUUID } from 'node:crypto';

import { AuditAction, Prisma, PrismaClient, type StudentStatus } from '@prisma/client';

import { createStudentModel } from '@server/models/studentModel';
import type { AuditLogEntry } from '@server/types/auth';
import type {
  CreateStudentData,
  StudentDeletionSnapshot,
  StudentRepository,
} from '@server/types/students';

import { assertTestDatabase } from '../../setup/testDatabase';

// Trava antes de abrir qualquer conexão.
assertTestDatabase(process.env.DATABASE_URL);

const tag = `it${randomUUID().replace(/-/g, '').slice(0, 10)}`;
const client = new PrismaClient();
const model: StudentRepository = createStudentModel(client);

let vendedorA: string;
let vendedorB: string;
let courseId: string;
let emailSeq = 0;

/** Builder de auditoria como o serviço monta: ator = vendedor A (limpo no `afterAll`). */
function auditOf(snapshot: StudentDeletionSnapshot): AuditLogEntry {
  return {
    action: AuditAction.STUDENT_DELETED,
    actorId: vendedorA,
    metadata: {
      student: { id: snapshot.id, name: snapshot.name, email: snapshot.email },
      cascade: snapshot.cascade,
    },
  };
}

async function createUser(label: string): Promise<string> {
  const user = await client.user.create({
    data: {
      name: `Vendedor ${label} ${tag}`,
      email: `${tag}-${label}@integration.test`,
      passwordHash: 'hash-irrelevante-para-o-model',
      role: 'vendedor',
    },
  });
  return user.id;
}

function studentData(name: string, overrides: Partial<CreateStudentData> = {}): CreateStudentData {
  emailSeq += 1;
  return {
    name,
    email: `${tag}-aluno${emailSeq}@integration.test`,
    phone: null,
    cpf: null,
    status: 'ativo' as StudentStatus,
    notes: null,
    assignedTo: vendedorA,
    ...overrides,
  };
}

function listNames(filter: { search?: string; assignedTo?: string }, order: 'asc' | 'desc' = 'asc') {
  return model
    .list({ filter, sortBy: 'name', order, skip: 0, take: 100 })
    .then(({ rows, total }) => ({ names: rows.map((row) => row.name), total }));
}

beforeAll(async () => {
  vendedorA = await createUser('a');
  vendedorB = await createUser('b');
  const course = await client.course.create({
    data: { name: `Curso ${tag}`, price: new Prisma.Decimal('497.00') },
  });
  courseId = course.id;
});

afterAll(async () => {
  try {
    const userIds = [vendedorA, vendedorB].filter(Boolean);
    await client.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    // Alunos primeiro: a cascata leva compras, leads e tarefas ligados a eles.
    await client.student.deleteMany({
      where: { OR: [{ assignedTo: { in: userIds } }, { email: { startsWith: `${tag}-` } }] },
    });
    await client.task.deleteMany({ where: { assignedTo: { in: userIds } } });
    await client.pipelineLead.deleteMany({ where: { assignedTo: { in: userIds } } });
    await client.course.deleteMany({ where: { name: { endsWith: tag } } });
    await client.user.deleteMany({ where: { id: { in: userIds } } });
  } finally {
    await client.$disconnect();
  }
});

describe('studentModel (Postgres real)', () => {
  describe('busca ILIKE com acento', () => {
    let vendedor: string;

    beforeAll(async () => {
      vendedor = await createUser('acento');
      await model.create(studentData(`joão pedro ${tag}`, { assignedTo: vendedor }));
      await model.create(studentData(`MARIA JOÃO ${tag}`, { assignedTo: vendedor }));
      await model.create(studentData(`Joao Sem Acento ${tag}`, { assignedTo: vendedor }));
      await model.create(studentData(`Carlos ${tag}`, { assignedTo: vendedor }));
    });

    afterAll(async () => {
      await client.student.deleteMany({ where: { assignedTo: vendedor } });
      await client.user.delete({ where: { id: vendedor } });
    });

    it('"JOÃO" casa "joão" e "JOÃO" sem diferenciar maiúsculas, inclusive no caractere acentuado', async () => {
      const { names, total } = await listNames({ search: 'JOÃO', assignedTo: vendedor });

      expect(names).toEqual([`joão pedro ${tag}`, `MARIA JOÃO ${tag}`]);
      expect(total).toBe(2);
    });

    it('"joão" em minúsculas devolve o mesmo resultado', async () => {
      const { names } = await listNames({ search: 'joão', assignedTo: vendedor });

      expect(names).toEqual([`joão pedro ${tag}`, `MARIA JOÃO ${tag}`]);
    });

    it('não ignora acento: "joao" não casa "joão" (sem unaccent)', async () => {
      const { names } = await listNames({ search: 'joao', assignedTo: vendedor });

      expect(names).toEqual([`Joao Sem Acento ${tag}`]);
    });

    it('também busca no e-mail, sem diferenciar maiúsculas', async () => {
      const carlos = await client.student.findFirstOrThrow({
        where: { assignedTo: vendedor, name: `Carlos ${tag}` },
      });

      const { names } = await listNames({
        search: carlos.email.toUpperCase(),
        assignedTo: vendedor,
      });

      expect(names).toEqual([`Carlos ${tag}`]);
    });

    it('busca sem resultado devolve página vazia e total 0', async () => {
      const { names, total } = await listNames({ search: 'ninguém-com-este-nome', assignedTo: vendedor });

      expect(names).toEqual([]);
      expect(total).toBe(0);
    });
  });

  describe('ordenação por nome', () => {
    let vendedor: string;

    beforeAll(async () => {
      vendedor = await createUser('ordem');
      for (const name of ['Zeca', 'bruno', 'Álvaro', 'Ana', 'álvaro']) {
        await model.create(studentData(name, { assignedTo: vendedor }));
      }
    });

    afterAll(async () => {
      await client.student.deleteMany({ where: { assignedTo: vendedor } });
      await client.user.delete({ where: { id: vendedor } });
    });

    it('o banco de teste usa collation en_US (premissa dos testes de busca e ordem)', async () => {
      const [{ collation }] = await client.$queryRaw<{ collation: string }[]>`
        SELECT datcollate AS collation FROM pg_database WHERE datname = current_database()`;

      expect(collation).toMatch(/^en_US/i);
    });

    it('asc segue a collation do banco, não a ordem de bytes', async () => {
      const { names } = await listNames({ assignedTo: vendedor }, 'asc');
      const byDatabase = await client.$queryRaw<{ name: string }[]>`
        SELECT name FROM "Students" WHERE "assignedTo" = ${vendedor} ORDER BY name ASC, id ASC`;

      expect(names).toEqual(byDatabase.map((row) => row.name));
      // Em ordem de bytes (collation C) seria Ana, Zeca, bruno, Álvaro, álvaro.
      expect(names.slice(0, 3).map((name) => name.toLowerCase())).toEqual(['álvaro', 'álvaro', 'ana']);
      expect(names.slice(3)).toEqual(['bruno', 'Zeca']);
    });

    it('desc é o inverso da ordem do banco', async () => {
      const { names } = await listNames({ assignedTo: vendedor }, 'desc');

      expect(names[0]).toBe('Zeca');
      expect(names[1]).toBe('bruno');
      expect(names.slice(2).map((name) => name.toLowerCase())).toEqual(['ana', 'álvaro', 'álvaro']);
    });

    it('paginação: total conta o filtro inteiro e as páginas não repetem aluno', async () => {
      const first = await model.list({
        filter: { assignedTo: vendedor },
        sortBy: 'name',
        order: 'asc',
        skip: 0,
        take: 2,
      });
      const second = await model.list({
        filter: { assignedTo: vendedor },
        sortBy: 'name',
        order: 'asc',
        skip: 2,
        take: 2,
      });
      const third = await model.list({
        filter: { assignedTo: vendedor },
        sortBy: 'name',
        order: 'asc',
        skip: 4,
        take: 2,
      });

      expect([first.total, second.total, third.total]).toEqual([5, 5, 5]);
      const ids = [...first.rows, ...second.rows, ...third.rows].map((row) => row.id);
      expect(new Set(ids).size).toBe(5);
    });
  });

  describe('curingas % e _ na busca', () => {
    let vendedor: string;

    beforeAll(async () => {
      vendedor = await createUser('curinga');
      await model.create(studentData(`Desconto 100% ${tag}`, { assignedTo: vendedor }));
      await model.create(studentData(`Desconto 1000 ${tag}`, { assignedTo: vendedor }));
      await model.create(studentData(`ana_maria ${tag}`, { assignedTo: vendedor }));
      await model.create(studentData(`anaXmaria ${tag}`, { assignedTo: vendedor }));
    });

    afterAll(async () => {
      await client.student.deleteMany({ where: { assignedTo: vendedor } });
      await client.user.delete({ where: { id: vendedor } });
    });

    it('"%" é literal: "100%" não casa "1000"', async () => {
      const { names } = await listNames({ search: '100%', assignedTo: vendedor });

      expect(names).toEqual([`Desconto 100% ${tag}`]);
    });

    it('"%" sozinho não vira "tudo"', async () => {
      const { names } = await listNames({ search: '%', assignedTo: vendedor });

      expect(names).toEqual([`Desconto 100% ${tag}`]);
    });

    it('"_" é literal: "ana_maria" não casa "anaXmaria"', async () => {
      const { names } = await listNames({ search: 'ana_maria', assignedTo: vendedor });

      expect(names).toEqual([`ana_maria ${tag}`]);
    });

    it('"\\" é literal: "a\\b" casa só o nome com barra', async () => {
      await model.create(studentData(`dir a\\b ${tag}`, { assignedTo: vendedor }));
      await model.create(studentData(`dir ab ${tag}`, { assignedTo: vendedor }));

      const { names } = await listNames({ search: 'a\\b', assignedTo: vendedor });

      expect(names).toEqual([`dir a\\b ${tag}`]);
    });
  });

  describe('escopo do vendedor', () => {
    let alunoDoA: string;
    let alunoDoB: string;

    beforeAll(async () => {
      alunoDoA = (await model.create(studentData(`Escopo Aluno A ${tag}`, { assignedTo: vendedorA }))).id;
      alunoDoB = (await model.create(studentData(`Escopo Aluno B ${tag}`, { assignedTo: vendedorB }))).id;
    });

    it('list com escopo devolve só os alunos do vendedor, e o total conta só os dele', async () => {
      const { names, total } = await listNames({ search: `Escopo Aluno`, assignedTo: vendedorA });

      expect(names).toEqual([`Escopo Aluno A ${tag}`]);
      expect(total).toBe(1);
    });

    it('list sem escopo (admin/CEO) vê os alunos dos dois vendedores', async () => {
      const { names } = await listNames({ search: `Escopo Aluno` });

      expect(names).toEqual(expect.arrayContaining([`Escopo Aluno A ${tag}`, `Escopo Aluno B ${tag}`]));
    });

    it('findById e findDetail devolvem null para aluno de outro vendedor', async () => {
      await expect(model.findById(alunoDoB, { assignedTo: vendedorA })).resolves.toBeNull();
      await expect(model.findDetail(alunoDoB, { assignedTo: vendedorA })).resolves.toBeNull();
    });

    it('findById dentro do escopo devolve o aluno com o nome do responsável', async () => {
      const found = await model.findById(alunoDoA, { assignedTo: vendedorA });

      expect(found).toMatchObject({ id: alunoDoA, assignedToUser: { name: `Vendedor a ${tag}` } });
    });

    it('findDetail do vendedor não expõe leads e tarefas de outro vendedor no mesmo aluno (S6-9)', async () => {
      await client.pipelineLead.createMany({
        data: [
          { studentId: alunoDoA, assignedTo: vendedorA },
          { studentId: alunoDoA, assignedTo: vendedorB },
        ],
      });
      await client.task.createMany({
        data: [
          { title: `Tarefa A ${tag}`, assignedTo: vendedorA, relatedTo: alunoDoA, relatedType: 'student', dueDate: new Date() },
          { title: `Tarefa B ${tag}`, assignedTo: vendedorB, relatedTo: alunoDoA, relatedType: 'student', dueDate: new Date() },
        ],
      });

      const scoped = await model.findDetail(alunoDoA, { assignedTo: vendedorA });
      const unscoped = await model.findDetail(alunoDoA, {});

      expect(scoped?.pipelineLeads.map((lead) => lead.assignedTo)).toEqual([vendedorA]);
      expect(scoped?.tasks.map((task) => task.title)).toEqual([`Tarefa A ${tag}`]);
      expect(unscoped?.pipelineLeads).toHaveLength(2);
      expect(unscoped?.tasks).toHaveLength(2);
    });

    it('findDetail de id inexistente devolve null', async () => {
      await expect(model.findDetail(randomUUID(), {})).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('fora do escopo lança P2025 e não altera o aluno', async () => {
      const aluno = await model.create(studentData(`Update Alvo ${tag}`, { assignedTo: vendedorB }));

      const error: unknown = await model
        .update(aluno.id, { name: 'Invadido' }, { assignedTo: vendedorA })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect(error).toMatchObject({ code: 'P2025' });
      const inDatabase = await client.student.findUniqueOrThrow({ where: { id: aluno.id } });
      expect(inDatabase.name).toBe(`Update Alvo ${tag}`);
    });

    it('id inexistente lança P2025', async () => {
      await expect(model.update(randomUUID(), { name: 'x' }, {})).rejects.toMatchObject({
        code: 'P2025',
      });
    });

    it('dentro do escopo grava e normaliza o e-mail', async () => {
      const aluno = await model.create(studentData(`Update Ok ${tag}`, { assignedTo: vendedorA }));
      const newEmail = `${tag}-NOVO@Integration.TEST`;

      const updated = await model.update(aluno.id, { email: newEmail }, { assignedTo: vendedorA });

      expect(updated.email).toBe(newEmail.toLowerCase());
      expect(updated.name).toBe(`Update Ok ${tag}`);
      await expect(model.findByEmail(newEmail)).resolves.toMatchObject({ id: aluno.id });
    });

    it('e-mail já usado por outro aluno lança P2002', async () => {
      const first = await model.create(studentData(`Dup 1 ${tag}`));
      const second = await model.create(studentData(`Dup 2 ${tag}`));

      await expect(model.update(second.id, { email: first.email }, {})).rejects.toMatchObject({
        code: 'P2002',
      });
    });
  });

  describe('delete', () => {
    it('apaga em cascata compras, oportunidades e tarefas e devolve o snapshot com as contagens', async () => {
      const aluno = await model.create(studentData(`Delete Cascata ${tag}`, { assignedTo: vendedorA }));
      const vizinho = await model.create(studentData(`Delete Vizinho ${tag}`, { assignedTo: vendedorA }));

      await client.purchase.create({
        data: { studentId: aluno.id, courseId, purchaseDate: new Date('2026-01-10'), amount: new Prisma.Decimal('497.00') },
      });
      await client.purchase.create({
        data: { studentId: vizinho.id, courseId, purchaseDate: new Date('2026-01-10'), amount: new Prisma.Decimal('497.00') },
      });
      await client.pipelineLead.createMany({
        data: [
          { studentId: aluno.id, assignedTo: vendedorA },
          { studentId: aluno.id, assignedTo: vendedorB },
        ],
      });
      await client.task.createMany({
        data: [1, 2, 3].map((n) => ({
          title: `Tarefa ${n} ${tag}`,
          assignedTo: vendedorA,
          relatedTo: aluno.id,
          relatedType: 'student',
          dueDate: new Date(),
        })),
      });

      const snapshot = await model.delete(aluno.id, auditOf);

      expect(snapshot).toEqual({
        id: aluno.id,
        name: `Delete Cascata ${tag}`,
        email: aluno.email,
        cascade: { purchases: 1, pipelineLeads: 2, tasks: 3 },
      });
      await expect(client.student.findUnique({ where: { id: aluno.id } })).resolves.toBeNull();
      await expect(client.purchase.count({ where: { studentId: aluno.id } })).resolves.toBe(0);
      await expect(client.pipelineLead.count({ where: { studentId: aluno.id } })).resolves.toBe(0);
      await expect(client.task.count({ where: { relatedTo: aluno.id } })).resolves.toBe(0);
      // A cascata não vaza: o vizinho, o curso e os vendedores continuam.
      await expect(client.purchase.count({ where: { studentId: vizinho.id } })).resolves.toBe(1);
      await expect(client.course.count({ where: { id: courseId } })).resolves.toBe(1);
      await expect(client.user.count({ where: { id: { in: [vendedorA, vendedorB] } } })).resolves.toBe(2);
    });

    it('aluno sem filhos devolve contagens zeradas', async () => {
      const aluno = await model.create(studentData(`Delete Sozinho ${tag}`));

      await expect(model.delete(aluno.id, auditOf)).resolves.toMatchObject({
        id: aluno.id,
        cascade: { purchases: 0, pipelineLeads: 0, tasks: 0 },
      });
    });

    it('id inexistente lança P2025 e não grava auditoria', async () => {
      const id = randomUUID();

      await expect(model.delete(id, auditOf)).rejects.toMatchObject({ code: 'P2025' });
      await expect(
        client.auditLog.count({ where: { action: AuditAction.STUDENT_DELETED, metadata: { path: ['student', 'id'], equals: id } } }),
      ).resolves.toBe(0);
    });

    it('grava a linha STUDENT_DELETED no AuditLogs com o snapshot', async () => {
      const aluno = await model.create(studentData(`Delete Auditado ${tag}`));
      await client.purchase.create({
        data: { studentId: aluno.id, courseId, purchaseDate: new Date('2026-01-10'), amount: new Prisma.Decimal('497.00') },
      });

      await model.delete(aluno.id, auditOf);

      const logs = await client.auditLog.findMany({
        where: { action: AuditAction.STUDENT_DELETED, metadata: { path: ['student', 'id'], equals: aluno.id } },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        actorId: vendedorA,
        metadata: {
          student: { id: aluno.id, name: `Delete Auditado ${tag}`, email: aluno.email },
          cascade: { purchases: 1, pipelineLeads: 0, tasks: 0 },
        },
      });
    });

    it('ROLLBACK: se o Postgres recusar a auditoria, o aluno e a cascata voltam', async () => {
      const aluno = await model.create(studentData(`Delete Rollback ${tag}`));
      await client.purchase.create({
        data: { studentId: aluno.id, courseId, purchaseDate: new Date('2026-01-10'), amount: new Prisma.Decimal('497.00') },
      });
      await client.task.create({
        data: { title: `Tarefa Rollback ${tag}`, assignedTo: vendedorA, relatedTo: aluno.id, relatedType: 'student', dueDate: new Date() },
      });

      // `AuditLog.actorId` não tem FK; o erro vem do próprio banco: `jsonb` não aceita `\u0000`.
      // O DELETE já rodou dentro da transação quando o INSERT do log falha.
      const rejeitadoPeloBanco = (snapshot: StudentDeletionSnapshot): AuditLogEntry => ({
        ...auditOf(snapshot),
        metadata: { student: { id: snapshot.id }, invalido: 'nul\u0000' },
      });

      await expect(model.delete(aluno.id, rejeitadoPeloBanco)).rejects.toThrow(
        /unsupported Unicode escape sequence|22P05/,
      );

      await expect(client.student.findUnique({ where: { id: aluno.id } })).resolves.toMatchObject({ id: aluno.id });
      await expect(client.purchase.count({ where: { studentId: aluno.id } })).resolves.toBe(1);
      await expect(client.task.count({ where: { relatedTo: aluno.id } })).resolves.toBe(1);
      await expect(
        client.auditLog.count({ where: { action: AuditAction.STUDENT_DELETED, metadata: { path: ['student', 'id'], equals: aluno.id } } }),
      ).resolves.toBe(0);
    });
  });

  describe('create e unicidade', () => {
    it('normaliza o e-mail e rejeita e-mail duplicado com outra caixa (P2002)', async () => {
      const email = `${tag}-Caixa@Integration.Test`;
      const created = await model.create(studentData(`Caixa ${tag}`, { email }));

      expect(created.email).toBe(email.toLowerCase());
      await expect(model.create(studentData(`Caixa 2 ${tag}`, { email: email.toUpperCase() }))).rejects.toMatchObject({
        code: 'P2002',
      });
    });

    it('rejeita CPF duplicado (P2002) e findByCpf encontra o dono', async () => {
      // CPF sintético derivado da etiqueta: 11 dígitos, único por execução.
      const cpf = String(parseInt(tag.slice(2, 12), 16) % 1e11).padStart(11, '0');
      const created = await model.create(studentData(`Cpf ${tag}`, { cpf }));

      await expect(model.create(studentData(`Cpf 2 ${tag}`, { cpf }))).rejects.toMatchObject({ code: 'P2002' });
      await expect(model.findByCpf(cpf)).resolves.toMatchObject({ id: created.id });
    });
  });
});
