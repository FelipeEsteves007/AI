/**
 * E2E de autenticação (TASK-217) — CU-01 a CU-06, critérios 1, 2, 3, 7, 8 e 9 da spec.
 *
 * Tudo pelo navegador, com banco e API de verdade: nenhum estado é montado por dentro do código
 * da aplicação. Cada teste usa o usuário que o `globalSetup` criou para o seu cenário, então
 * nenhum depende do outro nem da ordem.
 */

import { expect, test } from '@playwright/test';

import {
  adminUser,
  ceoUser,
  lockoutUser,
  provisionalUser,
  unknownEmail,
  vendedorUser,
  wrongPasswordUser,
} from './fixtures';
import { CHANGE_PASSWORD_URL, changePassword, formAlert, loginAs, submitLogin } from './helpers';

const INVALID_CREDENTIALS = 'E-mail ou senha incorretos';
const BLOCKED_MESSAGE = 'Muitas tentativas de login. Aguarde alguns minutos antes de tentar de novo.';

test.describe('Login dos três papéis (CU-01)', () => {
  for (const user of [adminUser, ceoUser, vendedorUser]) {
    test(`${user.role} entra com e-mail e senha e chega na tela inicial`, async ({ page }) => {
      await loginAs(page, user);

      await expect(page).toHaveURL('/');
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    });
  }
});

test('o JWT só trafega em cookie HttpOnly e a resposta do login não devolve senha (critério 8)', async ({
  page,
  context,
}) => {
  const loginResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
  );

  await loginAs(page, vendedorUser);

  const body = (await (await loginResponse).json()) as Record<string, unknown>;
  expect(body).not.toHaveProperty('token');
  expect(JSON.stringify(body)).not.toContain(vendedorUser.password);
  expect(JSON.stringify(body)).not.toContain('passwordHash');

  const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === 'crm_session');
  expect(sessionCookie?.httpOnly).toBe(true);

  // O cookie é invisível para o JavaScript da página: é isso que "HttpOnly" significa na prática.
  await expect
    .poll(async () => page.evaluate(() => document.cookie))
    .not.toContain('crm_session');
});

test.describe('Credencial errada (CU-02, critério 1)', () => {
  test('senha errada e e-mail inexistente mostram exatamente a mesma mensagem', async ({ page }) => {
    await submitLogin(page, wrongPasswordUser.email, 'senha-que-nao-e-a-dele');
    await expect(formAlert(page)).toHaveText(INVALID_CREDENTIALS);

    await submitLogin(page, unknownEmail, 'QualquerSenha!2026');
    await expect(formAlert(page)).toHaveText(INVALID_CREDENTIALS);

    await expect(page).toHaveURL(/\/login$/);
  });
});

test('página interna sem sessão volta para o login e a API responde 401 (critério 2)', async ({
  page,
}) => {
  await page.goto('/settings/users');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

  const response = await page.request.get('/api/users');
  expect(response.status()).toBe(401);
});

test('senha provisória prende o usuário na troca de senha até trocá-la (CU-04, critério 3)', async ({
  page,
}) => {
  const novaSenha = 'NovaSenhaDaPaula!2026';

  await submitLogin(page, provisionalUser.email, provisionalUser.password);

  await expect(page).toHaveURL(CHANGE_PASSWORD_URL);
  await expect(page.getByText('Sua senha é provisória.')).toBeVisible();

  // Tentar qualquer outra tela devolve para a troca de senha (RN-05).
  await page.goto('/');
  await expect(page).toHaveURL(CHANGE_PASSWORD_URL);

  // E o backend também barra, com 403: a interface não é a única guarda.
  const blocked = await page.request.get('/api/users');
  expect(blocked.status()).toBe(403);
  expect(((await blocked.json()) as { code?: string }).code).toBe('PASSWORD_CHANGE_REQUIRED');

  await changePassword(page, provisionalUser.password, novaSenha);

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

  // A senha nova vale no próximo login; a provisória não vale mais.
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await submitLogin(page, provisionalUser.email, provisionalUser.password);
  await expect(formAlert(page)).toHaveText(INVALID_CREDENTIALS);

  await submitLogin(page, provisionalUser.email, novaSenha);
  await expect(page).toHaveURL('/');
});

test('logout encerra a sessão (CU-06, critério 9)', async ({ page, context }) => {
  await loginAs(page, ceoUser);

  await page.getByRole('button', { name: 'Sair' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect.poll(async () => (await context.cookies()).map((cookie) => cookie.name)).not.toContain(
    'crm_session',
  );

  // Sessão encerrada de verdade: o backend não aceita mais nada com o cookie antigo.
  const response = await page.request.get('/api/auth/me');
  expect(response.status()).toBe(401);

  // E voltar para uma tela interna leva de novo ao login.
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});

test('bloqueio depois de 5 tentativas erradas em 15 minutos (CU-03, critério 7)', async ({
  page,
}) => {
  // As cinco primeiras falhas vão direto na API (mesmo caminho do formulário, sem esperar a tela).
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await page.request.post('/api/auth/login', {
      data: { email: lockoutUser.email, password: `errada-${attempt}` },
    });
    expect(response.status()).toBe(401);
  }

  // A sexta tentativa é recusada mesmo com a senha CORRETA: o bloqueio é por e-mail (RN-07).
  await submitLogin(page, lockoutUser.email, lockoutUser.password);

  await expect(formAlert(page)).toHaveText(BLOCKED_MESSAGE);
  await expect(page).toHaveURL(/\/login$/);
});
