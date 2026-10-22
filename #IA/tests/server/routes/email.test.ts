import { AuditAction } from '@prisma/client';

import type { SendBulkEmailResponse, SendEmailResponse } from '@server/types/email';

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
  const joao = makeStudent({ name: 'João', email: 'joao@exemplo.com', assignedTo: users.ana.id });
  const maria = makeStudent({ name: 'Maria', email: 'maria@exemplo.com', assignedTo: users.ana.id });
  const doBruno = makeStudent({ name: 'Pedro', email: 'pedro@exemplo.com', assignedTo: users.bruno.id });

  app = await startRouteApp({
    users: Object.values(users),
    students: [joao, maria, doBruno],
    courses: [delphi, react],
    purchases: [
      makePurchase({ studentId: joao.id, courseId: delphi.id, purchaseDate: new Date('2026-01-01T00:00:00Z') }),
      makePurchase({ studentId: joao.id, courseId: react.id, purchaseDate: new Date('2026-08-01T00:00:00Z') }),
    ],
  });

  return { running: app, joao, maria, doBruno };
}

describe('POST /api/email/send', () => {
  it('envia para o e-mail do aluno, com merge tags, HTML escapado e auditoria sem o corpo', async () => {
    const { running, joao } = await scenario();
    const cookie = await running.login(users.ana.email);

    const response = await running.request('POST', '/api/email/send', cookie, {
      studentId: joao.id,
      subject: 'Oi, {{name}}',
      body: 'Obrigado por comprar {{ course }}!\n<b>Até</b>',
    });

    expect(response.status).toBe(200);
    expect((await response.json()) as SendEmailResponse).toEqual({ messageId: 'msg-1', to: 'joao@exemplo.com' });
    expect(running.mailer.sent[0]).toMatchObject({
      to: 'joao@exemplo.com',
      subject: 'Oi, João',
      text: 'Obrigado por comprar React!\n<b>Até</b>',
    });
    expect(running.mailer.sent[0]?.html).toContain('React!<br>&lt;b&gt;Até&lt;/b&gt;');
    expect(running.auditLogs.entries).toContainEqual(
      expect.objectContaining({
        action: AuditAction.EMAIL_SENT,
        actorId: users.ana.id,
        metadata: { studentIds: [joao.id], subject: 'Oi, {{name}}', sent: 1, failed: 0 },
      }),
    );
  });

  it('aluno de outro vendedor → 404 e nada é enviado', async () => {
    const { running, doBruno } = await scenario();
    const cookie = await running.login(users.ana.email);

    const response = await running.request('POST', '/api/email/send', cookie, {
      studentId: doBruno.id,
      subject: 'X',
      body: 'Y',
    });

    expect(response.status).toBe(404);
    expect(running.mailer.sent).toHaveLength(0);
  });

  it('falha do SMTP vira 502 EMAIL_SEND_FAILED, sem auditoria', async () => {
    const { running, joao } = await scenario();
    running.mailer.failFor.add('joao@exemplo.com');
    const cookie = await running.login(users.admin.email);

    const response = await running.request('POST', '/api/email/send', cookie, {
      studentId: joao.id,
      subject: 'X',
      body: 'Y',
    });

    expect(response.status).toBe(502);
    expect(((await response.json()) as { code: string }).code).toBe('EMAIL_SEND_FAILED');
    expect(running.auditLogs.entries.some((entry) => entry.action === AuditAction.EMAIL_SENT)).toBe(false);
  });

  it('sem assunto ou corpo → 400', async () => {
    const { running, joao } = await scenario();
    const cookie = await running.login(users.admin.email);

    const response = await running.request('POST', '/api/email/send', cookie, {
      studentId: joao.id,
      subject: ' ',
      body: '',
    });
    const body = (await response.json()) as { details: Record<string, string> };

    expect(response.status).toBe(400);
    expect(body.details).toMatchObject({ subject: 'Informe o assunto', body: 'Escreva a mensagem' });
  });
});

describe('POST /api/email/send-bulk', () => {
  it('envia para a seleção, personaliza cada um e relata falhas por aluno', async () => {
    const { running, joao, maria, doBruno } = await scenario();
    running.mailer.failFor.add('maria@exemplo.com');
    const cookie = await running.login(users.ana.email);

    const response = await running.request('POST', '/api/email/send-bulk', cookie, {
      studentIds: [joao.id, maria.id, doBruno.id, joao.id],
      subject: 'Novidades',
      body: 'Olá {{name}}, curso: {{course}}.',
    });
    const body = (await response.json()) as SendBulkEmailResponse;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ sent: 1, failed: 2 });
    expect(body.results).toEqual([
      { studentId: joao.id, status: 'sent', messageId: 'msg-1' },
      { studentId: maria.id, status: 'failed', error: 'Falha no envio' },
      { studentId: doBruno.id, status: 'failed', error: 'Aluno não encontrado' },
    ]);
    expect(running.mailer.sent.map((message) => message.text)).toEqual(['Olá João, curso: React.']);
    expect(running.auditLogs.entries).toContainEqual(
      expect.objectContaining({
        action: AuditAction.EMAIL_SENT,
        metadata: expect.objectContaining({ sent: 1, failed: 2, bulk: true }),
      }),
    );
  });

  it('mais de 100 alunos ou lista vazia → 400', async () => {
    const { running } = await scenario();
    const cookie = await running.login(users.admin.email);
    const ids = Array.from({ length: 101 }, (_, i) => `2b1f6c1e-7c4c-4d7e-9a57-${String(i).padStart(12, '0')}`);

    const tooMany = await running.request('POST', '/api/email/send-bulk', cookie, {
      studentIds: ids,
      subject: 'X',
      body: 'Y',
    });
    const empty = await running.request('POST', '/api/email/send-bulk', cookie, {
      studentIds: [],
      subject: 'X',
      body: 'Y',
    });

    expect(tooMany.status).toBe(400);
    expect(empty.status).toBe(400);
  });
});
