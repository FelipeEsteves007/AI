---
sprint: 3
status: concluída
origem: 002 TASK-209 a 211
---

# Sprint 3 — Gestão de usuários na API

> Detalhe de cada tarefa em [[002-login-perfis/tasks|tasks da 002]]. Voltar para o [[Roadmap]].

## Objetivo

Fechar a API da feature 002: criar usuário, trocar papel, ativar/desativar, redefinir senha — tudo
só para quem tem `users:manage` — e o seed do primeiro admin, sem o qual ninguém entra no sistema
pela primeira vez.

## Pré-requisito

[[sprint-2-autenticacao-api|Sprint 2]] fechada: `requireAuth` e `requirePermission` funcionando.

## Tarefas

| ID | Tarefa | Depende de |
|----|--------|------------|
| TASK-209 | Serviço de usuários (criar, papel, ativar/desativar, redefinir senha) | TASK-205 |
| TASK-210 | Rotas `/api/users` | TASK-208, 209 |
| TASK-211 | Seed do primeiro admin + script `npm run db:seed-admin` | TASK-205 |

## Ordem sugerida

209 → 210 em sequência. A **211 é independente** e pode ser feita a qualquer momento da sprint —
mas não deixe para o fim: é ela que permite testar a mão no navegador na Sprint 4.

## Regras de negócio que esta sprint precisa acertar

- **E-mail único** → 409 `EMAIL_IN_USE`.
- **Senha provisória** devolvida **uma única vez** na resposta da criação, com
  `mustChangePassword = true`. Não fica gravada em lugar nenhum em texto puro.
- **Último admin ativo é protegido**: desativar ou rebaixar o último admin → 409 `LAST_ADMIN`.
  Com dois admins, permitido. Este é o caso que trava o sistema para sempre se passar batido.
- **Desativar incrementa `tokenVersion`** — a sessão aberta da pessoa cai na hora.
- **Redefinir senha** gera nova provisória, marca `mustChangePassword` e incrementa `tokenVersion`.
- Toda ação grava auditoria: `USER_CREATED`, `USER_ROLE_CHANGED`, `USER_DEACTIVATED`,
  `USER_REACTIVATED`, `PASSWORD_RESET`.

## Definição de pronto

- [x] Admin recebe 200/201 em todas as rotas de `/api/users`
- [x] **CEO e vendedor recebem 403 em todas elas** — inclusive nas de leitura
- [x] Sem sessão → 401
- [x] 409 em `EMAIL_IN_USE` e em `LAST_ADMIN`; 404 em id inexistente
- [x] **Nenhuma** resposta traz `passwordHash` ou `tokenVersion`
- [x] `npm run db:seed-admin` cria o admin quando não existe nenhum, não faz nada se já existir,
      e exige `SEED_ADMIN_EMAIL`
- [x] Seed rodado no banco de desenvolvimento — dá para logar de verdade
- [x] `npm run test:coverage` ≥ 70%
- [x] `npm run typecheck && npm test && npm run test:coverage` verde

## Riscos e armadilhas

- **O caso do último admin é o mais fácil de errar** e o mais caro: sem admin ativo, ninguém
  gerencia usuários nunca mais. Testar desativar **e** rebaixar, com um e com dois admins.
- **CEO não gerencia usuários.** Pela matriz da spec, o CEO vê tudo mas não gerencia usuários,
  não importa e não configura. É tentador liberar a leitura de `/api/users` para ele — não libere
  sem mudar a spec antes.
- **Seed idempotente**: rodar duas vezes não pode criar dois admins nem sobrescrever a senha do
  existente.

## Entrega

API da feature 002 completa, com cobertura ≥ 70%.

Próxima: [[sprint-4-frontend-acesso|Sprint 4 — Frontend de acesso]].

## Resultado (2026-09-12)

Sprint 3 concluída por TDD. Estado ao fim da feature 002: 310 testes unitários, 16 E2E, cobertura 92,92%.
Detalhe por tarefa em [[002-login-perfis/report|report da 002]].
