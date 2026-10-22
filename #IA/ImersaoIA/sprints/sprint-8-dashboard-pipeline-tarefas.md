---
sprint: 8
status: concluida
origem: 001 TASK-019 a 024
---

# Sprint 8 — Dashboard, pipeline e tarefas

> Detalhe de cada tarefa em [[001-crm-alunos/tasks|tasks da 001]]. Voltar para o [[Roadmap]].

## Objetivo

As três telas que fazem a equipe trabalhar no sistema em vez de só consultar: o painel de números
para o CEO, o funil de vendas para os vendedores e as tarefas de follow-up.

## Pré-requisito

[[sprint-7-importacao-cursos-compras|Sprint 7]] fechada. O dashboard só diz alguma coisa com os
alunos e as compras já dentro do banco.

## Tarefas

| ID | Tarefa | SP | Depende de |
|----|--------|----|------------|
| TASK-019 | Métricas do dashboard (backend): agregações | 5 | Sprint 7 |
| TASK-020 | Dashboard (frontend): KPIs e gráficos | 5 | TASK-019 |
| TASK-021 | Leads do pipeline (backend): CRUD + status + RBAC | 4 | Sprint 6 |
| TASK-022 | Pipeline (frontend): Kanban com arrastar e soltar | 5 | TASK-021 |
| TASK-023 | Tarefas (backend): CRUD, concluir, filtros | 4 | Sprint 6 |
| TASK-024 | Tarefas (frontend): agrupadas por prazo | 4 | TASK-023 |

**27 SP — a sprint mais pesada do roadmap.** Se precisar quebrar em duas, o corte natural é
dashboard (10 SP) de um lado, pipeline + tarefas (17 SP) do outro.

## Ordem sugerida

Três trilhas independentes entre si (dashboard, pipeline, tarefas), cada uma backend → frontend.
Fazer o dashboard primeiro: é o que o CEO vê, e valida se os dados importados na Sprint 7 estão
coerentes.

## Dependência nova

`recharts` para os gráficos (ainda não instalado). Confirmar que entra no bundle sem estourar o
tempo de carregamento — é a biblioteca que o `ui/design.md` assume.

## Definição de pronto

Estado em 2026-09-14 (sessão 4). Sprint feita sem subagentes ("projeto de aula, seguir como está").

**Dashboard**
- [x] `GET /api/dashboard/metrics`: total de alunos, alunos novos no período, alunos ativos, taxa de atividade, receita total e no período, alunos por curso e receita dos últimos 12 meses. Vendedor recebe só os números da própria carteira
- [x] `?period=` aceita `7days`, `30days` (padrão), `90days` e `custom` com `from`/`to`
- [x] Responde em **71 ms** com 3.000 alunos no Postgres de dev (meta < 2 s)
- [x] Tela na rota `/` com skeleton enquanto busca
- [x] Gráfico de barras (alunos por curso) e de linhas (receita por mês) com `recharts` 2.15; teste renderiza os dois sem erro
- [x] Cores `#2563EB` / `#10B981` / `#F59E0B`
- [x] Responsivo (grid 1 → 2 → 4 colunas)

**Pipeline**
- [x] Quatro colunas: Prospecção, Negociação, Vendido, Perdido
- [x] Arrastar e soltar nativo do HTML5 (sem biblioteca) + seletor "Mover para" no card; mudança otimista que reverte se a API falhar
- [x] **Vendedor vê apenas os próprios leads**, filtrado na query, e só abre lead para aluno da carteira
- [x] Total de valor por coluna no rodapé
- [x] Filtros por vendedor (admin e CEO) e por período de criação

**Tarefas**
- [x] CRUD; `PUT /api/tasks/:id/complete` grava ou limpa o `completedAt`
- [x] **Cada usuário vê apenas as próprias tarefas**, inclusive admin e CEO
- [x] Agrupamento por prazo no fuso do Brasil: vencidas (vermelho), hoje, próximos dias, concluídas (cinza)
- [x] Filtros por status e prioridade
- [x] Bônus: botão "Nova tarefa" do detalhe do aluno habilitado, já com o aluno vinculado

- [x] Verificação: typecheck ok · 810 unitários · cobertura 92,03% · 34 integração · 22 E2E · build ok

### Decisões desta sprint

| # | Decisão |
|---|---------|
| S8-1 | Lead **vendido não gera compra**: a compra continua manual ("+ Adicionar curso"), sem acoplar os dois serviços |
| S8-2 | Notificação de tarefa vencida fica **só visual** (vermelho na lista); push e e-mail ficam para a v2 |
| S8-3 | **Taxa de atividade = alunos com status `ativo` / total**: o sistema não registra acesso nem contato, então `lastContactDate` segue sem uso |
| S8-4 | Dívida de `Task.relatedTo` resolvida pela **opção (a) sem migration**: a API fala `studentId`, gravado em `relatedTo` com `relatedType = 'student'` |
| S8-5 | Vencimento enviado como `YYYY-MM-DD` é gravado ao meio-dia de Brasília, para não trocar de dia |
| S8-6 | O dashboard ocupa a rota `/`; o E2E passa a esperar o título "Dashboard" depois do login |

### Não coberto

- E2E específico de dashboard, pipeline e tarefas (a suíte existente, ajustada, passa)
- Excluir lead (não estava na TASK-021)

## Decisões em aberto que tocam esta sprint

| Decisão | Onde pesa | Sugestão |
|---------|-----------|----------|
| Lead marcado como "vendido" gera compra automaticamente ou manualmente? | TASK-021/022 | Decidir **antes** da 021 — muda o serviço, não só a tela |
| Notificações de tarefas vencidas em tempo real (push, e-mail) ou não? | TASK-024 | Ficar no visual (vermelho na lista) nesta sprint; notificação é v2 |

## Riscos e armadilhas

- **Agregação em cima de 3.000 alunos fica lenta sem índice.** Medir antes de otimizar, mas medir.
- **Arrastar e soltar precisa de estado otimista com reversão.** Se a API recusar a mudança de
  status (RBAC, por exemplo), o card tem que voltar para a coluna de origem.
- **A taxa de atividade depende de `lastContactDate`**, que hoje ninguém preenche. Definir de onde
  vem esse dado antes de calcular a métrica — senão o número nasce sempre zero.
- **Nada de `console.log`** nas telas de gráfico. Usar o logger.

## Entrega

CRM completo em funcionalidade. Falta só o acabamento e o deploy.

Próxima: [[sprint-9-email-relatorios-deploy|Sprint 9 — E-mail, relatórios e deploy]].

---

## ✅ Dívida herdada da Sprint 6 — resolvida pela opção (a), ver S8-4

Achado do review da Tarefa 0 da [[sprint-6-alunos|Sprint 6]] (2026-09-12).

O [[data-model]] descreve `Task.relatedTo` como **polimórfico** (id de aluno, lead ou curso, com
`relatedType` dizendo qual), mas o schema aplicado tem uma FK `Tasks_relatedTo_fkey` que **só
aceita id de `Students`** (com `onDelete: Cascade`, decisão S6-4). `relatedType` é texto livre, sem
enum.

**Consequência**: criar tarefa com `relatedType='lead'` e `relatedTo=<id do lead>` falha com erro de
FK do Prisma (P2003).

Escolher antes de começar o módulo de tarefas:

- **(a)** `relatedTo` passa a significar só aluno e `relatedType` sai do schema — mais simples;
- **(b)** uma coluna opcional por alvo (`studentId?`, `leadId?`), cada uma com a sua FK e a sua
  cascata — mantém o vínculo com lead.

As duas exigem migration. Nenhuma trava a Sprint 6, que só relaciona tarefa com aluno.
