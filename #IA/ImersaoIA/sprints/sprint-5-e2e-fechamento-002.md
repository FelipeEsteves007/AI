---
sprint: 5
status: concluída
origem: 002 TASK-216 a 218
---

# Sprint 5 — E2E e fechamento da 002

> Detalhe de cada tarefa em [[002-login-perfis/tasks|tasks da 002]]. Voltar para o [[Roadmap]].

## Objetivo

Provar contra **banco real** que o acesso funciona ponta a ponta, e fechar formalmente a feature
002. A infraestrutura de E2E criada aqui é reaproveitada por todas as sprints seguintes.

## Pré-requisito

[[sprint-4-frontend-acesso|Sprint 4]] fechada.

## Tarefas

| ID | Tarefa | Depende de |
|----|--------|------------|
| TASK-216 | Ambiente E2E: `.env.test`, `globalSetup`, `playwright.config.ts` | TASK-211, 215 |
| TASK-217 | Testes E2E de autenticação e de usuários | TASK-216 |
| TASK-218 | Documentação e verificação final | todas |

## Ordem sugerida

Sequencial. A 216 é a que dá mais trabalho e a que mais paga depois.

## Banco de teste

O `plan.md` da 002 supunha um Postgres instalado no WSL. Como o projeto usa o **container Docker**
(ver [[sprint-0-base-entregue|Sprint 0]]), o banco de teste se cria assim:

```bash
wsl -d Ubuntu -e bash -lc 'docker exec postgres createdb -U postgres crm_alunos_test'
```

E o `.env.test` (fora do Git) aponta para ele:

```
DATABASE_URL="postgresql://postgres:masterkey@localhost:5432/crm_alunos_test?schema=public"
```

## Definição de pronto

- [x] `.env.test` criado e **fora do Git** (o `.gitignore` já cobre `.env.*`)
- [x] `globalSetup` **recusa rodar** se o nome do banco não terminar em `_test` — esta é a trava
      que impede o E2E apagar o banco de desenvolvimento
- [x] `globalSetup` aplica as migrations do zero e cria um usuário por papel + um com senha provisória
- [x] `npm run e2e` sobe API e Next sozinho e o `health.spec.ts` continua verde
- [x] `auth.spec.ts`: login dos 3 papéis; credencial errada; página sem login vai para `/login`;
      senha provisória força a troca; logout; bloqueio após 5 erros
- [x] `users.spec.ts`: admin cria usuário e vê a senha provisória; o novo usuário entra e troca a
      senha; CEO e vendedor recebem 403 na API e não veem o menu; desativado perde o acesso;
      último admin protegido
- [x] `CLAUDE.md` atualizado: pastas `Auth` e `Users`, D2 e D3 marcadas como resolvidas, comandos
      `db:seed-admin` e E2E com banco de teste
- [x] `report.md` da feature 002 escrito **neste vault**, em `specs/002-login-perfis/`
- [x] Os 10 critérios de aceitação da spec da 002 comprovados
- [x] Linha completa verde:
      `npm run typecheck && npm test && npm run test:coverage && npm run e2e && npm run build`

## Riscos e armadilhas

- **A trava do `_test` é a coisa mais importante desta sprint.** Um E2E apontando para
  `crm_alunos` apaga o banco de desenvolvimento. E o container ainda hospeda `CursoREST` e
  `TurboMobile`, de outros projetos — um erro aqui vaza para fora deste projeto.
- **Teste o 403 na API, não só o menu escondido.** É a diferença entre RBAC e maquiagem.
- **O E2E de bloqueio depende de tempo** (janela de 15 min). Controlar isso pelo estado do banco
  no setup, não com espera real.

## Entrega

Feature 002 concluída e comprovada. A partir daqui todo endpoint novo já nasce com
`requireAuth`/`requirePermission` disponíveis.

Próxima: [[sprint-6-alunos|Sprint 6 — Domínio de alunos]].

## Resultado (2026-09-12)

Sprint 5 concluída por TDD. Estado ao fim da feature 002: 310 testes unitários, 16 E2E, cobertura 92,92%.
Detalhe por tarefa em [[002-login-perfis/report|report da 002]].
