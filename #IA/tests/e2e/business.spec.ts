/**
 * E2E dos fluxos de negócio das Sprints 7 a 9: cursos e compras, pipeline, tarefas, e-mail e
 * exportação. Banco, API e navegador de verdade.
 *
 * Os alunos e leads de cada teste nascem pela API com a sessão de quem está logado (`page.request`
 * compartilha o cookie do navegador); todo o resto é feito pela tela, como o usuário faria. Nomes e
 * e-mails são únicos por teste, então nenhum spec depende de dado deixado por outro.
 */

import { expect, test, type Page } from '@playwright/test';

import { adminUser, vendedorUser } from './fixtures';
import { loginAs, STUDENTS_URL, uniqueEmail } from './helpers';

interface StudentBody {
  id: string;
  name: string;
}

function suffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

async function createStudent(page: Page, name: string): Promise<StudentBody> {
  const response = await page.request.post('/api/students', {
    data: { name, email: uniqueEmail('negocio') },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as StudentBody;
}

function nav(page: Page, label: string) {
  return page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: label });
}

test('admin cria curso, vende para um aluno pelo detalhe e não consegue excluir curso com compra', async ({ page }) => {
  const id = suffix();
  const courseName = `Curso E2E ${id}`;

  await loginAs(page, adminUser);
  const student = await createStudent(page, `Comprador ${id}`);

  // Cursos: cria pelo modal.
  await nav(page, 'Cursos').click();
  await page.getByRole('button', { name: '+ Novo curso' }).click();
  const courseDialog = page.getByRole('dialog', { name: 'Novo curso' });
  await courseDialog.getByLabel('Nome').fill(courseName);
  await courseDialog.getByLabel('Preço (R$)').fill('497,90');
  await courseDialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('row').filter({ hasText: courseName })).toContainText('R$');

  // Compra pelo detalhe do aluno: valor padrão é o preço do curso.
  await page.goto(`${STUDENTS_URL}/${student.id}`);
  const coursesCard = page.getByRole('region', { name: 'Cursos comprados' });
  await coursesCard.getByRole('button', { name: '+ Adicionar curso' }).click();
  const purchaseDialog = page.getByRole('dialog', { name: 'Adicionar curso' });
  await purchaseDialog.getByLabel('Curso').selectOption({ label: courseName });
  await expect(purchaseDialog.getByLabel('Valor (R$)')).toHaveValue('497,90');
  await purchaseDialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(coursesCard).toContainText(courseName);

  // Persiste: recarregando, a compra continua no card.
  await page.reload();
  await expect(page.getByRole('region', { name: 'Cursos comprados' })).toContainText(courseName);

  // Curso com compra não é excluído (S7-1).
  await nav(page, 'Cursos').click();
  await page.getByRole('button', { name: `Excluir ${courseName}` }).click();
  const deleteDialog = page.getByRole('dialog', { name: 'Excluir curso' });
  await deleteDialog.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(deleteDialog).toContainText('já tem compras e não pode ser excluído');
  await deleteDialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('row').filter({ hasText: courseName })).toBeVisible();
});

test('vendedor move uma oportunidade no Kanban e a mudança persiste', async ({ page }) => {
  const id = suffix();

  await loginAs(page, vendedorUser);
  const student = await createStudent(page, `Lead ${id}`);
  const lead = await page.request.post('/api/pipeline', { data: { studentId: student.id, value: '1200.00' } });
  expect(lead.status(), await lead.text()).toBe(201);

  await nav(page, 'Pipeline').click();
  const prospecting = page.getByRole('region', { name: 'Coluna Prospecção' });
  await expect(prospecting.getByRole('button', { name: student.name })).toBeVisible();

  const saved = page.waitForResponse(
    (response) => response.url().includes('/api/pipeline/') && response.request().method() === 'PUT',
  );
  await page.getByLabel(`Mover ${student.name} para`).selectOption('negotiation');
  expect((await saved).status()).toBe(200);

  const negotiation = page.getByRole('region', { name: 'Coluna Negociação' });
  await expect(negotiation.getByRole('button', { name: student.name })).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole('region', { name: 'Coluna Negociação' }).getByRole('button', { name: student.name }),
  ).toBeVisible();
});

test('vendedor cria uma tarefa, conclui pelo checkbox e ela vai para Concluídas', async ({ page }) => {
  const title = `Ligar E2E ${suffix()}`;

  await loginAs(page, vendedorUser);
  await nav(page, 'Tarefas').click();

  await page.getByRole('button', { name: '+ Nova tarefa' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova tarefa' });
  await dialog.getByLabel('Título').fill(title);
  await dialog.getByLabel('Prioridade').selectOption('high');
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  // Vencimento padrão é hoje.
  await expect(page.getByRole('region', { name: 'Hoje' }).getByText(title)).toBeVisible();

  await page.getByRole('checkbox', { name: `Concluir ${title}` }).check();
  await expect(page.getByRole('region', { name: 'Concluídas' }).getByText(title)).toBeVisible();

  await page.reload();
  await expect(page.getByRole('region', { name: 'Concluídas' }).getByText(title)).toBeVisible();
});

test('admin envia e-mail para alunos selecionados e exporta o CSV com o filtro da busca', async ({ page }) => {
  const id = suffix();

  await loginAs(page, adminUser);
  const first = await createStudent(page, `Email E2E ${id} A`);
  const second = await createStudent(page, `Email E2E ${id} B`);

  await nav(page, 'Alunos').click();
  const filtered = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/students' && url.searchParams.get('search') === `Email E2E ${id}`;
  });
  await page.getByLabel('Buscar por nome ou e-mail').fill(`Email E2E ${id}`);
  await filtered;

  await page.getByRole('checkbox', { name: `Selecionar ${first.name}` }).check();
  await page.getByRole('checkbox', { name: `Selecionar ${second.name}` }).check();
  await page.getByRole('button', { name: 'Enviar e-mail (2)' }).click();

  const dialog = page.getByRole('dialog', { name: 'Enviar e-mail' });
  await expect(dialog).toContainText('2 alunos selecionados');
  await dialog.getByLabel('Assunto').fill('Novidades');
  await dialog.getByLabel('Mensagem').fill('Olá {{name}}, temos novidades.');
  await dialog.getByRole('button', { name: 'Enviar' }).click();
  // Sem SMTP_HOST no E2E, o envio é simulado pelo nodemailer, mas passa pela API inteira.
  await expect(page.getByRole('status')).toContainText('E-mail enviado para 2 alunos.');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^alunos-\d{4}-\d{2}-\d{2}\.csv$/);

  const path = await file.path();
  const { readFile } = await import('node:fs/promises');
  const content = (await readFile(path)).toString('utf-8').replace(/^﻿/, '');
  const lines = content.trim().split('\r\n');
  expect(lines[0]).toBe('Nome;E-mail;Telefone;CPF;Status;Vendedor;Cursos;Data de cadastro');
  expect(lines).toHaveLength(3);
  expect(content).toContain(first.name);
  expect(content).toContain(second.name);
});
