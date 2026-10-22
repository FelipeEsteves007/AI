import { expect, test } from '@playwright/test';

import { apiUrl } from './helpers';

test('API sobe e responde 200 em /health', async ({ request }) => {
  // Endereço absoluto: o `baseURL` é o Next (3100) e o `/health` é da API Express (3101).
  const response = await request.get(`${apiUrl}/health`);

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});

test('o frontend sobe e serve a tela de login', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
});
