import { TaskPriority } from '@prisma/client';

import type { TaskResponse } from '@server/types/tasks';

import { makeStudent, makeTask } from '../helpers/studentFixture';
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
  const tarefaAna = makeTask({
    assignedTo: users.ana.id,
    title: 'Ligar',
    relatedTo: alunoAna.id,
    dueDate: new Date('2026-09-20T15:00:00Z'),
  });
  const tarefaAnaAntes = makeTask({
    assignedTo: users.ana.id,
    title: 'E-mail',
    priority: TaskPriority.high,
    dueDate: new Date('2026-09-10T15:00:00Z'),
    completedAt: new Date('2026-09-11T10:00:00Z'),
  });
  const tarefaBruno = makeTask({ assignedTo: users.bruno.id, title: 'Do Bruno' });

  app = await startRouteApp({
    users: Object.values(users),
    students: [alunoAna, alunoBruno],
    tasks: [tarefaAna, tarefaAnaAntes, tarefaBruno],
  });

  return { running: app, alunoAna, alunoBruno, tarefaAna, tarefaBruno };
}

async function list(running: RunningApp, cookie: string, query = ''): Promise<TaskResponse[]> {
  const response = await running.request('GET', `/api/tasks${query}`, cookie);
  expect(response.status).toBe(200);
  return ((await response.json()) as { data: TaskResponse[] }).data;
}

describe('/api/tasks', () => {
  it('cada usuário vê só as próprias, pelo vencimento, com o nome do aluno', async () => {
    const { running } = await scenario();

    const ana = await list(running, await running.login(users.ana.email));
    expect(ana.map((task) => task.title)).toEqual(['E-mail', 'Ligar']);
    expect(ana[1]).toMatchObject({ studentName: 'Aluno da Ana', completed: false });

    // Nem o admin vê tarefas dos outros.
    expect(await list(running, await running.login(users.admin.email))).toEqual([]);
  });

  it('filtros por concluída e prioridade', async () => {
    const { running } = await scenario();
    const cookie = await running.login(users.ana.email);

    expect((await list(running, cookie, '?completed=false')).map((t) => t.title)).toEqual(['Ligar']);
    expect((await list(running, cookie, '?priority=high')).map((t) => t.title)).toEqual(['E-mail']);
  });

  it('cria com data sem hora (meio-dia no Brasil) e vínculo com aluno da carteira', async () => {
    const { running, alunoAna } = await scenario();
    const cookie = await running.login(users.ana.email);

    const response = await running.request('POST', '/api/tasks', cookie, {
      title: '  Follow-up  ',
      dueDate: '2026-09-25',
      studentId: alunoAna.id,
    });
    const body = (await response.json()) as TaskResponse;

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      title: 'Follow-up',
      priority: 'normal',
      dueDate: '2026-09-25T15:00:00.000Z',
      studentId: alunoAna.id,
    });
  });

  it('vincular a aluno de outro vendedor → 404; sem título → 400', async () => {
    const { running, alunoBruno } = await scenario();
    const cookie = await running.login(users.ana.email);

    const outOfScope = await running.request('POST', '/api/tasks', cookie, {
      title: 'X',
      dueDate: '2026-09-25',
      studentId: alunoBruno.id,
    });
    expect(outOfScope.status).toBe(404);

    const noTitle = await running.request('POST', '/api/tasks', cookie, { dueDate: '2026-09-25' });
    expect(noTitle.status).toBe(400);
  });

  it('concluir grava completedAt; reabrir limpa', async () => {
    const { running, tarefaAna } = await scenario();
    const cookie = await running.login(users.ana.email);

    const done = (await (
      await running.request('PUT', `/api/tasks/${tarefaAna.id}/complete`, cookie, {})
    ).json()) as TaskResponse;
    expect(done.completed).toBe(true);
    expect(done.completedAt).not.toBeNull();

    const reopened = (await (
      await running.request('PUT', `/api/tasks/${tarefaAna.id}/complete`, cookie, { completed: false })
    ).json()) as TaskResponse;
    expect(reopened).toMatchObject({ completed: false, completedAt: null });
  });

  it('editar e excluir a própria; a de outro usuário → 404', async () => {
    const { running, tarefaAna, tarefaBruno } = await scenario();
    const cookie = await running.login(users.ana.email);

    const edited = await running.request('PUT', `/api/tasks/${tarefaAna.id}`, cookie, {
      priority: 'high',
      studentId: null,
    });
    expect((await edited.json()) as TaskResponse).toMatchObject({ priority: 'high', studentId: null });

    expect((await running.request('DELETE', `/api/tasks/${tarefaAna.id}`, cookie)).status).toBe(204);
    expect((await running.request('DELETE', `/api/tasks/${tarefaBruno.id}`, cookie)).status).toBe(404);
    expect(
      (await running.request('PUT', `/api/tasks/${tarefaBruno.id}`, cookie, { title: 'Hack' })).status,
    ).toBe(404);
    expect(running.tasks.rows.find((task) => task.id === tarefaBruno.id)?.title).toBe('Do Bruno');
  });
});
