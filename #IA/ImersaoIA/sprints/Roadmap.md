# Roadmap de Sprints — CRM de Alunos

Sequência única de execução do projeto. Reconcilia os planos das duas features, que se
sobrepunham: a [[001-crm-alunos/spec|001]] descrevia autenticação, login, gestão de usuários e
proteção de rotas por alto, e a [[002-login-perfis/spec|002]] replanejou **o mesmo trabalho** em
detalhe, com TDD tarefa a tarefa. Aqui cada trabalho aparece **uma vez só**.

Os `tasks.md` das features continuam sendo a fonte do detalhe de cada tarefa — estes documentos
dizem **em que ordem** e **quando parar**.

## Visão geral

| Sprint | Foco | Tarefas | Origem | Estado |
|--------|------|---------|--------|--------|
| [[sprint-0-base-entregue\|0]] | Base do projeto (já entregue) | — | 001 TASK-001/002/004 | ✅ Concluída |
| [[sprint-1-fundacao-auth\|1]] | Fundação de autenticação | 4 | 002 TASK-201 a 204 | ✅ Concluída |
| [[sprint-2-autenticacao-api\|2]] | Autenticação na API | 4 | 002 TASK-205 a 208 | ✅ Concluída |
| [[sprint-3-usuarios-api\|3]] | Gestão de usuários na API | 3 | 002 TASK-209 a 211 | ✅ Concluída |
| [[sprint-4-frontend-acesso\|4]] | Frontend de acesso | 4 | 002 TASK-212 a 215 | ✅ Concluída |
| [[sprint-5-e2e-fechamento-002\|5]] | E2E e fechamento da 002 | 3 | 002 TASK-216 a 218 | ✅ Concluída |
| [[sprint-6-alunos\|6]] | Domínio de alunos | 5 | 001 TASK-007 a 011 | ✅ Concluída (sem tela de cadastro, por decisão) |
| [[sprint-7-importacao-cursos-compras\|7]] | Importação CSV, cursos e compras | 7 | 001 TASK-012 a 018 | ✅ Concluída |
| [[sprint-8-dashboard-pipeline-tarefas\|8]] | Dashboard, pipeline e tarefas | 6 | 001 TASK-019 a 024 | ✅ Concluída |
| [[sprint-9-email-relatorios-deploy\|9]] | E-mail, relatórios e deploy | 6 | 001 TASK-025 a 028, 033, 034 | ✅ Concluída — no ar em https://crm-alunos-sable.vercel.app (sem proteção de branch: plano gratuito) |

**Total**: 42 tarefas em 9 sprints de trabalho.

## Story points

Só a feature 001 estimou em story points; a 002 planejou por tarefa, sem SP. As sprints 6 a 9
somam **86 SP**:

| Sprint | SP |
|--------|----|
| [[sprint-6-alunos\|6]] | 21 |
| [[sprint-7-importacao-cursos-compras\|7]] | 22 |
| [[sprint-8-dashboard-pipeline-tarefas\|8]] | 27 |
| [[sprint-9-email-relatorios-deploy\|9]] | 16 |

> ⚠️ **Os totais do `tasks.md` da 001 não fecham.** Ele anuncia 112 SP, mas somando tarefa por
> tarefa dá **124 SP**; o módulo "Alunos" está como 28 e é 30; e os totais das sprints (40/50/22)
> também não batem com as tarefas listadas dentro delas (47/54/23). Os números **por tarefa** são
> consistentes entre si, então é neles que este roadmap se apoia. Dos 124 SP, 38 saíram por terem
> sido feitos ou substituídos pela 002 — sobram os 86 acima.

## Por que a 002 vem primeiro

A 002 entrega `User`, `AuditLog`, a matriz de permissões, o JWT em cookie HttpOnly e o
`requireAuth`/`requirePermission`. **Todo** endpoint da 001 depende desse middleware para cumprir
a regra da constitution de que RBAC é validado no backend, em toda rota. Construir os alunos antes
do RBAC significaria voltar em cada rota depois.

## Tarefas da 001 que saíram do roadmap

Não foram esquecidas — a 002 as substituiu com um plano melhor:

| Task da 001 | O que aconteceu |
|-------------|-----------------|
| TASK-001 Setup do projeto | ✅ Feita (Next 15, Tailwind, TS strict, estrutura) |
| TASK-002 Setup do banco | ⚠️ Parcial: Postgres e Prisma configurados, banco `crm_alunos` criado; **os models** entram nas Sprints 1 e 6 |
| TASK-003 Autenticação JWT | → Sprints 1 e 2 (TASK-204, 206, 207, 208) |
| TASK-004 Variáveis de ambiente | ✅ Feita (`.env.local` e `.env.example`); os secrets de produção ficam na Sprint 9 |
| TASK-005 Tela de login | → Sprint 4 (TASK-213) |
| TASK-006 Gestão de usuários | → Sprints 3 e 4 (TASK-209, 210, 215) |
| TASK-029 Header & Sidebar | ⚠️ Esqueleto existe; o menu por permissão é a TASK-214 (Sprint 4) |
| TASK-030 Proteção de rotas | → Sprint 4 (TASK-213, `AuthGuard`) |
| TASK-031 Testes unitários | Diluída: o projeto é TDD, cada tarefa nasce com teste |
| TASK-032 Testes E2E | → Sprint 5 (infra, TASK-216/217) e Sprint 9 (fluxos de negócio) |

## Regras que valem para todas as sprints

- **TDD sempre**: 🔴 teste falhando → 🟢 implementação mínima → ♻️ refatoração. Ver [[constitution]].
- **Cobertura ≥ 70%** — `npm run test:coverage` falha abaixo disso.
- **RBAC no backend, em toda rota.** Esconder no menu não é controle de acesso.
- **Nenhuma sprint fecha** sem a linha de verificação passar:
  ```
  npm run typecheck && npm test && npm run test:coverage && npm run e2e && npm run build
  ```
  (a partir da Sprint 5, quando o E2E com banco real existe; antes disso, sem o `e2e`)
- **Definição de pronto** por tarefa: código com teste verde, sem `console.log`, sem erro 500,
  responsivo quando for tela, e o testável da tarefa confirmado.

## Estado do ambiente

PostgreSQL 17 em container Docker no WSL `Ubuntu`, banco `crm_alunos`, `localhost:5432`.
Credenciais e recuperação de falhas em [[handoff]].
