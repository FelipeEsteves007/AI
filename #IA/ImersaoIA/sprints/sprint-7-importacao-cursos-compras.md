---
sprint: 7
status: concluida
origem: 001 TASK-012 a 018
---

# Sprint 7 — Importação CSV, cursos e compras

> Detalhe de cada tarefa em [[001-crm-alunos/tasks|tasks da 001]]. Voltar para o [[Roadmap]].

## Objetivo

A sprint que torna o sistema utilizável de verdade: trazer os ~3.000 alunos do CRM atual por CSV,
e registrar o que cada um comprou.

## Pré-requisito

[[sprint-6-alunos|Sprint 6]] fechada — a importação escreve em `Student`, e as compras dependem de
`Student` e `Course`.

## Tarefas

| ID | Tarefa | SP | Depende de |
|----|--------|----|------------|
| TASK-012 | Importação CSV (backend): parser, validação, relatório | 5 | Sprint 6 |
| TASK-013 | Importação CSV (frontend): upload, preview, progresso | 4 | TASK-012 |
| TASK-014 | CRUD de cursos (backend) | 3 | Sprint 6 |
| TASK-015 | Gestão de cursos (frontend) | 3 | TASK-014 |
| TASK-016 | Registrar compra (backend) | 3 | TASK-014 |
| TASK-017 | Listar compras do aluno (backend) | 2 | TASK-016 |
| TASK-018 | Adicionar curso ao aluno (frontend) | 2 | TASK-010, 016 |

**22 SP.**

## Ordem sugerida

Duas trilhas independentes: **cursos → compras** (014 → 015 → 016 → 017 → 018) e **importação**
(012 → 013). Dá para alternar. Se precisar priorizar, a importação vale mais: é ela que permite
cancelar a assinatura do CRM pago.

## Uma contradição a resolver nesta sprint

A TASK-012 pede **transação única — "insert all ou rollback"**. Mas o teste crítico do `CLAUDE.md`
diz o contrário:

> Importação CSV de 3.000 alunos: valida CPF e e-mail, **pula as linhas inválidas sem abortar** e
> devolve relatório de sucessos, falhas e duplicatas.

**Vale o `CLAUDE.md`**: uma linha ruim no meio de 3.000 não pode derrubar a importação inteira —
seria inutilizável na prática. Ajustar a TASK-012 e o `spec.md` da 001 para "linha a linha, com
relatório", e usar transação só por lote, se for preciso por performance.

## Definição de pronto

Estado em 2026-09-14 (sessão 4). Implementada sem subagentes, por pedido do Adriano ("projeto de
aula, seguir como está").

- [x] CSV com 3.000 alunos importa em menos de 1 minuto: teste de rota com 3.000 linhas; no Postgres são 2 consultas de checagem e 3 `createMany` de 1.000
- [x] Linhas inválidas (e-mail malformado, CPF inválido, nome vazio, status ou responsável desconhecido) são **puladas**
- [x] Relatório separa **importados, falhas e duplicatas**, com linha e motivo em cada rejeição
- [x] Duplicata por e-mail e por CPF, tanto já cadastrados quanto repetidos no próprio arquivo
- [x] Limite de 10.000 registros (400, nada gravado)
- [x] Importação auditada: `STUDENTS_IMPORTED` com as contagens (migration `students_imported_audit`)
- [x] Frontend `/settings/import`: clique e arrastar; preview das 5 primeiras linhas com ✓ ⚠ ✗; barra de progresso (indeterminada); relatório de erros baixável em CSV
- [ ] Dashboard reflete os importados: o dashboard é da [[sprint-8-dashboard-pipeline-tarefas|Sprint 8]]; a listagem já reflete
- [x] Cursos: CRUD, escritas só admin; preço com 2 casas; excluir curso com compras → 409 `COURSE_HAS_PURCHASES`
- [x] Vendedor e CEO recebem 403 nas escritas de cursos (listar é liberado: o vendedor escolhe o curso da compra)
- [x] Compra: 409 `PURCHASE_DUPLICATE`; data futura → 400 (fuso `America/Sao_Paulo`); curso inexistente → 404; valor padrão = preço do curso
- [x] Compras do aluno por data decrescente (`GET /api/students/:id/purchases`)
- [x] Verificação: typecheck ok · 762 unitários · cobertura 93,32% · 34 integração · 22 E2E · build ok

### Decisões de implementação

| # | Decisão |
|---|---------|
| S7-1 | **Excluir curso com compras: bloquear** (409), como a TASK-014 assumia. Para tirar de venda, desativar |
| S7-2 | CSV enviado como `text/csv` no corpo (sem multipart e sem `csv-parser`): parser próprio, aceita `,` ou `;`, BOM e cabeçalhos em português |
| S7-3 | Importação linha a linha com relatório (vale o `CLAUDE.md`, não o "insert all ou rollback" da TASK-012) |
| S7-4 | `GET /api/courses` liberado para todos os papéis; escritas com `courses:manage` |
| S7-5 | Compra registrada por qualquer papel, no escopo do aluno (vendedor só nos próprios, 404 fora) |
| S7-6 | Excluir curso não é auditado (a constitution cita delete, mas a aula dispensou) |

### Não coberto

- E2E específico de cursos, compras e importação (a suíte E2E existente continua verde)
- Teste de integração do `createMany`/`findExistingKeys` no Postgres real

## Riscos e armadilhas

- **Nunca integrar com a Hotmart automaticamente.** A importação é manual, por CSV. Regra do
  `CLAUDE.md`.
- **O CSV tem CPF e e-mail de alunos.** O `.gitignore` já bloqueia `*.csv` e `/uploads/` — não
  commitar arquivo de teste com dado real; gerar massa sintética.
- **3.000 linhas de uma vez travam a UI** se o processamento for síncrono no cliente. O parser do
  preview lê só as primeiras linhas; o resto é trabalho do backend.
- **Compra com data futura** é um dos testes críticos do `CLAUDE.md` — não deixar passar.

## Entrega

Base de alunos real dentro do sistema, com cursos e compras.

Próxima: [[sprint-8-dashboard-pipeline-tarefas|Sprint 8 — Dashboard, pipeline e tarefas]].
