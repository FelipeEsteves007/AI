import { AuditAction, StudentStatus } from '@prisma/client';

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

async function scenario() {
  const delphi = makeCourse({ name: 'Delphi' });
  const react = makeCourse({ name: 'React' });
  const joao = makeStudent({
    name: 'João "Jota"; Silva',
    email: 'joao@exemplo.com',
    cpf: '01234567890',
    phone: '11 99999-0000',
    assignedTo: users.ana.id,
    createdAt: new Date('2026-09-01T12:00:00Z'),
  });
  const ana = makeStudent({
    name: 'Ana',
    email: 'ana.aluna@exemplo.com',
    status: StudentStatus.inativo,
    assignedTo: users.bruno.id,
  });

  app = await startRouteApp({
    users: Object.values(users),
    students: [joao, ana],
    courses: [delphi, react],
    purchases: [
      makePurchase({ studentId: joao.id, courseId: delphi.id, purchaseDate: new Date('2026-01-01T00:00:00Z') }),
      makePurchase({ studentId: joao.id, courseId: react.id, purchaseDate: new Date('2026-08-01T00:00:00Z') }),
    ],
  });

  return app;
}

async function exportCsv(running: RunningApp, email: string, query = '') {
  const cookie = await running.login(email);
  return running.request('GET', `/api/reports/students-export${query}`, cookie);
}

describe('GET /api/reports/students-export', () => {
  it('admin baixa CSV para Excel: BOM, ;, CRLF, CPF como texto e cursos', async () => {
    const running = await scenario();

    const response = await exportCsv(running, users.admin.email);
    // `Response.text()` descarta o BOM ao decodificar; os bytes crus mostram se ele foi enviado.
    const bytes = new Uint8Array(await response.arrayBuffer());
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
    const lines = text.slice(1).split('\r\n');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toMatch(/attachment; filename="alunos-\d{4}-\d{2}-\d{2}\.csv"/);
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(lines[0]).toBe('Nome;E-mail;Telefone;CPF;Status;Vendedor;Cursos;Data de cadastro');
    expect(lines[1]).toBe('Ana;ana.aluna@exemplo.com;;;Inativo;Bruno;;01/09/2026');
    expect(lines[2]).toBe(
      '"João ""Jota""; Silva";joao@exemplo.com;11 99999-0000;="01234567890";Ativo;Ana;React, Delphi;01/09/2026',
    );
    expect(running.auditLogs.entries).toContainEqual(
      expect.objectContaining({ action: AuditAction.STUDENTS_EXPORTED, metadata: expect.objectContaining({ rows: 2 }) }),
    );
  });

  it('respeita os filtros da tela (status, busca, vendedor)', async () => {
    const running = await scenario();
    const cookie = await running.login(users.ceo.email);
    const count = async (query: string) =>
      (await (await running.request('GET', `/api/reports/students-export${query}`, cookie)).text())
        .trim()
        .split('\r\n').length - 1;

    expect(await count('?status=inativo')).toBe(1);
    expect(await count('?search=joao')).toBe(1);
    expect(await count(`?assignedTo=${users.ana.id}`)).toBe(1);
  });

  it('vendedor → 403; formato diferente de csv → 400', async () => {
    const running = await scenario();

    expect((await exportCsv(running, users.ana.email)).status).toBe(403);
    expect((await exportCsv(running, users.admin.email, '?format=pdf')).status).toBe(400);
  });
});
