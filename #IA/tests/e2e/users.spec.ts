/**
 * E2E da gestão de usuários (TASK-217) — CU-08, CU-10, CU-11, CU-13 e critérios 4, 5, 6 e 8.
 *
 * O RBAC provado aqui é o do backend: além de olhar o menu, cada teste de papel chama
 * `/api/users` com a sessão real do usuário e espera 403. Cada teste cria os usuários de que
 * precisa, com e-mail único, e não depende de nada deixado por outro.
 */

import { expect, test, type Locator, type Page } from '@playwright/test';

import { adminUser, ceoUser, vendedorUser } from './fixtures';
import {
  CHANGE_PASSWORD_URL,
  changePassword,
  formAlert,
  loginAs,
  pageAlert,
  submitLogin,
  uniqueEmail,
  USERS_URL,
} from './helpers';

const LAST_ADMIN_MESSAGE = /último admin ativo/i;
const INVALID_CREDENTIALS = 'E-mail ou senha incorretos';

/** Abre a tela de usuários pelo menu, como o admin faz. */
async function openUsersPage(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Usuários' }).click();
  await expect(page).toHaveURL(USERS_URL);
  await expect(page.getByRole('heading', { name: 'Usuários', level: 1 })).toBeVisible();
}

/** Linha da tabela de usuários correspondente a um e-mail. */
function rowFor(page: Page, email: string): Locator {
  return page.getByRole('row').filter({ hasText: email });
}

/**
 * Cria um usuário pelo formulário e devolve a senha provisória exibida uma única vez (RN-04),
 * já com o diálogo fechado.
 */
async function createUserThroughUi(
  page: Page,
  name: string,
  email: string,
  roleLabel: string,
): Promise<string> {
  await page.getByRole('button', { name: 'Novo usuário' }).click();

  const modal = page.getByRole('dialog', { name: 'Novo usuário' });
  await modal.getByLabel('Nome').fill(name);
  await modal.getByLabel('E-mail').fill(email);
  await modal.getByLabel('Papel').selectOption({ label: roleLabel });
  await modal.getByRole('button', { name: 'Salvar' }).click();

  const dialog = page.getByRole('dialog', { name: 'Senha provisória' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('alert')).toContainText('não poderá ser vista de novo');

  const temporaryPassword = (await dialog.locator('code').innerText()).trim();
  expect(temporaryPassword.length).toBeGreaterThanOrEqual(8);

  await dialog.getByRole('button', { name: 'Entendi' }).click();
  await expect(dialog).toHaveCount(0);

  return temporaryPassword;
}

test('admin cria usuário, vê a senha provisória uma única vez e o novo usuário é obrigado a trocá-la (CU-08, critério 8)', async ({
  page,
  browser,
}) => {
  const email = uniqueEmail('novo-vendedor');
  const name = 'Nina Nova';

  await loginAs(page, adminUser);
  await openUsersPage(page);

  const temporaryPassword = await createUserThroughUi(page, name, email, 'Vendedor');

  // O usuário aparece na lista, como vendedor e ativo.
  const row = rowFor(page, email);
  await expect(row).toContainText(name);
  await expect(row).toContainText('Vendedor');
  await expect(row).toContainText('Ativo');

  // RN-04: a senha não volta a aparecer — nem na tela, nem depois de recarregar a lista.
  await expect(page.getByText(temporaryPassword)).toHaveCount(0);
  await page.reload();
  await expect(rowFor(page, email)).toBeVisible();
  await expect(page.getByText(temporaryPassword)).toHaveCount(0);

  // E a listagem da API não devolve hash nem senha nenhuma (RN-13).
  const listResponse = await page.request.get('/api/users');
  expect(listResponse.status()).toBe(200);
  const listBody = await listResponse.text();
  expect(listBody).not.toContain('passwordHash');
  expect(listBody).not.toContain(temporaryPassword);

  // O novo usuário entra em outra sessão, com a senha provisória, e cai na troca obrigatória.
  const novoContexto = await browser.newContext();
  const novaPagina = await novoContexto.newPage();
  try {
    await submitLogin(novaPagina, email, temporaryPassword);
    await expect(novaPagina).toHaveURL(CHANGE_PASSWORD_URL);
    await expect(novaPagina.getByText('Sua senha é provisória.')).toBeVisible();

    await changePassword(novaPagina, temporaryPassword, 'SenhaEscolhidaPelaNina!2026');
    await expect(novaPagina).toHaveURL('/');
    await expect(
      novaPagina.getByRole('heading', { name: 'Dashboard', level: 1 }),
    ).toBeVisible();
  } finally {
    await novoContexto.close();
  }
});

test.describe('CEO e vendedor não gerenciam usuários (CU-13, critério 4)', () => {
  for (const user of [ceoUser, vendedorUser]) {
    test(`${user.role} não vê "Usuários" no menu e recebe 403 na API`, async ({ page }) => {
      await loginAs(page, user);

      // O menu mostra os itens comuns, mas não o de usuários.
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Usuários' })).toHaveCount(0);

      // O que vale é o backend: com a sessão real desse papel, toda rota de usuários dá 403.
      const list = await page.request.get('/api/users');
      expect(list.status()).toBe(403);
      expect(((await list.json()) as { code?: string }).code).toBe('FORBIDDEN');

      const create = await page.request.post('/api/users', {
        data: { name: 'Tentativa', email: uniqueEmail('tentativa'), role: 'vendedor' },
      });
      expect(create.status()).toBe(403);

      // Abrir a URL na mão também não gerencia nada.
      await page.goto(USERS_URL);
      await expect(pageAlert(page)).toContainText('Acesso negado');
      await expect(page.getByRole('button', { name: 'Novo usuário' })).toHaveCount(0);
    });
  }
});

test('admin desativa um usuário e a sessão dele cai na ação seguinte (CU-10, critério 5)', async ({
  page,
  browser,
}) => {
  const email = uniqueEmail('a-desativar');

  await loginAs(page, adminUser);
  await openUsersPage(page);
  const temporaryPassword = await createUserThroughUi(page, 'Dario Desativado', email, 'Vendedor');

  const contextoDoUsuario = await browser.newContext();
  const paginaDoUsuario = await contextoDoUsuario.newPage();
  try {
    // O usuário entra e fica com a sessão aberta na troca de senha provisória.
    await submitLogin(paginaDoUsuario, email, temporaryPassword);
    await expect(paginaDoUsuario).toHaveURL(CHANGE_PASSWORD_URL);
    expect((await paginaDoUsuario.request.get('/api/auth/me')).status()).toBe(200);

    // O admin desativa.
    await rowFor(page, email).getByRole('button', { name: 'Desativar' }).click();
    await expect(rowFor(page, email)).toContainText('Inativo');

    // RN-09: a sessão aberta perde o acesso já na requisição seguinte.
    expect((await paginaDoUsuario.request.get('/api/auth/me')).status()).toBe(401);
    await paginaDoUsuario.reload();
    await expect(paginaDoUsuario).toHaveURL(/\/login$/);

    // E a senha provisória não serve mais para entrar (RN-06: mensagem genérica).
    await submitLogin(paginaDoUsuario, email, temporaryPassword);
    await expect(formAlert(paginaDoUsuario)).toHaveText(INVALID_CREDENTIALS);
  } finally {
    await contextoDoUsuario.close();
  }

  // Reativar devolve o acesso na tela (RN-11: usuário nunca é excluído).
  await rowFor(page, email).getByRole('button', { name: 'Reativar' }).click();
  await expect(rowFor(page, email)).toContainText('Ativo');
});

test('desativar o último admin ativo é recusado (CU-11, critério 6)', async ({ page }) => {
  await loginAs(page, adminUser);
  await openUsersPage(page);

  await expect(rowFor(page, adminUser.email)).toContainText('Ativo');

  await rowFor(page, adminUser.email).getByRole('button', { name: 'Desativar' }).click();

  await expect(pageAlert(page)).toContainText(LAST_ADMIN_MESSAGE);
  await expect(rowFor(page, adminUser.email)).toContainText('Ativo');

  // O backend é quem recusa: a mesma tentativa pela API responde 409 LAST_ADMIN.
  const users = (await (await page.request.get('/api/users')).json()) as {
    users: { id: string; email: string }[];
  };
  const admin = users.users.find((user) => user.email === adminUser.email);
  expect(admin).toBeDefined();

  const response = await page.request.put(`/api/users/${admin?.id ?? ''}`, {
    data: { isActive: false },
  });
  expect(response.status()).toBe(409);
  expect(((await response.json()) as { code?: string }).code).toBe('LAST_ADMIN');

  // A sessão do admin continua valendo: nada foi desativado.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Usuários', level: 1 })).toBeVisible();
});
