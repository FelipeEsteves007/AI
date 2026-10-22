import { Prisma, type Course, type Purchase } from '@prisma/client';

import type { CourseListResponse, CourseResponse } from '@server/types/courses';

import { makeCourse, makePurchase, makeStudent } from '../helpers/studentFixture';
import {
  makeTestUsers,
  startRouteApp,
  TEST_SECRET,
  type RunningApp,
  type TestUsers,
} from '../helpers/routeTestKit';

const originalEnv = { ...process.env };

let users: TestUsers;
let app: RunningApp | undefined;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_SECRET;
  users = await makeTestUsers();
});

afterAll(() => {
  process.env = { ...originalEnv };
});

afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function start(courses: Course[] = [], purchases: Purchase[] = []): Promise<RunningApp> {
  app = await startRouteApp({ users: Object.values(users), courses, purchases });

  return app;
}

describe('GET /api/courses', () => {
  it('lista por nome, com paginação e preço como número', async () => {
    const running = await start([
      makeCourse({ name: 'Delphi', price: new Prisma.Decimal('497.90') }),
      makeCourse({ name: 'Angular', isActive: false }),
    ]);
    const cookie = await running.login(users.admin.email);

    const response = await running.request('GET', '/api/courses', cookie);
    const body = (await response.json()) as CourseListResponse;

    expect(response.status).toBe(200);
    expect(body.data.map((course) => course.name)).toEqual(['Angular', 'Delphi']);
    expect(body.data[1]?.price).toBe(497.9);
    expect(body.pagination).toEqual({ page: 1, limit: 50, total: 2, totalPages: 1 });
  });

  it('filtra por isActive', async () => {
    const running = await start([
      makeCourse({ name: 'Ativo' }),
      makeCourse({ name: 'Inativo', isActive: false }),
    ]);
    const cookie = await running.login(users.ana.email);

    const response = await running.request('GET', '/api/courses?isActive=true', cookie);
    const body = (await response.json()) as CourseListResponse;

    expect(body.data.map((course) => course.name)).toEqual(['Ativo']);
  });

  it('vendedor pode listar (precisa escolher o curso da compra)', async () => {
    const running = await start([makeCourse()]);
    const cookie = await running.login(users.bruno.email);

    expect((await running.request('GET', '/api/courses', cookie)).status).toBe(200);
  });

  it('sem sessão → 401', async () => {
    const running = await start();

    expect((await running.request('GET', '/api/courses')).status).toBe(401);
  });
});

describe('POST /api/courses', () => {
  it('admin cria com preço normalizado em 2 casas', async () => {
    const running = await start();
    const cookie = await running.login(users.admin.email);

    const response = await running.request('POST', '/api/courses', cookie, {
      name: '  Claude Code  ',
      price: '1997.5',
    });
    const body = (await response.json()) as CourseResponse;

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      name: 'Claude Code',
      description: null,
      price: 1997.5,
      isActive: true,
    });
    expect(running.catalog.snapshot().courses[0]?.price.toFixed(2)).toBe('1997.50');
  });

  it.each([
    [{ price: 100 }, 'name'],
    [{ name: 'Curso' }, 'price'],
    [{ name: 'Curso', price: -1 }, 'price'],
    [{ name: 'Curso', price: '10.999' }, 'price'],
    [{ name: 'Curso', price: 'abc' }, 'price'],
  ])('corpo inválido %j → 400 em %s', async (payload, field) => {
    const running = await start();
    const cookie = await running.login(users.admin.email);

    const response = await running.request('POST', '/api/courses', cookie, payload);
    const body = (await response.json()) as { code: string; details: Record<string, string> };

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details[field]).toBeDefined();
  });

  it.each(['ceo', 'ana'] as const)('%s → 403 e nada é criado', async (who) => {
    const running = await start();
    const cookie = await running.login(users[who].email);

    const response = await running.request('POST', '/api/courses', cookie, {
      name: 'Curso',
      price: 10,
    });

    expect(response.status).toBe(403);
    expect(running.catalog.snapshot().courses).toHaveLength(0);
  });
});

describe('PUT /api/courses/:id', () => {
  it('admin edita só o que veio', async () => {
    const course = makeCourse({ name: 'Antigo', description: 'Desc' });
    const running = await start([course]);
    const cookie = await running.login(users.admin.email);

    const response = await running.request('PUT', `/api/courses/${course.id}`, cookie, {
      name: 'Novo',
      isActive: false,
    });
    const body = (await response.json()) as CourseResponse;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ name: 'Novo', description: 'Desc', isActive: false, price: 997 });
  });

  it('corpo vazio → 400', async () => {
    const course = makeCourse();
    const running = await start([course]);
    const cookie = await running.login(users.admin.email);

    expect((await running.request('PUT', `/api/courses/${course.id}`, cookie, {})).status).toBe(
      400,
    );
  });

  it('inexistente → 404', async () => {
    const running = await start();
    const cookie = await running.login(users.admin.email);

    const response = await running.request(
      'PUT',
      '/api/courses/2b1f6c1e-7c4c-4d7e-9a57-3f1b2b8f0a11',
      cookie,
      { name: 'X' },
    );

    expect(response.status).toBe(404);
  });

  it('vendedor → 403', async () => {
    const course = makeCourse();
    const running = await start([course]);
    const cookie = await running.login(users.ana.email);

    expect(
      (await running.request('PUT', `/api/courses/${course.id}`, cookie, { name: 'X' })).status,
    ).toBe(403);
  });
});

describe('DELETE /api/courses/:id', () => {
  it('admin exclui curso sem compras → 204', async () => {
    const course = makeCourse();
    const running = await start([course]);
    const cookie = await running.login(users.admin.email);

    expect((await running.request('DELETE', `/api/courses/${course.id}`, cookie)).status).toBe(
      204,
    );
    expect(running.catalog.snapshot().courses).toHaveLength(0);
  });

  it('curso com compras → 409 COURSE_HAS_PURCHASES e continua existindo', async () => {
    const course = makeCourse();
    const student = makeStudent();
    const running = await start(
      [course],
      [makePurchase({ studentId: student.id, courseId: course.id })],
    );
    const cookie = await running.login(users.admin.email);

    const response = await running.request('DELETE', `/api/courses/${course.id}`, cookie);

    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe('COURSE_HAS_PURCHASES');
    expect(running.catalog.snapshot().courses).toHaveLength(1);
  });

  it('inexistente → 404', async () => {
    const running = await start();
    const cookie = await running.login(users.admin.email);

    const response = await running.request(
      'DELETE',
      '/api/courses/2b1f6c1e-7c4c-4d7e-9a57-3f1b2b8f0a11',
      cookie,
    );

    expect(response.status).toBe(404);
  });

  it.each(['ceo', 'bruno'] as const)('%s → 403', async (who) => {
    const course = makeCourse();
    const running = await start([course]);
    const cookie = await running.login(users[who].email);

    expect((await running.request('DELETE', `/api/courses/${course.id}`, cookie)).status).toBe(
      403,
    );
  });
});
