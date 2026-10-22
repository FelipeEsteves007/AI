import { Prisma } from '@prisma/client';

import type { PurchaseResponse } from '@server/types/courses';
import { todayDateOnly } from '@server/utils/dates';

import { makeCourse, makePurchase, makeStudent } from '../helpers/studentFixture';
import {
  makeTestUsers,
  startRouteApp,
  TEST_SECRET,
  type RunningApp,
  type TestUsers,
} from '../helpers/routeTestKit';

const originalEnv = { ...process.env };
const UNKNOWN_ID = '2b1f6c1e-7c4c-4d7e-9a57-3f1b2b8f0a11';

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

function tomorrow(): string {
  const date = new Date(`${todayDateOnly()}T12:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString().slice(0, 10);
}

describe('POST /api/students/:id/purchases', () => {
  const setup = async () => {
    const course = makeCourse({ name: 'Delphi', price: new Prisma.Decimal('497.00') });
    const deAna = makeStudent({ assignedTo: users.ana.id });
    const deBruno = makeStudent({ assignedTo: users.bruno.id });

    app = await startRouteApp({
      users: Object.values(users),
      students: [deAna, deBruno],
      courses: [course],
    });

    return { running: app, course, deAna, deBruno };
  };

  it('cria a compra; sem amount usa o preço do curso', async () => {
    const { running, course, deAna } = await setup();
    const cookie = await running.login(users.admin.email);

    const response = await running.request('POST', `/api/students/${deAna.id}/purchases`, cookie, {
      courseId: course.id,
      purchaseDate: '2026-08-10',
    });
    const body = (await response.json()) as PurchaseResponse;

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      studentId: deAna.id,
      courseId: course.id,
      courseName: 'Delphi',
      purchaseDate: '2026-08-10',
      amount: 497,
      notes: null,
    });
  });

  it('aceita a data de hoje e um valor informado', async () => {
    const { running, course, deAna } = await setup();
    const cookie = await running.login(users.ana.email);

    const response = await running.request('POST', `/api/students/${deAna.id}/purchases`, cookie, {
      courseId: course.id,
      purchaseDate: todayDateOnly(),
      amount: 300.5,
      notes: 'Cupom',
    });

    expect(response.status).toBe(201);
    expect(((await response.json()) as PurchaseResponse).amount).toBe(300.5);
  });

  it('mesmo curso duas vezes → 409 PURCHASE_DUPLICATE', async () => {
    const { running, course, deAna } = await setup();
    const cookie = await running.login(users.admin.email);
    const payload = { courseId: course.id, purchaseDate: '2026-08-10' };

    await running.request('POST', `/api/students/${deAna.id}/purchases`, cookie, payload);
    const response = await running.request(
      'POST',
      `/api/students/${deAna.id}/purchases`,
      cookie,
      payload,
    );

    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe('PURCHASE_DUPLICATE');
    expect(running.catalog.snapshot().purchases).toHaveLength(1);
  });

  it('data futura → 400 em purchaseDate', async () => {
    const { running, course, deAna } = await setup();
    const cookie = await running.login(users.admin.email);

    const response = await running.request('POST', `/api/students/${deAna.id}/purchases`, cookie, {
      courseId: course.id,
      purchaseDate: tomorrow(),
    });
    const body = (await response.json()) as { details: Record<string, string> };

    expect(response.status).toBe(400);
    expect(body.details.purchaseDate).toBe('A data da compra não pode ser futura');
  });

  it.each(['2026-02-30', '10/08/2026', ''])('data inválida %j → 400', async (purchaseDate) => {
    const { running, course, deAna } = await setup();
    const cookie = await running.login(users.admin.email);

    const response = await running.request('POST', `/api/students/${deAna.id}/purchases`, cookie, {
      courseId: course.id,
      purchaseDate,
    });

    expect(response.status).toBe(400);
  });

  it('curso inexistente → 404', async () => {
    const { running, deAna } = await setup();
    const cookie = await running.login(users.admin.email);

    const response = await running.request('POST', `/api/students/${deAna.id}/purchases`, cookie, {
      courseId: UNKNOWN_ID,
      purchaseDate: '2026-08-10',
    });

    expect(response.status).toBe(404);
    expect(((await response.json()) as { error: string }).error).toBe('Curso não encontrado');
  });

  it('vendedor não registra compra em aluno de outro vendedor → 404', async () => {
    const { running, course, deBruno } = await setup();
    const cookie = await running.login(users.ana.email);

    const response = await running.request(
      'POST',
      `/api/students/${deBruno.id}/purchases`,
      cookie,
      { courseId: course.id, purchaseDate: '2026-08-10' },
    );

    expect(response.status).toBe(404);
    expect(running.catalog.snapshot().purchases).toHaveLength(0);
  });
});

describe('GET /api/students/:id/purchases', () => {
  it('lista da mais recente para a mais antiga, com o nome do curso', async () => {
    const delphi = makeCourse({ name: 'Delphi' });
    const react = makeCourse({ name: 'React' });
    const student = makeStudent({ assignedTo: users.ana.id });

    app = await startRouteApp({
      users: Object.values(users),
      students: [student],
      courses: [delphi, react],
      purchases: [
        makePurchase({
          studentId: student.id,
          courseId: delphi.id,
          purchaseDate: new Date('2026-01-10T00:00:00Z'),
        }),
        makePurchase({
          studentId: student.id,
          courseId: react.id,
          purchaseDate: new Date('2026-07-01T00:00:00Z'),
          amount: new Prisma.Decimal('120.00'),
        }),
      ],
    });
    const cookie = await app.login(users.ana.email);

    const response = await app.request('GET', `/api/students/${student.id}/purchases`, cookie);
    const body = (await response.json()) as { data: PurchaseResponse[] };

    expect(response.status).toBe(200);
    expect(body.data.map((purchase) => [purchase.courseName, purchase.purchaseDate])).toEqual([
      ['React', '2026-07-01'],
      ['Delphi', '2026-01-10'],
    ]);
    expect(body.data[0]?.amount).toBe(120);
  });

  it('aluno de outro vendedor → 404', async () => {
    const student = makeStudent({ assignedTo: users.bruno.id });

    app = await startRouteApp({ users: Object.values(users), students: [student] });
    const cookie = await app.login(users.ana.email);

    expect((await app.request('GET', `/api/students/${student.id}/purchases`, cookie)).status).toBe(
      404,
    );
  });
});
