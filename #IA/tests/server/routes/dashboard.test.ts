import { Prisma, StudentStatus } from '@prisma/client';

import { lastMonths, resolvePeriod } from '@server/services/dashboardService';
import type { DashboardMetricsResponse } from '@server/types/dashboard';
import { addDays, todayDateOnly } from '@server/utils/dates';

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

const today = todayDateOnly();
const daysAgo = (days: number) => new Date(`${addDays(today, -days)}T15:00:00.000Z`);
const dateOnly = (days: number) => new Date(`${addDays(today, -days)}T00:00:00.000Z`);

async function scenario(): Promise<RunningApp> {
  const delphi = makeCourse({ name: 'Delphi' });
  const react = makeCourse({ name: 'React' });
  const anaNovo = makeStudent({ assignedTo: users.ana.id, createdAt: daysAgo(2) });
  const anaAntigo = makeStudent({
    assignedTo: users.ana.id,
    createdAt: daysAgo(200),
    status: StudentStatus.inativo,
  });
  const brunoNovo = makeStudent({ assignedTo: users.bruno.id, createdAt: daysAgo(10) });
  const brunoAntigo = makeStudent({ assignedTo: users.bruno.id, createdAt: daysAgo(60) });

  app = await startRouteApp({
    users: Object.values(users),
    students: [anaNovo, anaAntigo, brunoNovo, brunoAntigo],
    courses: [delphi, react],
    purchases: [
      makePurchase({
        studentId: anaNovo.id,
        courseId: delphi.id,
        purchaseDate: dateOnly(1),
        amount: new Prisma.Decimal('100.50'),
      }),
      makePurchase({
        studentId: brunoNovo.id,
        courseId: delphi.id,
        purchaseDate: dateOnly(5),
        amount: new Prisma.Decimal('200.00'),
      }),
      makePurchase({
        studentId: brunoAntigo.id,
        courseId: react.id,
        purchaseDate: dateOnly(45),
        amount: new Prisma.Decimal('300.00'),
      }),
    ],
  });

  return app;
}

async function metrics(running: RunningApp, email: string, query = ''): Promise<DashboardMetricsResponse> {
  const cookie = await running.login(email);
  const response = await running.request('GET', `/api/dashboard/metrics${query}`, cookie);

  expect(response.status).toBe(200);

  return (await response.json()) as DashboardMetricsResponse;
}

describe('GET /api/dashboard/metrics', () => {
  it('admin vê a base inteira nos últimos 30 dias (padrão)', async () => {
    const body = await metrics(await scenario(), users.admin.email);

    expect(body.period).toEqual({ from: addDays(today, -29), to: today });
    expect(body).toMatchObject({
      totalStudents: 4,
      newStudents: 2,
      activeStudents: 3,
      activityRate: 75,
      totalRevenue: 600.5,
      periodRevenue: 300.5,
    });
    expect(body.studentsByCourse).toEqual([
      expect.objectContaining({ courseName: 'Delphi', count: 2 }),
      expect.objectContaining({ courseName: 'React', count: 1 }),
    ]);
    expect(body.revenueByMonth).toHaveLength(12);
    expect(body.revenueByMonth.reduce((sum, month) => sum + month.revenue, 0)).toBeCloseTo(600.5);
  });

  it('7 dias e período personalizado', async () => {
    const running = await scenario();

    const seven = await metrics(running, users.admin.email, '?period=7days');
    expect(seven).toMatchObject({ newStudents: 1, periodRevenue: 300.5 });

    const custom = await metrics(
      running,
      users.admin.email,
      `?period=custom&from=${addDays(today, -50)}&to=${addDays(today, -40)}`,
    );
    expect(custom).toMatchObject({ newStudents: 0, periodRevenue: 300 });
  });

  it('vendedor vê só os números dos próprios alunos', async () => {
    const body = await metrics(await scenario(), users.ana.email);

    expect(body).toMatchObject({
      totalStudents: 2,
      activeStudents: 1,
      activityRate: 50,
      totalRevenue: 100.5,
    });
    expect(body.studentsByCourse).toEqual([expect.objectContaining({ courseName: 'Delphi', count: 1 })]);
  });

  it('base vazia não divide por zero', async () => {
    app = await startRouteApp({ users: Object.values(users) });

    expect(await metrics(app, users.ceo.email)).toMatchObject({ totalStudents: 0, activityRate: 0 });
  });

  it.each([
    ['?period=custom', 'period'],
    ['?period=custom&from=2026-09-10&to=2026-09-01', 'from'],
    ['?period=365days', 'period'],
  ])('query inválida %s → 400', async (query, field) => {
    app = await startRouteApp({ users: Object.values(users) });
    const cookie = await app.login(users.admin.email);

    const response = await app.request('GET', `/api/dashboard/metrics${query}`, cookie);
    const body = (await response.json()) as { details: Record<string, string> };

    expect(response.status).toBe(400);
    expect(body.details[field]).toBeDefined();
  });
});

describe('helpers do dashboard', () => {
  it('resolvePeriod e lastMonths', () => {
    expect(resolvePeriod({ period: '7days' }, '2026-09-14')).toEqual({
      from: '2026-09-08',
      to: '2026-09-14',
    });
    expect(lastMonths('2026-02-10', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });
});
