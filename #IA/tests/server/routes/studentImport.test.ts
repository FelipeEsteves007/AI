import { AuditAction, StudentStatus } from '@prisma/client';

import type { StudentImportResponse } from '@server/types/students';

import { makeStudent } from '../helpers/studentFixture';
import {
  makeTestUsers,
  startRouteApp,
  TEST_SECRET,
  type RunningApp,
  type TestUsers,
} from '../helpers/routeTestKit';
import { makeUser } from '../helpers/userFixture';

const originalEnv = { ...process.env };
const PATH = '/api/students/bulk-import';

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

/** CPF válido a partir de 9 dígitos quaisquer. */
function cpfFrom(nine: string): string {
  const digits = nine.split('').map(Number);
  const check = (length: number) => {
    const sum = digits.slice(0, length).reduce((acc, digit, i) => acc + digit * (length + 1 - i), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  digits.push(check(9));
  digits.push(check(10));
  return digits.join('');
}

async function importAs(
  csv: string,
  email = users.admin.email,
  seed: Partial<Parameters<typeof startRouteApp>[0]> = {},
): Promise<{ response: Response; running: RunningApp }> {
  app = await startRouteApp({ users: Object.values(users), ...seed });
  const cookie = await app.login(email);

  return { response: await app.postText(PATH, cookie, csv), running: app };
}

describe('POST /api/students/bulk-import', () => {
  it('importa 3.000 alunos válidos, com 0 falhas, e audita', async () => {
    const lines = Array.from(
      { length: 3000 },
      (_, i) => `Aluno ${i},aluno${i}@exemplo.com,,${cpfFrom(String(100_000_000 + i))},ativo,`,
    );
    const csv = ['name,email,phone,cpf,status,assigned_to_email', ...lines].join('\n');

    const { response, running } = await importAs(csv);
    const body = (await response.json()) as StudentImportResponse;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ imported: 3000, failed: 0, duplicates: 0, errors: [] });
    expect(running.students.snapshot().students).toHaveLength(3000);
    expect(running.auditLogs.entries).toContainEqual(
      expect.objectContaining({
        action: AuditAction.STUDENTS_IMPORTED,
        actorId: users.admin.id,
        metadata: { imported: 3000, failed: 0, duplicates: 0, totalRows: 3000 },
      }),
    );
  });

  it('pula linhas inválidas sem abortar e relata linha e motivo', async () => {
    const csv = [
      'nome;e-mail;cpf;status;responsável',
      `Válida;ok@exemplo.com;${cpfFrom('529982247')};pausado;ana@exemplo.com`,
      ';semnome@exemplo.com;;;',
      'E-mail ruim;nao-e-email;;;',
      'CPF ruim;cpf@exemplo.com;123.456.789-00;;',
      'Status ruim;status@exemplo.com;;cancelado;',
      'Sem dono;dono@exemplo.com;;;ninguem@exemplo.com',
    ].join('\n');

    const { response, running } = await importAs(csv);
    const body = (await response.json()) as StudentImportResponse;

    expect(response.status).toBe(200);
    expect(body.imported).toBe(1);
    expect(body.failed).toBe(5);
    expect(body.errors).toEqual([
      { row: 3, name: '', error: 'Nome obrigatório' },
      { row: 4, name: 'E-mail ruim', error: 'E-mail inválido' },
      { row: 5, name: 'CPF ruim', error: 'CPF inválido' },
      { row: 6, name: 'Status ruim', error: 'Status inválido' },
      { row: 7, name: 'Sem dono', error: 'Responsável não encontrado' },
    ]);
    expect(running.students.snapshot().students[0]).toMatchObject({
      email: 'ok@exemplo.com',
      status: StudentStatus.pausado,
      assignedTo: users.ana.id,
    });
  });

  it('duplicata por e-mail e por CPF, no banco e no próprio arquivo', async () => {
    const cpfExistente = cpfFrom('111444777');
    const cpfRepetido = cpfFrom('222555888');
    const existente = makeStudent({ email: 'ja@exemplo.com', cpf: cpfExistente });
    const csv = [
      'name,email,cpf',
      'Ja cadastrado,JA@exemplo.com,',
      `Cpf cadastrado,novo1@exemplo.com,${cpfExistente}`,
      `Primeira,novo2@exemplo.com,${cpfRepetido}`,
      'Email repetido,NOVO2@exemplo.com,',
      `Cpf repetido,novo3@exemplo.com,${cpfRepetido}`,
    ].join('\n');

    const { response } = await importAs(csv, users.admin.email, { students: [existente] });
    const body = (await response.json()) as StudentImportResponse;

    expect(body).toMatchObject({ imported: 1, failed: 0, duplicates: 4 });
    expect(body.errors.map((error) => [error.row, error.error])).toEqual([
      [2, 'E-mail já cadastrado'],
      [3, 'CPF já cadastrado'],
      [5, 'E-mail repetido no arquivo'],
      [6, 'CPF repetido no arquivo'],
    ]);
    expect(body.summary).toBe('1 aluno importado. 0 linhas inválidas. 4 duplicatas.');
  });

  it('responsável desativado falha a linha', async () => {
    const inativo = makeUser({ email: 'inativo@exemplo.com', isActive: false });

    const { response } = await importAs('name,email,assigned_to_email\nX,x@exemplo.com,inativo@exemplo.com', users.admin.email, {
      users: [...Object.values(users), inativo],
    });

    expect(((await response.json()) as StudentImportResponse).errors[0]?.error).toBe(
      'Responsável desativado',
    );
  });

  it.each([
    ['\n\n', 'O arquivo CSV está vazio'],
    ['nome,telefone\nAna,1199', 'O CSV precisa das colunas name e email (ou nome e e-mail)'],
  ])('arquivo inválido %j → 400', async (csv, message) => {
    const { response } = await importAs(csv);
    const body = (await response.json()) as { details: Record<string, string> };

    expect(response.status).toBe(400);
    expect(body.details.file).toBe(message);
  });

  it('mais de 10.000 linhas → 400 e nada é gravado', async () => {
    const lines = Array.from({ length: 10_001 }, (_, i) => `A${i},a${i}@exemplo.com`);

    const { response, running } = await importAs(['name,email', ...lines].join('\n'));

    expect(response.status).toBe(400);
    expect(running.students.snapshot().students).toHaveLength(0);
  });

  it('sem Content-Type de texto → 400', async () => {
    app = await startRouteApp({ users: Object.values(users) });
    const cookie = await app.login(users.admin.email);

    const response = await app.request('POST', PATH, cookie, { csv: 'name,email' });

    expect(response.status).toBe(400);
  });

  it.each(['ceo', 'ana'] as const)('%s → 403 e nada é gravado', async (who) => {
    const { response, running } = await importAs('name,email\nA,a@exemplo.com', users[who].email);

    expect(response.status).toBe(403);
    expect(running.students.snapshot().students).toHaveLength(0);
  });
});
