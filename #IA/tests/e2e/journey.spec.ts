/**
 * E2E de fechamento do MVP (Sprint 9): login → dashboard → importação → alunos.
 *
 * Banco, API e navegador de verdade. O CSV é gerado no teste, com dados sintéticos e e-mails
 * únicos, e sobe pelo input de arquivo da tela de importação, como o admin faria.
 */

import { expect, test } from '@playwright/test';

import { adminUser } from './fixtures';
import { loginAs, randomValidCpf } from './helpers';

test('admin entra, vê o dashboard, importa um CSV e encontra os alunos importados', async ({ page }) => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const csv = [
    'nome;e-mail;cpf;status',
    `Jornada Um ${suffix};jornada1-${suffix}@exemplo.com;${randomValidCpf()};ativo`,
    `Jornada Dois ${suffix};jornada2-${suffix}@exemplo.com;;pausado`,
    `Linha Ruim ${suffix};nao-e-email;;`,
  ].join('\n');

  await loginAs(page, adminUser);

  // Dashboard na tela inicial, com os KPIs carregados.
  await expect(page.getByText('Total de alunos')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Alunos por curso' })).toBeVisible();

  // Importação pelo menu.
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Importar' })
    .click();
  await expect(page.getByRole('heading', { name: 'Importar alunos', level: 1 })).toBeVisible();

  await page.getByTestId('import-file-input').setInputFiles({
    name: 'alunos.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf-8'),
  });
  await expect(page.getByText('3 linhas no arquivo')).toBeVisible();
  await expect(page.getByLabel('Linha inválida')).toBeVisible();

  const imported = page.waitForResponse((response) =>
    response.url().endsWith('/api/students/bulk-import'),
  );
  await page.getByRole('button', { name: 'Importar' }).click();
  expect((await imported).status()).toBe(200);

  await expect(page.getByText('2 alunos importados. 1 linha inválida. 0 duplicatas.')).toBeVisible();

  // Os importados aparecem na listagem.
  await page.getByRole('link', { name: 'Ver alunos' }).click();
  await expect(page.getByRole('heading', { name: 'Alunos', level: 1 })).toBeVisible();
  await page.getByLabel('Buscar por nome ou e-mail').fill(`jornada1-${suffix}`);
  await expect(page.getByRole('row').filter({ hasText: `Jornada Um ${suffix}` })).toBeVisible();
});
