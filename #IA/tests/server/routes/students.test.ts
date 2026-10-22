import { randomUUID } from 'node:crypto';

import {
  AuditAction,
  Prisma,
  StudentStatus,
  UserRole,
  type Student,
  type User,
} from '@prisma/client';

import { createApp } from '@server/app';
import type { Repositories } from '@server/types/auth';
import type {
  StudentDetailResponse,
  StudentListResponse,
  StudentResponse,
} from '@server/types/students';
import { SESSION_COOKIE_NAME } from '@server/utils/jwt';
import { hashPassword } from '@server/utils/password';

import {
  InMemoryAuditLogRepository,
  InMemoryStudentRepository,
  catalogRepositories,
  InMemoryUserRepository,
  type InMemoryStudentSeed,
} from '../fakes/inMemoryRepositories';
import { startTestServer, type TestServer } from '../helpers/expressTestApp';
import {
  makeCourse,
  makeLead,
  makePurchase,
  makeStudent,
  makeStudents,
  makeTask,
} from '../helpers/studentFixture';
import { makeUser } from '../helpers/userFixture';

const SECRET = 'segredo-de-teste-suficientemente-longo-32+';
const SENHA = 'SenhaAtual1';

const originalEnv = { ...process.env };

let passwordHash: string;
let server: TestServer | undefined;
let baseUrl: string;
let admin: User;
let ceo: User;
let ana: User;
let bruno: User;
let auditLogs: InMemoryAuditLogRepository;

async function startApp(
  students: Student[],
  extra: Partial<InMemoryStudentSeed> = {},
  users: User[] = [admin, ceo, ana, bruno],
): Promise<void> {
  auditLogs = new InMemoryAuditLogRepository();
  const repositories: Repositories = {
    users: new InMemoryUserRepository(users),
    auditLogs,
    students: new InMemoryStudentRepository({ students, users, ...extra }, auditLogs),
    ...catalogRepositories(extra),
  };

  server = await startTestServer(createApp(repositories));
  baseUrl = server.baseUrl;
}

const get = (path: string, cookie?: string): Promise<Response> =>
  fetch(`${baseUrl}${path}`, { headers: cookie ? { cookie } : {} });

async function getJson<T>(path: string, cookie: string): Promise<T> {
  const response = await get(path, cookie);

  expect(response.status).toBe(200);

  return (await response.json()) as T;
}

async function loginCookie(email: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: SENHA }),
  });

  expect(response.status).toBe(200);

  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!cookie) {
    throw new Error('A resposta de login não trouxe o cookie de sessão');
  }

  return cookie.split(';')[0] as string;
}

async function expectErrorCode(response: Response, status: number, code: string): Promise<void> {
  expect(response.status).toBe(status);
  expect(((await response.json()) as { code: string }).code).toBe(code);
}

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  passwordHash = await hashPassword(SENHA);
  admin = makeUser({
    name: 'Admin',
    email: 'admin@exemplo.com',
    passwordHash,
    role: UserRole.admin,
  });
  ceo = makeUser({ name: 'CEO', email: 'ceo@exemplo.com', passwordHash, role: UserRole.ceo });
  ana = makeUser({ name: 'Ana', email: 'ana@exemplo.com', passwordHash, role: UserRole.vendedor });
  bruno = makeUser({
    name: 'Bruno',
    email: 'bruno@exemplo.com',
    passwordHash,
    role: UserRole.vendedor,
  });
});

afterAll(() => {
  process.env = { ...originalEnv };
});

afterEach(async () => {
  await server?.close();
  server = undefined;
});

/** Bruno tem mais alunos, e mais recentes, do que Ana. */
function alunosDeDoisVendedores(): Student[] {
  return [
    ...makeStudents(
      70,
      (i) => ({ assignedTo: bruno.id, name: `Bruno ${i}` }),
      new Date('2026-09-01T00:00:00Z'),
    ),
    ...makeStudents(
      55,
      (i) => ({ assignedTo: ana.id, name: `Ana ${i}` }),
      new Date('2026-01-01T00:00:00Z'),
    ),
  ];
}

describe('GET /api/students', () => {
  it('admin recebe 50 por padrão, no formato do contrato', async () => {
    await startApp(alunosDeDoisVendedores());
    const cookie = await loginCookie(admin.email);

    const body = await getJson<StudentListResponse>('/api/students', cookie);

    expect(body.data).toHaveLength(50);
    expect(body.pagination).toEqual({ page: 1, limit: 50, total: 125, totalPages: 3 });
    expect(body.data[0]).toEqual({
      id: expect.any(String),
      name: 'Bruno 69',
      email: expect.any(String),
      phone: null,
      cpf: null,
      status: 'ativo',
      notes: null,
      lastContactDate: null,
      assignedTo: bruno.id,
      assignedToName: 'Bruno',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      updatedAt: expect.any(String),
    });
  });

  it('?page=2&limit=100 funciona', async () => {
    await startApp(makeStudents(250));
    const cookie = await loginCookie(admin.email);

    const body = await getJson<StudentListResponse>('/api/students?page=2&limit=100', cookie);

    expect(body.data).toHaveLength(100);
    expect(body.pagination).toEqual({ page: 2, limit: 100, total: 250, totalPages: 3 });
  });

  it.each([
    ['limit=501', 'limit'],
    ['limit=0', 'limit'],
    ['limit=2.5', 'limit'],
    ['page=0', 'page'],
    ['page=abc', 'page'],
    ['status=vendido', 'status'],
    ['sortBy=email', 'sortBy'],
    ['order=up', 'order'],
    ['assignedTo=nao-e-uuid', 'assignedTo'],
  ])('?%s → 400 VALIDATION_ERROR', async (qs, field) => {
    await startApp([]);
    const cookie = await loginCookie(admin.email);

    const response = await get(`/api/students?${qs}`, cookie);

    expect(response.status).toBe(400);

    const body = (await response.json()) as { code: string; details?: Record<string, string> };

    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toHaveProperty(field);
  });

  it('?limit=500 é aceito (limite máximo)', async () => {
    await startApp(makeStudents(3));
    const cookie = await loginCookie(admin.email);

    const body = await getJson<StudentListResponse>('/api/students?limit=500', cookie);

    expect(body.pagination).toEqual({ page: 1, limit: 500, total: 3, totalPages: 1 });
  });

  it('?status=ativo filtra, ?search=JOÃO acha por nome e por e-mail, e combinam', async () => {
    await startApp([
      makeStudent({ name: 'joão silva', email: 'js@exemplo.com' }),
      makeStudent({
        name: 'Carla',
        email: 'joão.carla@exemplo.com',
        status: StudentStatus.inativo,
      }),
      makeStudent({ name: 'Pedro', email: 'pedro@exemplo.com' }),
    ]);
    const cookie = await loginCookie(admin.email);
    const joao = encodeURIComponent('JOÃO');

    const ativos = await getJson<StudentListResponse>('/api/students?status=ativo', cookie);
    const busca = await getJson<StudentListResponse>(
      `/api/students?search=${joao}&sortBy=name&order=asc`,
      cookie,
    );
    const combinado = await getJson<StudentListResponse>(
      `/api/students?status=inativo&search=${joao}`,
      cookie,
    );

    expect(ativos.pagination.total).toBe(2);
    expect(ativos.data.every((s) => s.status === 'ativo')).toBe(true);
    expect(busca.data.map((s) => s.name)).toEqual(['Carla', 'joão silva']);
    expect(combinado.data.map((s) => s.name)).toEqual(['Carla']);
  });

  it('ordena por sortBy e order', async () => {
    await startApp([
      makeStudent({ name: 'Bia' }),
      makeStudent({ name: 'Ana' }),
      makeStudent({ name: 'Caio' }),
    ]);
    const cookie = await loginCookie(admin.email);

    const desc = await getJson<StudentListResponse>('/api/students?sortBy=name&order=desc', cookie);
    const asc = await getJson<StudentListResponse>('/api/students?sortBy=name&order=asc', cookie);

    expect(desc.data.map((s) => s.name)).toEqual(['Caio', 'Bia', 'Ana']);
    expect(asc.data.map((s) => s.name)).toEqual(['Ana', 'Bia', 'Caio']);
  });

  it('vendedor vê só os próprios alunos e o total conta só os dele', async () => {
    await startApp(alunosDeDoisVendedores());
    const cookie = await loginCookie(ana.email);

    const body = await getJson<StudentListResponse>('/api/students', cookie);

    expect(body.data).toHaveLength(50);
    expect(body.data.every((s) => s.assignedTo === ana.id)).toBe(true);
    expect(body.pagination).toEqual({ page: 1, limit: 50, total: 55, totalPages: 2 });
  });

  it('vendedor com ?assignedTo de outro continua vendo só os próprios', async () => {
    await startApp(alunosDeDoisVendedores());
    const cookie = await loginCookie(ana.email);

    const body = await getJson<StudentListResponse>(
      `/api/students?assignedTo=${bruno.id}&limit=500`,
      cookie,
    );

    expect(body.pagination.total).toBe(55);
    expect(body.data).toHaveLength(55);
    expect(body.data.every((s) => s.assignedTo === ana.id)).toBe(true);
  });

  it('CEO vê todos; admin filtra por assignedTo', async () => {
    await startApp(alunosDeDoisVendedores());
    const cookieCeo = await loginCookie(ceo.email);
    const cookieAdmin = await loginCookie(admin.email);

    const todos = await getJson<StudentListResponse>('/api/students', cookieCeo);
    const doBruno = await getJson<StudentListResponse>(
      `/api/students?assignedTo=${bruno.id}`,
      cookieAdmin,
    );

    expect(todos.pagination.total).toBe(125);
    expect(doBruno.pagination.total).toBe(70);
    expect(doBruno.data.every((s) => s.assignedTo === bruno.id)).toBe(true);
  });
});

describe('GET /api/students/:id', () => {
  let doAna: Student;
  let doBruno: Student;

  beforeEach(async () => {
    doAna = makeStudent({ name: 'Aluno da Ana', assignedTo: ana.id });
    doBruno = makeStudent({ name: 'Aluno do Bruno', assignedTo: bruno.id });
    const course = makeCourse({ name: 'Imersão IA' });

    await startApp([doAna, doBruno], {
      courses: [course],
      purchases: [
        makePurchase({
          studentId: doAna.id,
          courseId: course.id,
          purchaseDate: new Date('2026-08-15T00:00:00.000Z'),
          amount: new Prisma.Decimal('1497.90'),
        }),
      ],
      pipelineLeads: [
        makeLead({ studentId: doAna.id, assignedTo: ana.id, value: new Prisma.Decimal('2000.50') }),
      ],
      tasks: [makeTask({ assignedTo: ana.id, relatedTo: doAna.id })],
    });
  });

  it('200 com courses, pipelineLeads e tasks, números como number', async () => {
    const cookie = await loginCookie(ana.email);

    const body = await getJson<StudentDetailResponse>(`/api/students/${doAna.id}`, cookie);

    expect(body).toMatchObject({ id: doAna.id, name: 'Aluno da Ana', assignedToName: 'Ana' });
    expect(body.courses).toEqual([
      { id: expect.any(String), name: 'Imersão IA', purchaseDate: '2026-08-15', amount: 1497.9 },
    ]);
    expect(body.pipelineLeads).toEqual([
      {
        id: expect.any(String),
        status: 'prospecting',
        value: 2000.5,
        createdAt: expect.any(String),
      },
    ]);
    expect(body.tasks).toEqual([
      {
        id: expect.any(String),
        title: 'Ligar para o aluno',
        dueDate: '2026-09-20T15:00:00.000Z',
        completed: false,
      },
    ]);
  });

  it('id inexistente → 404 NOT_FOUND', async () => {
    const cookie = await loginCookie(admin.email);

    await expectErrorCode(await get(`/api/students/${randomUUID()}`, cookie), 404, 'NOT_FOUND');
  });

  it('id que não é uuid → 400 VALIDATION_ERROR', async () => {
    const cookie = await loginCookie(admin.email);

    await expectErrorCode(await get('/api/students/nao-e-uuid', cookie), 400, 'VALIDATION_ERROR');
  });

  it('vendedor pedindo aluno de outro → 404, não 403', async () => {
    const cookie = await loginCookie(ana.email);

    await expectErrorCode(await get(`/api/students/${doBruno.id}`, cookie), 404, 'NOT_FOUND');
  });

  it('CEO vê aluno de qualquer vendedor', async () => {
    const cookie = await loginCookie(ceo.email);

    expect((await get(`/api/students/${doBruno.id}`, cookie)).status).toBe(200);
  });
});

describe('/api/students sem sessão ou com senha provisória', () => {
  it('sem sessão → 401 nas duas rotas', async () => {
    await startApp([]);

    for (const path of ['/api/students', `/api/students/${randomUUID()}`]) {
      await expectErrorCode(await get(path), 401, 'UNAUTHORIZED');
    }
  });

  it('senha provisória → 403 PASSWORD_CHANGE_REQUIRED nas duas rotas', async () => {
    const pendente = makeUser({
      email: 'pendente@exemplo.com',
      passwordHash,
      role: UserRole.admin,
      mustChangePassword: true,
    });

    await startApp([], {}, [pendente]);
    const cookie = await loginCookie(pendente.email);

    for (const path of ['/api/students', `/api/students/${randomUUID()}`]) {
      await expectErrorCode(await get(path, cookie), 403, 'PASSWORD_CHANGE_REQUIRED');
    }
  });
});

// ---------------------------------------------------------------------------
// TASK-008: POST e PUT
// ---------------------------------------------------------------------------

const CPF_VALIDO = '52998224725';
const CPF_VALIDO_MASCARA = '529.982.247-25';

function send(method: 'POST' | 'PUT', path: string, body: unknown, cookie?: string) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

async function expectValidation(response: Response, field: string): Promise<void> {
  expect(response.status).toBe(400);
  const body = (await response.json()) as { code: string; details?: Record<string, string> };
  expect(body.code).toBe('VALIDATION_ERROR');
  expect(body.details).toHaveProperty([field]);
}

describe('POST /api/students', () => {
  beforeEach(async () => {
    await startApp([makeStudent({ email: 'joao@x.com', cpf: CPF_VALIDO })]);
  });

  it('201 com o StudentResponse do contrato; status padrão ativo; e-mail e CPF normalizados', async () => {
    const cookie = await loginCookie(admin.email);

    const response = await send(
      'POST',
      '/api/students',
      {
        name: '  Maria Souza ',
        email: ' Maria@Exemplo.COM',
        phone: '11 99999-0000',
        cpf: '111.444.777-35',
        notes: 'Veio da live',
        assignedTo: ana.id,
      },
      cookie,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: expect.any(String),
      name: 'Maria Souza',
      email: 'maria@exemplo.com',
      phone: '11 99999-0000',
      cpf: '11144477735',
      status: 'ativo',
      notes: 'Veio da live',
      lastContactDate: null,
      assignedTo: ana.id,
      assignedToName: 'Ana',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it.each(['joao@x.com', 'JOAO@X.COM'])(
    'e-mail duplicado (%s) → 409 EMAIL_IN_USE',
    async (email) => {
      const cookie = await loginCookie(admin.email);

      await expectErrorCode(
        await send('POST', '/api/students', { name: 'Outro', email }, cookie),
        409,
        'EMAIL_IN_USE',
      );
    },
  );

  it.each([CPF_VALIDO, CPF_VALIDO_MASCARA])('CPF duplicado (%s) → 409 CPF_IN_USE', async (cpf) => {
    const cookie = await loginCookie(admin.email);

    await expectErrorCode(
      await send('POST', '/api/students', { name: 'Outro', email: 'novo@x.com', cpf }, cookie),
      409,
      'CPF_IN_USE',
    );
  });

  it.each([
    ['e-mail inválido', { name: 'A', email: 'nao-e-email' }, 'email'],
    ['sem e-mail', { name: 'A' }, 'email'],
    ['CPF com dígito errado', { name: 'A', email: 'a@x.com', cpf: '52998224724' }, 'cpf'],
    ['CPF repetido', { name: 'A', email: 'a@x.com', cpf: '111.111.111-11' }, 'cpf'],
    ['CPF com tamanho errado', { name: 'A', email: 'a@x.com', cpf: '1234' }, 'cpf'],
    ['name vazio', { name: '', email: 'a@x.com' }, 'name'],
    ['name só com espaços', { name: '   ', email: 'a@x.com' }, 'name'],
    ['name com 256 caracteres', { name: 'a'.repeat(256), email: 'a@x.com' }, 'name'],
    ['status fora do enum', { name: 'A', email: 'a@x.com', status: 'vip' }, 'status'],
    ['assignedTo que não é uuid', { name: 'A', email: 'a@x.com', assignedTo: 'x' }, 'assignedTo'],
  ])('%s → 400 VALIDATION_ERROR', async (_caso, body, field) => {
    const cookie = await loginCookie(admin.email);

    await expectValidation(await send('POST', '/api/students', body, cookie), field);
  });

  it('campos opcionais aceitam null', async () => {
    const cookie = await loginCookie(admin.email);

    const response = await send(
      'POST',
      '/api/students',
      { name: 'A', email: 'a@x.com', phone: null, cpf: null, notes: null, assignedTo: null },
      cookie,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ phone: null, cpf: null, notes: null });
  });

  it('vendedor com assignedTo de outro → grava o próprio id', async () => {
    const cookie = await loginCookie(ana.email);

    const response = await send(
      'POST',
      '/api/students',
      { name: 'A', email: 'a@x.com', assignedTo: bruno.id },
      cookie,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ assignedTo: ana.id, assignedToName: 'Ana' });
  });

  it('CEO cria e atribui', async () => {
    const cookie = await loginCookie(ceo.email);

    const response = await send(
      'POST',
      '/api/students',
      { name: 'A', email: 'a@x.com', assignedTo: bruno.id },
      cookie,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ assignedTo: bruno.id });
  });

  it('admin com assignedTo inexistente → 400 com details.assignedTo', async () => {
    const cookie = await loginCookie(admin.email);

    await expectValidation(
      await send(
        'POST',
        '/api/students',
        { name: 'A', email: 'a@x.com', assignedTo: randomUUID() },
        cookie,
      ),
      'assignedTo',
    );
  });
});

describe('PUT /api/students/:id', () => {
  let doAna: Student;
  let doBruno: Student;

  beforeEach(async () => {
    doAna = makeStudent({
      name: 'Aluno da Ana',
      email: 'aluno.ana@x.com',
      cpf: CPF_VALIDO,
      assignedTo: ana.id,
    });
    doBruno = makeStudent({
      name: 'Aluno do Bruno',
      email: 'aluno.bruno@x.com',
      assignedTo: bruno.id,
    });
    await startApp([doAna, doBruno]);
  });

  it('200 atualiza os campos e muda updatedAt', async () => {
    const cookie = await loginCookie(admin.email);

    const response = await send(
      'PUT',
      `/api/students/${doAna.id}`,
      { name: 'Novo', status: 'inativo', phone: '11 1234-5678', notes: null },
      cookie,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as StudentResponse;
    expect(body).toMatchObject({
      id: doAna.id,
      name: 'Novo',
      status: 'inativo',
      phone: '11 1234-5678',
      notes: null,
      email: 'aluno.ana@x.com',
      cpf: CPF_VALIDO,
    });
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(doAna.updatedAt.getTime());
  });

  it('corpo sem campos → 400 VALIDATION_ERROR', async () => {
    const cookie = await loginCookie(admin.email);

    await expectErrorCode(
      await send('PUT', `/api/students/${doAna.id}`, {}, cookie),
      400,
      'VALIDATION_ERROR',
    );
  });

  it('valida os campos enviados como no POST (e-mail e CPF inválidos, name vazio)', async () => {
    const cookie = await loginCookie(admin.email);
    const path = `/api/students/${doAna.id}`;

    await expectValidation(await send('PUT', path, { email: 'x' }, cookie), 'email');
    await expectValidation(await send('PUT', path, { cpf: '12345678900' }, cookie), 'cpf');
    await expectValidation(await send('PUT', path, { name: ' ' }, cookie), 'name');
    await expectValidation(await send('PUT', path, { email: null }, cookie), 'email');
  });

  it('aluno inexistente → 404; id que não é uuid → 400', async () => {
    const cookie = await loginCookie(admin.email);

    await expectErrorCode(
      await send('PUT', `/api/students/${randomUUID()}`, { name: 'X' }, cookie),
      404,
      'NOT_FOUND',
    );
    await expectErrorCode(
      await send('PUT', '/api/students/nao-e-uuid', { name: 'X' }, cookie),
      400,
      'VALIDATION_ERROR',
    );
  });

  it('vendedor editando aluno de outro → 404', async () => {
    const cookie = await loginCookie(ana.email);

    await expectErrorCode(
      await send('PUT', `/api/students/${doBruno.id}`, { name: 'Invasão' }, cookie),
      404,
      'NOT_FOUND',
    );
  });

  it('vendedor tentando reatribuir → assignedTo inalterado', async () => {
    const cookie = await loginCookie(ana.email);

    const response = await send(
      'PUT',
      `/api/students/${doAna.id}`,
      { name: 'Editado', assignedTo: bruno.id },
      cookie,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: 'Editado', assignedTo: ana.id });
  });

  it('mantendo o próprio e-mail e CPF → 200', async () => {
    const cookie = await loginCookie(ana.email);

    const response = await send(
      'PUT',
      `/api/students/${doAna.id}`,
      { email: 'ALUNO.ANA@x.com', cpf: CPF_VALIDO_MASCARA },
      cookie,
    );

    expect(response.status).toBe(200);
  });

  it('e-mail de outro aluno → 409 EMAIL_IN_USE', async () => {
    const cookie = await loginCookie(admin.email);

    await expectErrorCode(
      await send('PUT', `/api/students/${doAna.id}`, { email: 'aluno.bruno@x.com' }, cookie),
      409,
      'EMAIL_IN_USE',
    );
  });
});

describe('POST e PUT sem sessão', () => {
  it('→ 401', async () => {
    await startApp([]);

    await expectErrorCode(
      await send('POST', '/api/students', { name: 'A', email: 'a@x.com' }),
      401,
      'UNAUTHORIZED',
    );
    await expectErrorCode(
      await send('PUT', `/api/students/${randomUUID()}`, { name: 'A' }),
      401,
      'UNAUTHORIZED',
    );
  });

  it('sem sessão e corpo inválido → 401, não 400 (autorização antes da validação)', async () => {
    await startApp([]);

    await expectErrorCode(await send('POST', '/api/students', {}), 401, 'UNAUTHORIZED');
  });
});

// ---------------------------------------------------------------------------
// Review da TASK-008 (S6-10, strings vazias, mass assignment) e TASK-009 (DELETE)
// ---------------------------------------------------------------------------

const del = (path: string, cookie?: string): Promise<Response> =>
  fetch(`${baseUrl}${path}`, { method: 'DELETE', headers: cookie ? { cookie } : {} });

describe('S6-10: atribuição a usuário desativado (HTTP)', () => {
  let inativo: User;
  let doAna: Student;
  let doInativo: Student;

  beforeEach(async () => {
    inativo = makeUser({
      name: 'Carlos',
      email: 'carlos@exemplo.com',
      passwordHash,
      role: UserRole.vendedor,
      isActive: false,
    });
    doAna = makeStudent({ assignedTo: ana.id });
    doInativo = makeStudent({ name: 'Do Carlos', assignedTo: inativo.id });
    await startApp([doAna, doInativo], {}, [admin, ceo, ana, bruno, inativo]);
  });

  it('POST com usuário inativo → 400 com details.assignedTo', async () => {
    const cookie = await loginCookie(admin.email);

    await expectValidation(
      await send(
        'POST',
        '/api/students',
        { name: 'A', email: 'a@x.com', assignedTo: inativo.id },
        cookie,
      ),
      'assignedTo',
    );
  });

  it('PUT trocando para usuário inativo → 400', async () => {
    const cookie = await loginCookie(ceo.email);

    await expectValidation(
      await send('PUT', `/api/students/${doAna.id}`, { assignedTo: inativo.id }, cookie),
      'assignedTo',
    );
  });

  it('PUT de outro campo em aluno cujo responsável ficou inativo → 200', async () => {
    const cookie = await loginCookie(admin.email);

    const response = await send('PUT', `/api/students/${doInativo.id}`, { notes: 'ok' }, cookie);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ notes: 'ok', assignedTo: inativo.id });
  });
});

describe('String vazia vira null', () => {
  beforeEach(async () => {
    await startApp([
      makeStudent({ email: 'um@x.com', cpf: CPF_VALIDO }),
      makeStudent({ email: 'dois@x.com', cpf: '11144477735' }),
    ]);
  });

  it("POST { phone: '', cpf: '  ', notes: '' } → 201 com os três null", async () => {
    const cookie = await loginCookie(admin.email);

    const response = await send(
      'POST',
      '/api/students',
      { name: 'Vazio', email: 'vazio@x.com', phone: '', cpf: '  ', notes: '' },
      cookie,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ phone: null, cpf: null, notes: null });
  });

  it("dois alunos com PUT cpf: '' → 200 nos dois (sem colisão no @unique)", async () => {
    const cookie = await loginCookie(admin.email);
    const lista = await getJson<StudentListResponse>('/api/students', cookie);

    for (const aluno of lista.data) {
      const response = await send('PUT', `/api/students/${aluno.id}`, { cpf: '' }, cookie);

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ cpf: null });
    }
    expect(lista.data).toHaveLength(2);
  });
});

describe('Mass assignment: id, createdAt, updatedAt e lastContactDate do corpo são ignorados', () => {
  const forjados = {
    id: '00000000-0000-4000-8000-000000000000',
    createdAt: '2000-01-01T00:00:00.000Z',
    updatedAt: '2000-01-01T00:00:00.000Z',
    lastContactDate: '2000-01-01T00:00:00.000Z',
  };

  it('POST: id gerado pelo servidor e datas não sobrescritas', async () => {
    await startApp([]);
    const cookie = await loginCookie(admin.email);

    const response = await send(
      'POST',
      '/api/students',
      { name: 'A', email: 'a@x.com', ...forjados },
      cookie,
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as StudentResponse;
    expect(body.id).not.toBe(forjados.id);
    expect(body.createdAt).not.toBe(forjados.createdAt);
    expect(body.updatedAt).not.toBe(forjados.updatedAt);
    expect(body.lastContactDate).toBeNull();
    expect((await get(`/api/students/${forjados.id}`, cookie)).status).toBe(404);
  });

  it('PUT: id e datas continuam os do registro', async () => {
    const aluno = makeStudent({ name: 'Original' });
    await startApp([aluno]);
    const cookie = await loginCookie(admin.email);

    const response = await send(
      'PUT',
      `/api/students/${aluno.id}`,
      { name: 'Editado', ...forjados },
      cookie,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as StudentResponse;
    expect(body).toMatchObject({
      id: aluno.id,
      name: 'Editado',
      createdAt: aluno.createdAt.toISOString(),
      lastContactDate: null,
    });
    expect(body.updatedAt).not.toBe(forjados.updatedAt);
  });
});

describe('Senha provisória nas rotas de escrita', () => {
  it('POST, PUT e DELETE → 403 PASSWORD_CHANGE_REQUIRED', async () => {
    const pendente = makeUser({
      email: 'pendente@exemplo.com',
      passwordHash,
      role: UserRole.admin,
      mustChangePassword: true,
    });
    const aluno = makeStudent();

    await startApp([aluno], {}, [pendente]);
    const cookie = await loginCookie(pendente.email);

    await expectErrorCode(
      await send('POST', '/api/students', { name: 'A', email: 'a@x.com' }, cookie),
      403,
      'PASSWORD_CHANGE_REQUIRED',
    );
    await expectErrorCode(
      await send('PUT', `/api/students/${aluno.id}`, { name: 'A' }, cookie),
      403,
      'PASSWORD_CHANGE_REQUIRED',
    );
    await expectErrorCode(
      await del(`/api/students/${aluno.id}`, cookie),
      403,
      'PASSWORD_CHANGE_REQUIRED',
    );
  });
});

describe('DELETE /api/students/:id (TASK-009)', () => {
  let doAna: Student;
  let doBruno: Student;

  beforeEach(async () => {
    doAna = makeStudent({ name: 'Aluno da Ana', assignedTo: ana.id });
    doBruno = makeStudent({ name: 'Aluno do Bruno', assignedTo: bruno.id });
    const course = makeCourse();

    await startApp([doAna, doBruno], {
      courses: [course],
      purchases: [makePurchase({ studentId: doAna.id, courseId: course.id })],
      pipelineLeads: [makeLead({ studentId: doAna.id, assignedTo: ana.id })],
      tasks: [makeTask({ assignedTo: ana.id, relatedTo: doAna.id })],
    });
  });

  it('admin exclui → 204 sem corpo; o aluno some da listagem e do detalhe (404)', async () => {
    const cookie = await loginCookie(admin.email);

    const response = await del(`/api/students/${doAna.id}`, cookie);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    await expectErrorCode(await get(`/api/students/${doAna.id}`, cookie), 404, 'NOT_FOUND');
    const lista = await getJson<StudentListResponse>('/api/students', cookie);
    expect(lista.data.map((s) => s.id)).toEqual([doBruno.id]);
  });

  it('admin exclui → grava STUDENT_DELETED com o ator e o snapshot', async () => {
    const cookie = await loginCookie(admin.email);

    expect((await del(`/api/students/${doAna.id}`, cookie)).status).toBe(204);

    const deleted = auditLogs.entries.filter(
      (entry) => entry.action === AuditAction.STUDENT_DELETED,
    );
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toMatchObject({
      actorId: admin.id,
      metadata: {
        student: { id: doAna.id, name: 'Aluno da Ana', email: doAna.email },
        cascade: { purchases: 1, pipelineLeads: 1, tasks: 1 },
      },
    });
  });

  it('auditoria falha → 500 e o aluno continua existindo (exclusão desfeita)', async () => {
    const cookie = await loginCookie(admin.email);
    jest.spyOn(auditLogs, 'record').mockRejectedValueOnce(new Error('auditoria indisponível'));

    await expectErrorCode(await del(`/api/students/${doAna.id}`, cookie), 500, 'INTERNAL_ERROR');

    expect((await get(`/api/students/${doAna.id}`, cookie)).status).toBe(200);
    expect(
      auditLogs.entries.filter((entry) => entry.action === AuditAction.STUDENT_DELETED),
    ).toHaveLength(0);
  });

  it('404 e 403 no DELETE não gravam STUDENT_DELETED', async () => {
    await expectErrorCode(
      await del(`/api/students/${randomUUID()}`, await loginCookie(admin.email)),
      404,
      'NOT_FOUND',
    );
    await expectErrorCode(
      await del(`/api/students/${doAna.id}`, await loginCookie(ceo.email)),
      403,
      'FORBIDDEN',
    );

    expect(
      auditLogs.entries.filter((entry) => entry.action === AuditAction.STUDENT_DELETED),
    ).toHaveLength(0);
  });

  it('excluir de novo o mesmo aluno → 404', async () => {
    const cookie = await loginCookie(admin.email);

    expect((await del(`/api/students/${doAna.id}`, cookie)).status).toBe(204);
    await expectErrorCode(await del(`/api/students/${doAna.id}`, cookie), 404, 'NOT_FOUND');
  });

  it.each([
    ['vendedor dono do aluno', () => ana],
    ['CEO', () => ceo],
  ])('%s → 403 FORBIDDEN e o aluno continua existindo', async (_papel, user) => {
    const cookie = await loginCookie(user().email);

    await expectErrorCode(await del(`/api/students/${doAna.id}`, cookie), 403, 'FORBIDDEN');

    const adminCookie = await loginCookie(admin.email);
    expect((await get(`/api/students/${doAna.id}`, adminCookie)).status).toBe(200);
  });

  it('vendedor com id inválido ou inexistente → 403 (autorização antes da validação)', async () => {
    const cookie = await loginCookie(ana.email);

    await expectErrorCode(await del('/api/students/nao-e-uuid', cookie), 403, 'FORBIDDEN');
    await expectErrorCode(await del(`/api/students/${randomUUID()}`, cookie), 403, 'FORBIDDEN');
  });

  it('inexistente → 404; id que não é uuid → 400', async () => {
    const cookie = await loginCookie(admin.email);

    await expectErrorCode(await del(`/api/students/${randomUUID()}`, cookie), 404, 'NOT_FOUND');
    await expectErrorCode(await del('/api/students/nao-e-uuid', cookie), 400, 'VALIDATION_ERROR');
  });

  it('sem sessão → 401', async () => {
    await expectErrorCode(await del(`/api/students/${doAna.id}`), 401, 'UNAUTHORIZED');
  });
});
