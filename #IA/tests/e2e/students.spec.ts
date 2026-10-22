/**
 * E2E do domínio de alunos (Sprint 6 — TASK-007 a 011).
 *
 * Banco, API e navegador de verdade. O RBAC provado aqui é o do backend: além de olhar a tela,
 * cada cenário de papel chama `/api/students` com a sessão real do usuário.
 *
 * Não existe formulário de cadastro de aluno na interface nesta sprint (a TASK-011 não o prevê),
 * então os alunos de cada teste nascem por `POST /api/students` com a sessão de quem cria — o mesmo
 * endpoint que um formulário usaria. A rejeição "com mensagem na tela" é exercida onde a tela
 * existe: a edição inline do detalhe (`PUT`). Cada teste cria os próprios alunos, com nome, e-mail
 * e CPF únicos, e não depende de nada deixado por outro.
 */

import { PrismaClient } from '@prisma/client';
import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Locator,
  type Page,
} from '@playwright/test';

import { adminUser, ceoUser, otherVendedorUser, vendedorUser, type E2EUser } from './fixtures';
import { assertTestDatabase } from './globalSetup';
import { loginAs, randomValidCpf, STUDENTS_URL, uniqueEmail } from './helpers';

interface StudentBody {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  assignedTo: string | null;
}

interface ListBody {
  data: StudentBody[];
  pagination: { total: number };
}

const EMAIL_IN_USE_MESSAGE = 'E-mail já cadastrado em outro aluno';
const INVALID_CPF_MESSAGE = 'CPF inválido';
/** CPF com formato certo e dígitos verificadores errados (os corretos de 123456789 são 09). */
const INVALID_CPF = '123.456.789-00';

/** Sufixo único por teste, para nome e e-mail não colidirem com alunos de outros testes. */
function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 100_000)}`;
}

/** Cria um aluno pela API com a sessão de quem está logado no `request`. */
async function createStudentViaApi(
  request: APIRequestContext,
  data: { name: string; email: string; cpf?: string; phone?: string; assignedTo?: string },
): Promise<StudentBody> {
  const response = await request.post('/api/students', { data });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as StudentBody;
}

/** Id do usuário da sessão, lido do próprio backend. */
async function currentUserId(request: APIRequestContext): Promise<string> {
  const response = await request.get('/api/auth/me');
  expect(response.status()).toBe(200);
  return ((await response.json()) as { user: { id: string } }).user.id;
}

/** Abre uma sessão isolada (outro contexto do navegador) já logada. */
async function openSession(browser: Browser, user: E2EUser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAs(page, user);
  return { context, page };
}

/** Abre a listagem pelo menu, como o usuário faz. */
async function openStudentsPage(page: Page): Promise<void> {
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Alunos' }).click();
  await expect(page).toHaveURL(STUDENTS_URL);
  await expect(page.getByRole('heading', { name: 'Alunos', level: 1 })).toBeVisible();
}

/** Linha da tabela (visível no desktop) de um aluno, pelo e-mail. */
function rowFor(page: Page, email: string): Locator {
  return page.getByRole('row').filter({ hasText: email });
}

/** Card "Dados pessoais" do detalhe: escopo das mensagens de erro (evita o anunciador de rota). */
function profileCard(page: Page): Locator {
  return page.getByRole('region', { name: 'Dados pessoais' });
}

/** Busca na listagem e espera a resposta da API já filtrada pelo termo completo. */
async function searchStudents(page: Page, term: string): Promise<void> {
  const filtered = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/students' && url.searchParams.get('search') === term;
  });
  await page.getByLabel('Buscar por nome ou e-mail').fill(term);
  expect((await filtered).status()).toBe(200);
}

/** Edita um campo inline do card de dados pessoais e espera a resposta do PUT. */
async function editProfileField(
  page: Page,
  label: string,
  value: string,
): Promise<number> {
  const card = profileCard(page);
  const saved = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.startsWith('/api/students/') &&
      response.request().method() === 'PUT',
  );
  await card.getByRole('button', { name: `Editar ${label.toLowerCase()}` }).click();
  const field = card.getByLabel(label, { exact: true });
  await field.fill(value);
  await field.press('Enter');
  const status = (await saved).status();
  await expect(card.getByText('Salvando…')).toHaveCount(0);
  return status;
}

test('admin cria aluno, busca com debounce, abre o detalhe e a edição inline persiste (TASK-008, 010, 011)', async ({
  page,
}) => {
  const suffix = uniqueSuffix();
  const name = `Ana Busca ${suffix}`;
  const email = uniqueEmail('ana-busca');

  await loginAs(page, adminUser);
  const created = await createStudentViaApi(page.request, {
    name,
    email,
    cpf: randomValidCpf(),
  });

  await openStudentsPage(page);

  // Debounce: digitando tecla a tecla (bem abaixo dos 300 ms), nenhuma requisição sai com termo
  // parcial — só a do termo completo.
  const searchTerms: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/students' && url.searchParams.has('search')) {
      searchTerms.push(url.searchParams.get('search') ?? '');
    }
  });

  const filtered = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/students' && url.searchParams.get('search') === name;
  });
  await page.getByLabel('Buscar por nome ou e-mail').pressSequentially(name, { delay: 20 });
  expect((await filtered).status()).toBe(200);

  expect(searchTerms.length).toBeGreaterThanOrEqual(1);
  expect(searchTerms.every((term) => term === name)).toBe(true);

  // A busca vai para a URL e a tabela mostra só o aluno procurado.
  await expect(page).toHaveURL(/[?&]search=/);
  await expect(rowFor(page, email)).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(2); // cabeçalho + o aluno

  // Clique na linha abre o detalhe.
  await rowFor(page, email).click();
  await expect(page).toHaveURL(`/students/${created.id}`);
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await expect(profileCard(page)).toContainText(email);

  // Edição inline do telefone: salva e continua lá depois de recarregar a página.
  const phone = `(11) 9${suffix.slice(-4)}-${suffix.slice(-8, -4)}`;
  expect(await editProfileField(page, 'Telefone', phone)).toBe(200);
  await expect(profileCard(page)).toContainText(phone);

  await page.reload();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await expect(profileCard(page)).toContainText(phone);

  // E o banco (pela API) confirma.
  const detail = await page.request.get(`/api/students/${created.id}`);
  expect(((await detail.json()) as StudentBody).phone).toBe(phone);
});

test('cadastro e edição rejeitam e-mail duplicado e CPF inválido, com mensagem na tela (TASK-008)', async ({
  page,
}) => {
  const suffix = uniqueSuffix();
  const existingEmail = uniqueEmail('ja-existe');
  const originalEmail = uniqueEmail('beto-original');
  const originalCpf = randomValidCpf();

  await loginAs(page, adminUser);
  await createStudentViaApi(page.request, { name: `Ana Existente ${suffix}`, email: existingEmail });
  const beto = await createStudentViaApi(page.request, {
    name: `Beto Edicao ${suffix}`,
    email: originalEmail,
    cpf: originalCpf,
  });

  // Cadastro pela API: e-mail duplicado (mesmo com maiúsculas) → 409; CPF inválido → 400.
  const duplicated = await page.request.post('/api/students', {
    data: { name: 'Duplicado', email: existingEmail.toUpperCase() },
  });
  expect(duplicated.status()).toBe(409);
  expect(((await duplicated.json()) as { code: string }).code).toBe('EMAIL_IN_USE');

  const invalidCpf = await page.request.post('/api/students', {
    data: { name: 'CPF Ruim', email: uniqueEmail('cpf-ruim'), cpf: INVALID_CPF },
  });
  expect(invalidCpf.status()).toBe(400);
  const invalidCpfBody = (await invalidCpf.json()) as { code: string; details?: Record<string, string> };
  expect(invalidCpfBody.code).toBe('VALIDATION_ERROR');
  expect(invalidCpfBody.details?.cpf).toBe(INVALID_CPF_MESSAGE);

  // Na tela: e-mail de outro aluno é recusado com a mensagem junto do campo.
  await page.goto(`/students/${beto.id}`);
  await expect(page.getByRole('heading', { name: beto.name, level: 1 })).toBeVisible();

  expect(await editProfileField(page, 'E-mail', existingEmail)).toBe(409);
  await expect(profileCard(page).getByRole('alert')).toHaveText(EMAIL_IN_USE_MESSAGE);
  await expect(profileCard(page)).toContainText(originalEmail);

  // CPF com dígito verificador errado também.
  expect(await editProfileField(page, 'CPF', INVALID_CPF)).toBe(400);
  await expect(
    profileCard(page).getByRole('alert').filter({ hasText: INVALID_CPF_MESSAGE }),
  ).toBeVisible();

  // Nada foi gravado.
  await page.reload();
  await expect(page.getByRole('heading', { name: beto.name, level: 1 })).toBeVisible();
  const detail = (await (await page.request.get(`/api/students/${beto.id}`)).json()) as StudentBody;
  expect(detail.email).toBe(originalEmail);
  expect(detail.cpf).toBe(originalCpf);
  await expect(profileCard(page).getByRole('alert')).toHaveCount(0);
});

test('vendedor só vê os próprios alunos e recebe "não encontrado" no aluno de outro vendedor (RBAC, TASK-007)', async ({
  page,
  browser,
}) => {
  const suffix = uniqueSuffix();
  const sharedTerm = `Rbac ${suffix}`;

  await loginAs(page, vendedorUser);
  const vendedorId = await currentUserId(page.request);
  const outra = await openSession(browser, otherVendedorUser);
  try {
    const outraId = await currentUserId(outra.page.request);

    // O vendedor tenta atribuir o aluno à outra vendedora; o backend força ele mesmo (S6-6).
    const meu = await createStudentViaApi(page.request, {
      name: `${sharedTerm} Meu Aluno`,
      email: uniqueEmail('meu-aluno'),
      assignedTo: outraId,
    });
    expect(meu.assignedTo).toBe(vendedorId);

    const alheio = await createStudentViaApi(outra.page.request, {
      name: `${sharedTerm} Aluno Alheio`,
      email: uniqueEmail('aluno-alheio'),
    });
    expect(alheio.assignedTo).toBe(outraId);

    // Tela: buscando o termo dos dois, o vendedor vê só o dele.
    await openStudentsPage(page);
    await searchStudents(page, sharedTerm);
    await expect(rowFor(page, meu.email)).toBeVisible();
    await expect(rowFor(page, alheio.email)).toHaveCount(0);

    // API: a listagem inteira só traz alunos dele — e o `assignedTo` de outro é ignorado.
    const list = await page.request.get(`/api/students?limit=500&assignedTo=${outraId}`);
    expect(list.status()).toBe(200);
    const listBody = (await list.json()) as ListBody;
    expect(listBody.data.map((student) => student.id)).toContain(meu.id);
    expect(listBody.data.every((student) => student.assignedTo === vendedorId)).toBe(true);
    expect(listBody.pagination.total).toBe(listBody.data.length);

    // Abrir por URL o aluno da outra vendedora: tela de não encontrado e 404 na API.
    await page.goto(`/students/${alheio.id}`);
    await expect(page.getByRole('heading', { name: 'Aluno não encontrado', level: 1 })).toBeVisible();
    await expect(page.getByText(alheio.name)).toHaveCount(0);

    const detail = await page.request.get(`/api/students/${alheio.id}`);
    expect(detail.status()).toBe(404);
    expect(((await detail.json()) as { code: string }).code).toBe('NOT_FOUND');

    // Editar o aluno alheio também é 404, e nada muda.
    const update = await page.request.put(`/api/students/${alheio.id}`, {
      data: { name: 'Tomado' },
    });
    expect(update.status()).toBe(404);
    const intact = (await (await outra.page.request.get(`/api/students/${alheio.id}`)).json()) as StudentBody;
    expect(intact.name).toBe(alheio.name);
  } finally {
    await outra.context.close();
  }
});

test.describe('CEO e vendedor não excluem aluno (TASK-009)', () => {
  for (const user of [ceoUser, vendedorUser]) {
    test(`${user.role} não vê o botão Excluir e recebe 403 no DELETE`, async ({ page }) => {
      const suffix = uniqueSuffix();

      await loginAs(page, user);
      const student = await createStudentViaApi(page.request, {
        name: `Sem Exclusao ${user.role} ${suffix}`,
        email: uniqueEmail(`sem-exclusao-${user.role}`),
      });

      // Listagem: o aluno aparece com Ver e Editar, mas sem Excluir.
      await openStudentsPage(page);
      await searchStudents(page, student.name);
      const row = rowFor(page, student.email);
      await expect(row.getByRole('button', { name: `Ver ${student.name}` })).toBeVisible();
      await expect(row.getByRole('button', { name: `Excluir ${student.name}` })).toHaveCount(0);

      // Detalhe: sem o botão Excluir.
      await page.goto(`/students/${student.id}`);
      await expect(page.getByRole('heading', { name: student.name, level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Excluir', exact: true })).toHaveCount(0);

      // O que vale é o backend: com a sessão real desse papel, DELETE dá 403 e nada é apagado.
      const response = await page.request.delete(`/api/students/${student.id}`);
      expect(response.status()).toBe(403);
      expect(((await response.json()) as { code: string }).code).toBe('FORBIDDEN');

      expect((await page.request.get(`/api/students/${student.id}`)).status()).toBe(200);
    });
  }
});

test('admin exclui aluno com confirmação, ele some da lista e a exclusão fica auditada (TASK-009)', async ({
  page,
}) => {
  const databaseUrl = process.env.DATABASE_URL;
  assertTestDatabase(databaseUrl);

  const suffix = uniqueSuffix();
  const name = `Excluido ${suffix}`;
  const email = uniqueEmail('a-excluir');

  await loginAs(page, adminUser);
  const adminId = await currentUserId(page.request);
  const student = await createStudentViaApi(page.request, { name, email });

  await openStudentsPage(page);
  await searchStudents(page, name);
  await expect(rowFor(page, email)).toBeVisible();

  // Cancelar a confirmação não apaga nada.
  await rowFor(page, email).getByRole('button', { name: `Excluir ${name}` }).click();
  let dialog = page.getByRole('dialog', { name: 'Excluir aluno' });
  await expect(dialog).toContainText(name);
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(rowFor(page, email)).toBeVisible();

  // Confirmar exclui.
  await rowFor(page, email).getByRole('button', { name: `Excluir ${name}` }).click();
  dialog = page.getByRole('dialog', { name: 'Excluir aluno' });
  const deleted = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/api/students/${student.id}` &&
      response.request().method() === 'DELETE',
  );
  await dialog.getByRole('button', { name: 'Excluir', exact: true }).click();
  expect((await deleted).status()).toBe(204);

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: `Aluno ${name} foi excluído.` })).toBeVisible();
  await expect(rowFor(page, email)).toHaveCount(0);
  await expect(page.getByText('Nenhum aluno encontrado com esses filtros.')).toBeVisible();

  // Some de verdade: recarregar não traz de volta e a API responde 404.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Alunos', level: 1 })).toBeVisible();
  await expect(page.getByText('Nenhum aluno encontrado com esses filtros.')).toBeVisible();
  expect((await page.request.get(`/api/students/${student.id}`)).status()).toBe(404);

  // Auditoria no banco de teste: quem excluiu e o que foi excluído.
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: 'STUDENT_DELETED', actorId: adminId },
    });
    const log = logs.find(
      (entry) =>
        (entry.metadata as { student?: { id?: string } } | null)?.student?.id === student.id,
    );
    expect(log).toBeDefined();
    expect(log?.metadata).toMatchObject({ student: { id: student.id, name, email } });
  } finally {
    await prisma.$disconnect();
  }
});
