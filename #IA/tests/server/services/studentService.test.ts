import { randomUUID } from 'node:crypto';

import {
  AuditAction,
  Prisma,
  StudentStatus,
  UserRole,
  type Student,
  type User,
} from '@prisma/client';

import { createStudentService } from '@server/services/studentService';
import type { PublicUser } from '@server/types/auth';
import type { CreateStudentRequest, StudentListQuery } from '@server/types/students';
import { HttpError } from '@server/utils/httpError';
import { toPublicUser } from '@server/utils/userMapper';

import {
  InMemoryAuditLogRepository,
  InMemoryStudentRepository,
  InMemoryUserRepository,
  type InMemoryStudentSeed,
} from '../fakes/inMemoryRepositories';
import {
  makeCourse,
  makeLead,
  makePurchase,
  makeStudent,
  makeStudents,
  makeTask,
} from '../helpers/studentFixture';
import { makeUser } from '../helpers/userFixture';

const admin = makeUser({ name: 'Admin', email: 'admin@exemplo.com', role: UserRole.admin });
const ceo = makeUser({ name: 'CEO', email: 'ceo@exemplo.com', role: UserRole.ceo });
const ana = makeUser({ name: 'Ana', email: 'ana@exemplo.com', role: UserRole.vendedor });
const bruno = makeUser({ name: 'Bruno', email: 'bruno@exemplo.com', role: UserRole.vendedor });
const USERS: User[] = [admin, ceo, ana, bruno];

const actor = (user: User): PublicUser => toPublicUser(user);

function query(overrides: Partial<StudentListQuery> = {}): StudentListQuery {
  return { page: 1, limit: 50, sortBy: 'createdAt', order: 'desc', ...overrides };
}

function buildService(students: Student[], extra: Partial<InMemoryStudentSeed> = {}) {
  const repository = new InMemoryStudentRepository({ students, users: USERS, ...extra });

  return createStudentService({
    students: repository,
    users: new InMemoryUserRepository(USERS),
  });
}

describe('studentService.listStudents', () => {
  it('pagina com o padrão de 50 e devolve a meta de paginação', async () => {
    const service = buildService(makeStudents(120));

    const result = await service.listStudents(query(), actor(admin));

    expect(result.data).toHaveLength(50);
    expect(result.pagination).toEqual({ page: 1, limit: 50, total: 120, totalPages: 3 });
  });

  it('respeita page e limit (?page=2&limit=100)', async () => {
    const service = buildService(makeStudents(250));

    const result = await service.listStudents(query({ page: 2, limit: 100 }), actor(admin));

    expect(result.data).toHaveLength(100);
    expect(result.pagination).toEqual({ page: 2, limit: 100, total: 250, totalPages: 3 });
    // createdAt desc: o 1º da página 2 é o 101º mais recente, ou seja, o índice 149.
    expect(result.data[0]?.name).toBe('Aluno 0149');
  });

  it('página além do fim vem vazia, com o total real', async () => {
    const service = buildService(makeStudents(10));

    const result = await service.listStudents(query({ page: 5, limit: 5 }), actor(admin));

    expect(result.data).toEqual([]);
    expect(result.pagination).toEqual({ page: 5, limit: 5, total: 10, totalPages: 2 });
  });

  it('totalPages é 0 quando não há alunos', async () => {
    const service = buildService([]);

    const result = await service.listStudents(query(), actor(admin));

    expect(result.pagination).toEqual({ page: 1, limit: 50, total: 0, totalPages: 0 });
  });

  it('filtra por status', async () => {
    const statuses = [StudentStatus.ativo, StudentStatus.inativo, StudentStatus.pausado];
    const service = buildService(makeStudents(9, (i) => ({ status: statuses[i % 3] })));

    const result = await service.listStudents(query({ status: StudentStatus.ativo }), actor(admin));

    expect(result.pagination.total).toBe(3);
    expect(result.data.every((student) => student.status === 'ativo')).toBe(true);
  });

  it('busca por nome ou e-mail sem diferenciar maiúsculas', async () => {
    const service = buildService([
      makeStudent({ name: 'joão da silva', email: 'js@exemplo.com' }),
      makeStudent({ name: 'Maria', email: 'JOAO.maria@exemplo.com' }),
      makeStudent({ name: 'Pedro', email: 'pedro@exemplo.com' }),
    ]);

    const porNome = await service.listStudents(query({ search: 'JOÃO' }), actor(admin));
    const porEmail = await service.listStudents(query({ search: 'Joao' }), actor(admin));

    expect(porNome.data.map((student) => student.name)).toEqual(['joão da silva']);
    expect(porEmail.data.map((student) => student.name)).toEqual(['Maria']);
  });

  it('combina status, busca e assignedTo', async () => {
    const service = buildService([
      makeStudent({ name: 'Joana', status: StudentStatus.ativo, assignedTo: ana.id }),
      makeStudent({ name: 'Joana B', status: StudentStatus.inativo, assignedTo: ana.id }),
      makeStudent({ name: 'Joana C', status: StudentStatus.ativo, assignedTo: bruno.id }),
      makeStudent({ name: 'Carla', status: StudentStatus.ativo, assignedTo: ana.id }),
    ]);

    const result = await service.listStudents(
      query({ status: StudentStatus.ativo, search: 'joana', assignedTo: ana.id }),
      actor(admin),
    );

    expect(result.data.map((student) => student.name)).toEqual(['Joana']);
    expect(result.pagination.total).toBe(1);
  });

  it('ordena por name, status e createdAt nos dois sentidos', async () => {
    const service = buildService([
      makeStudent({ name: 'Bia', status: StudentStatus.pausado, createdAt: new Date('2026-01-02') }),
      makeStudent({ name: 'Ana', status: StudentStatus.inativo, createdAt: new Date('2026-01-03') }),
      makeStudent({ name: 'Caio', status: StudentStatus.ativo, createdAt: new Date('2026-01-01') }),
    ]);
    const names = async (overrides: Partial<StudentListQuery>): Promise<string[]> =>
      (await service.listStudents(query(overrides), actor(admin))).data.map((s) => s.name);

    expect(await names({ sortBy: 'name', order: 'asc' })).toEqual(['Ana', 'Bia', 'Caio']);
    expect(await names({ sortBy: 'name', order: 'desc' })).toEqual(['Caio', 'Bia', 'Ana']);
    // Postgres ordena enum pela ordem de declaração: ativo, inativo, pausado.
    expect(await names({ sortBy: 'status', order: 'asc' })).toEqual(['Caio', 'Ana', 'Bia']);
    expect(await names({ sortBy: 'createdAt', order: 'asc' })).toEqual(['Caio', 'Bia', 'Ana']);
    expect(await names({})).toEqual(['Ana', 'Bia', 'Caio']);
  });

  it('traz assignedToName do usuário relacionado', async () => {
    const service = buildService([
      makeStudent({ name: 'Com vendedor', assignedTo: ana.id }),
      makeStudent({ name: 'Sem vendedor', assignedTo: null, createdAt: new Date('2020-01-01') }),
    ]);

    const result = await service.listStudents(query(), actor(admin));

    expect(result.data.map((s) => [s.name, s.assignedToName])).toEqual([
      ['Com vendedor', 'Ana'],
      ['Sem vendedor', null],
    ]);
  });

  describe('RBAC do vendedor (filtro na query)', () => {
    // Bruno tem mais alunos que Ana, e os dele são mais recentes: se o filtro fosse na
    // resposta, a primeira página de Ana viria vazia e o total contaria os do Bruno.
    const alunos = [
      ...makeStudents(30, () => ({ assignedTo: bruno.id }), new Date('2026-09-10T00:00:00Z')),
      ...makeStudents(12, () => ({ assignedTo: ana.id }), new Date('2026-01-01T00:00:00Z')),
      ...makeStudents(3, () => ({ assignedTo: null }), new Date('2026-05-01T00:00:00Z')),
    ];

    it('vendedor vê só os próprios alunos e o total conta só os dele', async () => {
      const service = buildService(alunos);

      const result = await service.listStudents(query({ limit: 10 }), actor(ana));

      expect(result.data).toHaveLength(10);
      expect(result.data.every((student) => student.assignedTo === ana.id)).toBe(true);
      expect(result.pagination).toEqual({ page: 1, limit: 10, total: 12, totalPages: 2 });
    });

    it('vendedor com ?assignedTo de outro continua vendo só os próprios', async () => {
      const service = buildService(alunos);

      const result = await service.listStudents(query({ assignedTo: bruno.id }), actor(ana));

      expect(result.pagination.total).toBe(12);
      expect(result.data.every((student) => student.assignedTo === ana.id)).toBe(true);
    });

    it.each([
      ['admin', admin],
      ['CEO', ceo],
    ])('%s vê todos e pode filtrar por assignedTo', async (_papel, user) => {
      const service = buildService(alunos);

      const todos = await service.listStudents(query(), actor(user));
      const doBruno = await service.listStudents(query({ assignedTo: bruno.id }), actor(user));

      expect(todos.pagination.total).toBe(45);
      expect(doBruno.pagination.total).toBe(30);
      expect(doBruno.data.every((student) => student.assignedTo === bruno.id)).toBe(true);
    });
  });
});

describe('studentService.getStudent', () => {
  function cenario() {
    const course = makeCourse({ name: 'Imersão IA' });
    const doAna = makeStudent({ name: 'Aluno da Ana', assignedTo: ana.id });
    const doBruno = makeStudent({ name: 'Aluno do Bruno', assignedTo: bruno.id });
    const service = buildService([doAna, doBruno], {
      courses: [course],
      purchases: [
        makePurchase({
          studentId: doAna.id,
          courseId: course.id,
          amount: new Prisma.Decimal('1497.90'),
        }),
      ],
      pipelineLeads: [
        makeLead({ studentId: doAna.id, assignedTo: ana.id, value: new Prisma.Decimal('500.00') }),
        makeLead({ studentId: doBruno.id, assignedTo: bruno.id }),
      ],
      tasks: [
        makeTask({ assignedTo: ana.id, relatedTo: doAna.id, completedAt: new Date() }),
        makeTask({ assignedTo: bruno.id, relatedTo: doBruno.id }),
      ],
    });

    return { service, doAna, doBruno, course };
  }

  it('devolve o detalhe com cursos, leads e tarefas só do aluno', async () => {
    const { service, doAna, course } = cenario();

    const detail = await service.getStudent(doAna.id, actor(ana));

    expect(detail).toMatchObject({ id: doAna.id, assignedToName: 'Ana' });
    expect(detail.courses).toEqual([
      { id: course.id, name: 'Imersão IA', purchaseDate: '2026-08-15', amount: 1497.9 },
    ]);
    expect(detail.pipelineLeads).toHaveLength(1);
    expect(detail.pipelineLeads[0]?.value).toBe(500);
    expect(detail.tasks).toHaveLength(1);
    expect(detail.tasks[0]?.completed).toBe(true);
  });

  it.each([
    ['admin', admin],
    ['CEO', ceo],
  ])('%s vê o detalhe de aluno de qualquer vendedor', async (_papel, user) => {
    const { service, doBruno } = cenario();

    await expect(service.getStudent(doBruno.id, actor(user))).resolves.toMatchObject({
      id: doBruno.id,
    });
  });

  describe('S6-9: leads e tarefas do detalhe no escopo do vendedor', () => {
    /** Aluno hoje do Bruno, com um lead e uma tarefa dele e outros da Ana (reatribuição). */
    function reatribuido() {
      const aluno = makeStudent({ name: 'Reatribuído', assignedTo: bruno.id });
      const service = buildService([aluno], {
        pipelineLeads: [
          makeLead({ studentId: aluno.id, assignedTo: bruno.id }),
          makeLead({ studentId: aluno.id, assignedTo: ana.id }),
        ],
        tasks: [
          makeTask({ assignedTo: bruno.id, relatedTo: aluno.id }),
          makeTask({ assignedTo: ana.id, relatedTo: aluno.id }),
        ],
      });

      return { service, aluno };
    }

    it('vendedor recebe só os próprios leads e tarefas', async () => {
      const { service, aluno } = reatribuido();

      const detail = await service.getStudent(aluno.id, actor(bruno));

      expect(detail.pipelineLeads).toHaveLength(1);
      expect(detail.tasks).toHaveLength(1);
    });

    it.each([
      ['admin', admin],
      ['CEO', ceo],
    ])('%s recebe todos os leads e tarefas', async (_papel, user) => {
      const { service, aluno } = reatribuido();

      const detail = await service.getStudent(aluno.id, actor(user));

      expect(detail.pipelineLeads).toHaveLength(2);
      expect(detail.tasks).toHaveLength(2);
    });
  });

  it('id inexistente → 404 NOT_FOUND', async () => {
    const { service } = cenario();

    await expect(service.getStudent(randomUUID(), actor(admin))).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('vendedor pedindo aluno de outro → 404 (não 403), igual a inexistente', async () => {
    const { service, doBruno } = cenario();

    const error = await service.getStudent(doBruno.id, actor(ana)).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

/** Violação de unicidade como o Prisma lança (`P2002`), com o campo em `meta.target`. */
function uniqueViolation(target: string[] | string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}

const CPF_VALIDO = '52998224725';
const CPF_VALIDO_MASCARA = '529.982.247-25';
const OUTRO_CPF = '11144477735';

function novoAluno(overrides: Partial<CreateStudentRequest> = {}): CreateStudentRequest {
  return { name: 'Maria Souza', email: 'maria@exemplo.com', ...overrides };
}

function serviceWith(repository: InMemoryStudentRepository) {
  return createStudentService({ students: repository, users: new InMemoryUserRepository(USERS) });
}

describe('studentService.createStudent', () => {
  it('cria com os padrões e devolve o StudentResponse', async () => {
    const service = buildService([]);

    const created = await service.createStudent(
      novoAluno({ phone: '11 99999-0000', cpf: CPF_VALIDO_MASCARA, assignedTo: ana.id }),
      actor(admin),
    );

    expect(created).toEqual({
      id: expect.any(String),
      name: 'Maria Souza',
      email: 'maria@exemplo.com',
      phone: '11 99999-0000',
      cpf: CPF_VALIDO,
      status: StudentStatus.ativo,
      notes: null,
      lastContactDate: null,
      assignedTo: ana.id,
      assignedToName: 'Ana',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    await expect(service.getStudent(created.id, actor(admin))).resolves.toMatchObject({
      cpf: CPF_VALIDO,
    });
  });

  it('grava o e-mail normalizado (trim + minúsculas)', async () => {
    const service = buildService([]);

    const created = await service.createStudent(
      novoAluno({ email: '  Maria@Exemplo.COM ' }),
      actor(admin),
    );

    expect(created.email).toBe('maria@exemplo.com');
  });

  it('e-mail duplicado → 409 EMAIL_IN_USE, inclusive com maiúsculas diferentes', async () => {
    const service = buildService([makeStudent({ email: 'joao@x.com' })]);

    for (const email of ['joao@x.com', 'JOAO@X.COM']) {
      await expect(service.createStudent(novoAluno({ email }), actor(admin))).rejects.toMatchObject(
        { status: 409, code: 'EMAIL_IN_USE' },
      );
    }
  });

  it.each([CPF_VALIDO, CPF_VALIDO_MASCARA])('CPF duplicado (%s) → 409 CPF_IN_USE', async (cpf) => {
    const service = buildService([makeStudent({ cpf: CPF_VALIDO })]);

    await expect(service.createStudent(novoAluno({ cpf }), actor(admin))).rejects.toMatchObject({
      status: 409,
      code: 'CPF_IN_USE',
    });
  });

  it('vendedor: assignedTo do corpo é ignorado e vira o próprio id', async () => {
    const service = buildService([]);

    const created = await service.createStudent(novoAluno({ assignedTo: bruno.id }), actor(ana));

    expect(created.assignedTo).toBe(ana.id);
  });

  it('vendedor sem assignedTo (ou com null) também fica como responsável', async () => {
    const service = buildService([]);

    const semCampo = await service.createStudent(novoAluno(), actor(ana));
    const comNull = await service.createStudent(
      novoAluno({ email: 'outra@exemplo.com', assignedTo: null }),
      actor(ana),
    );

    expect(semCampo.assignedTo).toBe(ana.id);
    expect(comNull.assignedTo).toBe(ana.id);
  });

  it.each([
    ['admin', admin],
    ['CEO', ceo],
  ])('%s define assignedTo; sem ele, o aluno fica sem responsável', async (_papel, user) => {
    const service = buildService([]);

    const atribuido = await service.createStudent(novoAluno({ assignedTo: bruno.id }), actor(user));
    const semResponsavel = await service.createStudent(
      novoAluno({ email: 'outra@exemplo.com' }),
      actor(user),
    );

    expect(atribuido.assignedTo).toBe(bruno.id);
    expect(semResponsavel.assignedTo).toBeNull();
  });

  it('admin com assignedTo inexistente → 400 VALIDATION_ERROR com details.assignedTo', async () => {
    const service = buildService([]);

    await expect(
      service.createStudent(novoAluno({ assignedTo: randomUUID() }), actor(admin)),
    ).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: { assignedTo: expect.any(String) },
    });
  });

  describe('corrida: a checagem prévia passa e o banco recusa (P2002)', () => {
    it.each([
      [['email'], 'EMAIL_IN_USE'],
      ['Students_email_key', 'EMAIL_IN_USE'],
      [['cpf'], 'CPF_IN_USE'],
      ['Students_cpf_key', 'CPF_IN_USE'],
    ])('meta.target %p → 409 %s', async (target, code) => {
      const repository = new InMemoryStudentRepository({ users: USERS });
      jest.spyOn(repository, 'create').mockRejectedValue(uniqueViolation(target));

      await expect(
        serviceWith(repository).createStudent(novoAluno(), actor(admin)),
      ).rejects.toMatchObject({ status: 409, code });
    });

    it('outro erro do repositório não vira 409', async () => {
      const repository = new InMemoryStudentRepository({ users: USERS });
      const boom = new Error('conexão caiu');
      jest.spyOn(repository, 'create').mockRejectedValue(boom);

      await expect(serviceWith(repository).createStudent(novoAluno(), actor(admin))).rejects.toBe(
        boom,
      );
    });
  });
});

describe('studentService.updateStudent', () => {
  function cenario() {
    const doAna = makeStudent({
      name: 'Aluno da Ana',
      email: 'aluno.ana@exemplo.com',
      cpf: CPF_VALIDO,
      assignedTo: ana.id,
    });
    const doBruno = makeStudent({
      name: 'Aluno do Bruno',
      email: 'aluno.bruno@exemplo.com',
      cpf: OUTRO_CPF,
      assignedTo: bruno.id,
    });
    const repository = new InMemoryStudentRepository({ students: [doAna, doBruno], users: USERS });

    return { service: serviceWith(repository), repository, doAna, doBruno };
  }

  it('atualiza os campos enviados, mantém os demais e muda updatedAt', async () => {
    const { service, doAna } = cenario();

    const updated = await service.updateStudent(
      doAna.id,
      { name: 'Novo Nome', status: StudentStatus.pausado, notes: 'Ligar à tarde' },
      actor(admin),
    );

    expect(updated).toMatchObject({
      id: doAna.id,
      name: 'Novo Nome',
      status: 'pausado',
      notes: 'Ligar à tarde',
      email: doAna.email,
      cpf: CPF_VALIDO,
      assignedTo: ana.id,
      createdAt: doAna.createdAt.toISOString(),
    });
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(doAna.updatedAt.getTime());
  });

  it('null limpa os campos opcionais', async () => {
    const { service, doAna } = cenario();

    const updated = await service.updateStudent(
      doAna.id,
      { cpf: null, phone: null, notes: null },
      actor(admin),
    );

    expect(updated).toMatchObject({ cpf: null, phone: null, notes: null });
  });

  it('aluno inexistente → 404 NOT_FOUND', async () => {
    const { service } = cenario();

    await expect(
      service.updateStudent(randomUUID(), { name: 'X' }, actor(admin)),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('vendedor editando aluno de outro → 404, e nada muda', async () => {
    const { service, doBruno } = cenario();

    await expect(
      service.updateStudent(doBruno.id, { name: 'Invasão' }, actor(ana)),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    await expect(service.getStudent(doBruno.id, actor(admin))).resolves.toMatchObject({
      name: 'Aluno do Bruno',
    });
  });

  it('vendedor edita o próprio aluno, mas não reatribui', async () => {
    const { service, doAna } = cenario();

    const updated = await service.updateStudent(
      doAna.id,
      { name: 'Editado', assignedTo: bruno.id },
      actor(ana),
    );

    expect(updated).toMatchObject({ name: 'Editado', assignedTo: ana.id });
  });

  it('vendedor enviando só assignedTo: nada a gravar, aluno e updatedAt inalterados', async () => {
    const { service, repository, doAna } = cenario();
    const update = jest.spyOn(repository, 'update');

    const result = await service.updateStudent(doAna.id, { assignedTo: bruno.id }, actor(ana));

    expect(update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      assignedTo: ana.id,
      updatedAt: doAna.updatedAt.toISOString(),
    });
  });

  it('CEO reatribui; admin remove o responsável com null', async () => {
    const { service, doAna } = cenario();

    await expect(
      service.updateStudent(doAna.id, { assignedTo: bruno.id }, actor(ceo)),
    ).resolves.toMatchObject({ assignedTo: bruno.id, assignedToName: 'Bruno' });
    await expect(
      service.updateStudent(doAna.id, { assignedTo: null }, actor(admin)),
    ).resolves.toMatchObject({ assignedTo: null, assignedToName: null });
  });

  it('admin reatribuindo para usuário inexistente → 400 com details.assignedTo', async () => {
    const { service, doAna } = cenario();

    await expect(
      service.updateStudent(doAna.id, { assignedTo: randomUUID() }, actor(admin)),
    ).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: { assignedTo: expect.any(String) },
    });
  });

  it('mantendo o próprio e-mail (outra caixa) e o próprio CPF (com máscara) não é conflito', async () => {
    const { service, doAna } = cenario();

    await expect(
      service.updateStudent(
        doAna.id,
        { email: 'ALUNO.ANA@exemplo.com', cpf: CPF_VALIDO_MASCARA, name: 'Mesmo' },
        actor(ana),
      ),
    ).resolves.toMatchObject({ email: 'aluno.ana@exemplo.com', cpf: CPF_VALIDO, name: 'Mesmo' });
  });

  it('e-mail de outro aluno → 409 EMAIL_IN_USE; CPF de outro → 409 CPF_IN_USE', async () => {
    const { service, doAna, doBruno } = cenario();

    await expect(
      service.updateStudent(doAna.id, { email: doBruno.email.toUpperCase() }, actor(admin)),
    ).rejects.toMatchObject({ status: 409, code: 'EMAIL_IN_USE' });
    await expect(
      service.updateStudent(doAna.id, { cpf: '111.444.777-35' }, actor(admin)),
    ).rejects.toMatchObject({ status: 409, code: 'CPF_IN_USE' });
  });

  it('P2002 no update → 409', async () => {
    const { service, repository, doAna } = cenario();
    jest.spyOn(repository, 'update').mockRejectedValue(uniqueViolation(['email']));

    await expect(
      service.updateStudent(doAna.id, { email: 'livre@exemplo.com' }, actor(admin)),
    ).rejects.toMatchObject({ status: 409, code: 'EMAIL_IN_USE' });
  });
});

// ---------------------------------------------------------------------------
// Review da TASK-008 (S6-10, S6-11) e TASK-009
// ---------------------------------------------------------------------------

/** "Registro não encontrado" como o Prisma lança no `update`/`delete` (`P2025`). */
function recordNotFound(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Record to update not found.', {
    code: 'P2025',
    clientVersion: 'test',
  });
}

describe('S6-11: escopo na gravação e P2025', () => {
  function cenario() {
    const doAna = makeStudent({ name: 'Aluno da Ana', assignedTo: ana.id });
    const doBruno = makeStudent({ name: 'Aluno do Bruno', assignedTo: bruno.id });
    const repository = new InMemoryStudentRepository({ students: [doAna, doBruno], users: USERS });

    return { service: serviceWith(repository), repository, doAna, doBruno };
  }

  it('update recebe o escopo do vendedor; admin grava sem escopo', async () => {
    const { service, repository, doAna } = cenario();
    const update = jest.spyOn(repository, 'update');

    await service.updateStudent(doAna.id, { name: 'Pela Ana' }, actor(ana));
    await service.updateStudent(doAna.id, { name: 'Pelo admin' }, actor(admin));

    expect(update).toHaveBeenNthCalledWith(1, doAna.id, expect.any(Object), {
      assignedTo: ana.id,
    });
    expect(update).toHaveBeenNthCalledWith(2, doAna.id, expect.any(Object), {
      assignedTo: undefined,
    });
  });

  it('aluno removido entre a leitura e a gravação → 404 NOT_FOUND (não 500)', async () => {
    const { service, repository } = cenario();
    const fantasma = makeStudent({ name: 'Fantasma', assignedTo: ana.id });
    jest
      .spyOn(repository, 'findById')
      .mockResolvedValue({ ...fantasma, assignedToUser: { name: 'Ana' } });

    await expect(
      service.updateStudent(fantasma.id, { name: 'X' }, actor(ana)),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('aluno reatribuído a outro vendedor no meio da edição → 404 e nada é gravado', async () => {
    const { service, repository, doBruno } = cenario();
    // A leitura ainda enxergou o aluno como da Ana; na gravação ele já é do Bruno.
    jest
      .spyOn(repository, 'findById')
      .mockResolvedValue({ ...doBruno, assignedTo: ana.id, assignedToUser: { name: 'Ana' } });

    await expect(
      service.updateStudent(doBruno.id, { name: 'Invasão' }, actor(ana)),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    await expect(service.getStudent(doBruno.id, actor(admin))).resolves.toMatchObject({
      name: 'Aluno do Bruno',
    });
  });

  it('P2025 lançado pelo repositório no update → 404', async () => {
    const { service, repository, doAna } = cenario();
    jest.spyOn(repository, 'update').mockRejectedValue(recordNotFound());

    await expect(
      service.updateStudent(doAna.id, { name: 'X' }, actor(admin)),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

describe('S6-10: atribuição a usuário desativado', () => {
  const inativo = makeUser({
    name: 'Carlos (desligado)',
    email: 'carlos@exemplo.com',
    role: UserRole.vendedor,
    isActive: false,
  });
  const usuarios = [...USERS, inativo];

  function serviceComInativo(students: Student[] = []) {
    const repository = new InMemoryStudentRepository({ students, users: usuarios });

    return createStudentService({
      students: repository,
      users: new InMemoryUserRepository(usuarios),
    });
  }

  const erroAssignedTo = {
    status: 400,
    code: 'VALIDATION_ERROR',
    details: { assignedTo: expect.any(String) },
  };

  it('POST atribuindo a usuário inativo → 400 com details.assignedTo', async () => {
    const service = serviceComInativo();

    await expect(
      service.createStudent(novoAluno({ assignedTo: inativo.id }), actor(admin)),
    ).rejects.toMatchObject(erroAssignedTo);
  });

  it('PUT trocando para usuário inativo → 400', async () => {
    const aluno = makeStudent({ assignedTo: ana.id });
    const service = serviceComInativo([aluno]);

    await expect(
      service.updateStudent(aluno.id, { assignedTo: inativo.id }, actor(ceo)),
    ).rejects.toMatchObject(erroAssignedTo);
  });

  it('PUT de outro campo em aluno cujo responsável ficou inativo → 200', async () => {
    const aluno = makeStudent({ name: 'Antigo', assignedTo: inativo.id });
    const service = serviceComInativo([aluno]);

    await expect(
      service.updateStudent(aluno.id, { name: 'Renomeado' }, actor(admin)),
    ).resolves.toMatchObject({ name: 'Renomeado', assignedTo: inativo.id });
  });

  it('PUT repetindo o mesmo responsável inativo → 200 (não é atribuição nova)', async () => {
    const aluno = makeStudent({ assignedTo: inativo.id });
    const service = serviceComInativo([aluno]);

    await expect(
      service.updateStudent(aluno.id, { assignedTo: inativo.id, notes: 'ok' }, actor(admin)),
    ).resolves.toMatchObject({ assignedTo: inativo.id, notes: 'ok' });
  });

  it('CEO ativo como responsável é aceito', async () => {
    const service = serviceComInativo();

    await expect(
      service.createStudent(novoAluno({ assignedTo: ceo.id }), actor(admin)),
    ).resolves.toMatchObject({ assignedTo: ceo.id });
  });
});

describe('studentService.deleteStudent (TASK-009)', () => {
  function cenario() {
    const course = makeCourse();
    const outroCurso = makeCourse({ name: 'Outro curso' });
    const doAna = makeStudent({
      name: 'Aluno da Ana',
      email: 'aluno.ana@exemplo.com',
      assignedTo: ana.id,
    });
    const outro = makeStudent({ name: 'Outro', assignedTo: bruno.id });
    const auditLogs = new InMemoryAuditLogRepository();
    const repository = new InMemoryStudentRepository(
      {
      students: [doAna, outro],
      users: USERS,
      courses: [course, outroCurso],
      purchases: [
        makePurchase({ studentId: doAna.id, courseId: course.id }),
        makePurchase({ studentId: doAna.id, courseId: outroCurso.id }),
        makePurchase({ studentId: outro.id, courseId: course.id }),
      ],
      pipelineLeads: [
        makeLead({ studentId: doAna.id, assignedTo: ana.id }),
        makeLead({ studentId: outro.id, assignedTo: bruno.id }),
      ],
      tasks: [
        makeTask({ assignedTo: ana.id, relatedTo: doAna.id }),
        makeTask({ assignedTo: ana.id, relatedTo: doAna.id }),
        makeTask({ assignedTo: bruno.id, relatedTo: doAna.id }),
        makeTask({ assignedTo: bruno.id, relatedTo: null }),
      ],
      },
      auditLogs,
    );

    return { service: serviceWith(repository), repository, auditLogs, doAna, outro };
  }

  it('grava STUDENT_DELETED com o ator e o snapshot do aluno e da cascata', async () => {
    const { service, auditLogs, doAna } = cenario();

    await service.deleteStudent(doAna.id, actor(admin));

    expect(auditLogs.entries).toHaveLength(1);
    expect(auditLogs.entries[0]).toMatchObject({
      action: AuditAction.STUDENT_DELETED,
      actorId: admin.id,
      metadata: {
        student: { id: doAna.id, name: 'Aluno da Ana', email: 'aluno.ana@exemplo.com' },
        cascade: { purchases: 2, pipelineLeads: 1, tasks: 3 },
      },
    });
  });

  it('aluno sem filhos: snapshot com contagens zeradas', async () => {
    const auditLogs = new InMemoryAuditLogRepository();
    const sozinho = makeStudent({ name: 'Sozinho' });
    const service = serviceWith(
      new InMemoryStudentRepository({ students: [sozinho], users: USERS }, auditLogs),
    );

    await service.deleteStudent(sozinho.id, actor(admin));

    expect(auditLogs.entries[0]?.metadata).toEqual({
      student: { id: sozinho.id, name: 'Sozinho', email: sozinho.email },
      cascade: { purchases: 0, pipelineLeads: 0, tasks: 0 },
    });
  });

  it('inexistente → 404 sem chamar o delete e sem gravar auditoria', async () => {
    const { service, repository, auditLogs } = cenario();
    const remove = jest.spyOn(repository, 'delete');

    await expect(service.deleteStudent(randomUUID(), actor(admin))).rejects.toMatchObject({
      status: 404,
    });
    expect(remove).not.toHaveBeenCalled();
    expect(auditLogs.entries).toHaveLength(0);
  });

  it('auditoria falha → a exclusão é desfeita: aluno e filhos continuam, sem log', async () => {
    const { service, repository, auditLogs, doAna } = cenario();
    const antes = repository.snapshot();
    jest.spyOn(auditLogs, 'record').mockRejectedValueOnce(new Error('auditoria indisponível'));

    await expect(service.deleteStudent(doAna.id, actor(admin))).rejects.toThrow(
      'auditoria indisponível',
    );

    expect(repository.snapshot()).toEqual(antes);
    expect(auditLogs.entries).toHaveLength(0);
    await expect(service.getStudent(doAna.id, actor(admin))).resolves.toMatchObject({
      id: doAna.id,
    });
  });

  it('403 (CEO) não grava auditoria', async () => {
    const { service, auditLogs, doAna } = cenario();

    await expect(service.deleteStudent(doAna.id, actor(ceo))).rejects.toMatchObject({
      status: 403,
    });
    expect(auditLogs.entries).toHaveLength(0);
  });

  it('P2025 ou erro na exclusão não grava auditoria', async () => {
    const { service, repository, auditLogs, doAna } = cenario();
    jest
      .spyOn(repository, 'delete')
      .mockRejectedValueOnce(recordNotFound())
      .mockRejectedValueOnce(new Error('conexão caiu'));

    await expect(service.deleteStudent(doAna.id, actor(admin))).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.deleteStudent(doAna.id, actor(admin))).rejects.toThrow('conexão caiu');
    expect(auditLogs.entries).toHaveLength(0);
  });

  it('admin exclui: o aluno some do detalhe e da listagem', async () => {
    const { service, doAna, outro } = cenario();

    await expect(service.deleteStudent(doAna.id, actor(admin))).resolves.toBeUndefined();

    await expect(service.getStudent(doAna.id, actor(admin))).rejects.toMatchObject({
      status: 404,
    });
    const lista = await service.listStudents(query(), actor(admin));
    expect(lista.data.map((student) => student.id)).toEqual([outro.id]);
  });

  it('não apaga os filhos à mão: uma chamada ao delete do repositório (a cascata é do banco)', async () => {
    const { service, repository, doAna } = cenario();
    const remove = jest.spyOn(repository, 'delete');

    await service.deleteStudent(doAna.id, actor(admin));

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(doAna.id, expect.any(Function));
  });

  it.each([
    ['vendedor dono do aluno', ana],
    ['CEO', ceo],
  ])('%s → 403 FORBIDDEN e o aluno continua existindo', async (_papel, user) => {
    const { service, repository, doAna } = cenario();
    const remove = jest.spyOn(repository, 'delete');

    await expect(service.deleteStudent(doAna.id, actor(user))).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
    expect(remove).not.toHaveBeenCalled();
    await expect(service.getStudent(doAna.id, actor(admin))).resolves.toMatchObject({
      id: doAna.id,
    });
  });

  it('inexistente → 404 NOT_FOUND', async () => {
    const { service } = cenario();

    await expect(service.deleteStudent(randomUUID(), actor(admin))).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('P2025 na exclusão → 404; outro erro sobe como está', async () => {
    const { service, repository, doAna } = cenario();
    const boom = new Error('conexão caiu');
    jest
      .spyOn(repository, 'delete')
      .mockRejectedValueOnce(recordNotFound())
      .mockRejectedValueOnce(boom);

    await expect(service.deleteStudent(doAna.id, actor(admin))).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    await expect(service.deleteStudent(doAna.id, actor(admin))).rejects.toBe(boom);
  });
});
