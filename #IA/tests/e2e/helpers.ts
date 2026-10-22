/**
 * Apoio dos specs E2E: login pela interface e endereços dos dois servidores.
 *
 * Tudo aqui passa pelo navegador ou pelo proxy do Next (`/api/*` → API Express), que é o caminho
 * real do usuário: cookie de sessão HttpOnly de primeira parte, sem CORS.
 */

import { expect, type Locator, type Page } from '@playwright/test';

import type { E2EUser } from './fixtures';

/** Endereço direto da API Express (fora do proxy do Next), usado pelo teste de saúde. */
export const apiUrl = process.env.API_URL ?? 'http://localhost:3101';

export const LOGIN_URL = '/login';
export const CHANGE_PASSWORD_URL = '/change-password';
export const USERS_URL = '/settings/users';

/**
 * Mensagem de erro de um formulário.
 *
 * O escopo no `<form>` é necessário: o Next injeta na página um `<p role="alert">` próprio
 * (o anunciador de rota, `__next-route-announcer__`), e `getByRole('alert')` solto pegaria os dois.
 */
export function formAlert(page: Page): Locator {
  return page.locator('form').getByRole('alert');
}

/** Mensagem de erro da página (fora de formulário), pelo mesmo motivo do `formAlert`. */
export function pageAlert(page: Page): Locator {
  return page.locator('main section').getByRole('alert');
}

/** Preenche e envia o formulário de login. Não afirma nada sobre o resultado. */
export async function submitLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto(LOGIN_URL);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Login de quem já tem senha definitiva: termina na tela inicial, com o nome no cabeçalho. */
export async function loginAs(page: Page, user: E2EUser, password?: string): Promise<void> {
  await submitLogin(page, user.email, password ?? user.password);
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  await expect(page.getByText(user.name)).toBeVisible();
}

/** Troca a senha na tela `/change-password` e espera a volta para a tela inicial. */
export async function changePassword(
  page: Page,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await page.getByLabel('Senha atual').fill(currentPassword);
  await page.getByLabel('Nova senha', { exact: true }).fill(newPassword);
  await page.getByLabel('Confirmar nova senha').fill(newPassword);
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
}

export const STUDENTS_URL = '/students';

/**
 * CPF válido (dígitos verificadores corretos) e aleatório, só dígitos. Aleatório para não colidir
 * no `@unique` entre testes; nunca uma sequência repetida, que o backend recusa.
 */
export function randomValidCpf(): string {
  let base: number[];
  do {
    base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  } while (base.every((digit) => digit === base[0]));

  const checkDigit = (digits: number[]): number => {
    const weightStart = digits.length + 1;
    const sum = digits.reduce((acc, digit, index) => acc + digit * (weightStart - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const first = checkDigit(base);
  const second = checkDigit([...base, first]);
  return [...base, first, second].join('');
}

/** E-mail único por teste: nenhum spec depende de dado deixado por outro. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100_000)}@e2e.test`;
}
