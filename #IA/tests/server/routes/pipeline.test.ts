import { LeadStatus, Prisma } from '@prisma/client';

import type { LeadResponse, PipelineListResponse } from '@server/types/pipeline';

import { makeLead, makeStudent } from '../helpers/studentFixture';
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

async function scenario() {
  const alunoAna = makeStudent({ name: 'Aluno da Ana', assignedTo: users.ana.id });
  const alunoBruno = makeStudent({ name: 'Aluno do Bruno', assignedTo: users.bruno.id });
  const leadAna = makeLead({
    studentId: alunoAna.id,
    assignedTo: users.ana.id,
    value: new Prisma.Decimal('500.00'),
    createdAt: new Date('2026-09-10T15:00:00Z'),
  });
  const leadAnaVendido = makeLead({
    studentId: alunoAna.id,
    assignedTo: users.ana.id,
    status: LeadStatus.sold,
    value: new Prisma.Decimal('997.00'),
    createdAt: new Date('2026-08-01T15:00:00Z'),
  });
  const leadBruno = makeLead({
    studentId: alunoBruno.id,
    assignedTo: users.bruno.id,
    value: new Prisma.Decimal('250.00'),
    createdAt: new Date('2026-09-12T15:00:00Z'),
  });

  app = await startRouteApp({
    users: Object.values(users),
    students: [alunoAna, alunoBruno],
    leads: [leadAna, leadAnaVendido, leadBruno],
  });

  return { running: app, alunoAna, alunoBruno, leadAna, leadBruno };
}

describe('GET /api/pipeline', () => {
  it('admin vê todos, com nomes e totais por coluna', async () => {
    const { running } = await scenario();
    const cookie = await running.login(users.admin.email);

    const body = (await (await running.request('GET', '/api/pipeline', cookie)).json()) as PipelineListResponse;

    expect(body.data).toHaveLength(3);
    expect(body.data[0]).toMatchObject({ studentName: 'Aluno do Bruno', assignedToName: 'Bruno' });
    expect(body.summary).toEqual({
      prospecting: { count: 2, total: 750 },
      negotiation: { count: 0, total: 0 },
      sold: { count: 1, total: 997 },
      lost: { count: 0, total: 0 },
    });
  });

  it('vendedor vê só os próprios, mesmo pedindo outro vendedor', async () => {
    const { running } = await scenario();
    const cookie = await running.login(users.ana.email);

    const response = await running.request('GET', `/api/pipeline?assignedTo=${users.bruno.id}`, cookie);
    const body = (await response.json()) as PipelineListResponse;

    expect(body.data.map((lead) => lead.assignedTo)).toEqual([users.ana.id, users.ana.id]);
  });

  it('filtros por vendedor e período (admin)', async () => {
    const { running } = await scenario();
    const cookie = await running.login(users.admin.email);

    const byUser = (await (
      await running.request('GET', `/api/pipeline?assignedTo=${users.bruno.id}`, cookie)
    ).json()) as PipelineListResponse;
    expect(byUser.data).toHaveLength(1);

    const byPeriod = (await (
      await running.request('GET', '/api/pipeline?from=2026-09-01&to=2026-09-30', cookie)
    ).json()) as PipelineListResponse;
    expect(byPeriod.data).toHaveLength(2);
  });
});

describe('POST /api/pipeline', () => {
  it('vendedor cria lead para o próprio aluno, sempre como responsável', async () => {
    const { running, alunoAna } = await scenario();
    const cookie = await running.login(users.ana.email);

    const response = await running.request('POST', '/api/pipeline', cookie, {
      studentId: alunoAna.id,
      value: '1200,00'.replace(',', '.'),
      assignedTo: users.bruno.id,
    });
    const body = (await response.json()) as LeadResponse;

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ status: 'prospecting', value: 1200, assignedTo: users.ana.id });
  });

  it('vendedor não cria lead para aluno de outro → 404', async () => {
    const { running, alunoBruno } = await scenario();
    const cookie = await running.login(users.ana.email);

    const response = await running.request('POST', '/api/pipeline', cookie, { studentId: alunoBruno.id });

    expect(response.status).toBe(404);
  });

  it('admin atribui a outro vendedor', async () => {
    const { running, alunoAna } = await scenario();
    const cookie = await running.login(users.admin.email);

    const response = await running.request('POST', '/api/pipeline', cookie, {
      studentId: alunoAna.id,
      assignedTo: users.bruno.id,
    });

    expect(((await response.json()) as LeadResponse).assignedTo).toBe(users.bruno.id);
  });
});

describe('PUT /api/pipeline/:id/status e /:id', () => {
  it('muda o status; lost guarda o motivo e sair de lost limpa', async () => {
    const { running, leadAna } = await scenario();
    const cookie = await running.login(users.ana.email);

    const lost = await running.request('PUT', `/api/pipeline/${leadAna.id}/status`, cookie, {
      status: 'lost',
      lostReason: 'Sem orçamento',
    });
    expect((await lost.json()) as LeadResponse).toMatchObject({ status: 'lost', lostReason: 'Sem orçamento' });

    const back = await running.request('PUT', `/api/pipeline/${leadAna.id}/status`, cookie, {
      status: 'negotiation',
    });
    expect((await back.json()) as LeadResponse).toMatchObject({ status: 'negotiation', lostReason: null });
  });

  it('vendido não gera compra (S8-1)', async () => {
    const { running, leadAna } = await scenario();
    const cookie = await running.login(users.ana.email);

    await running.request('PUT', `/api/pipeline/${leadAna.id}/status`, cookie, { status: 'sold' });

    expect(running.catalog.snapshot().purchases).toHaveLength(0);
  });

  it('vendedor não mexe em lead de outro → 404', async () => {
    const { running, leadBruno } = await scenario();
    const cookie = await running.login(users.ana.email);

    const response = await running.request('PUT', `/api/pipeline/${leadBruno.id}/status`, cookie, {
      status: 'sold',
    });

    expect(response.status).toBe(404);
    expect(running.leads.rows.find((lead) => lead.id === leadBruno.id)?.status).toBe('prospecting');
  });

  it('status inválido → 400; edição de valor funciona', async () => {
    const { running, leadAna } = await scenario();
    const cookie = await running.login(users.ana.email);

    const invalid = await running.request('PUT', `/api/pipeline/${leadAna.id}/status`, cookie, {
      status: 'ganho',
    });
    expect(invalid.status).toBe(400);

    const edited = await running.request('PUT', `/api/pipeline/${leadAna.id}`, cookie, { value: 750 });
    expect(((await edited.json()) as LeadResponse).value).toBe(750);
  });
});
