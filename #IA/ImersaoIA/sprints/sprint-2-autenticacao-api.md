---
sprint: 2
status: concluída
origem: 002 TASK-205 a 208
---

# Sprint 2 — Autenticação na API

> Detalhe de cada tarefa em [[002-login-perfis/tasks|tasks da 002]]. Voltar para o [[Roadmap]].

## Objetivo

Login, logout, `/me` e troca de senha funcionando na API — **testados sem banco**, via
repositórios em memória. É aqui que nasce o `requireAuth`, de que todas as rotas de negócio
das sprints 6 a 9 vão depender.

## Pré-requisito

[[sprint-1-fundacao-auth|Sprint 1]] fechada: models aplicados e utilitários de permissão,
senha e JWT verdes.

## Tarefas

| ID | Tarefa | Depende de |
|----|--------|------------|
| TASK-205 | Repositórios (interfaces + Prisma + fakes em memória) | TASK-202 |
| TASK-206 | Serviço de autenticação (login, bloqueio, troca de senha) | TASK-203, 204, 205 |
| TASK-207 | Middlewares `requireAuth`, `requirePermission`, `validate`, `errorHandler` | TASK-206 |
| TASK-208 | Rotas `/api/auth` e `createApp(deps)` | TASK-207 |

## Ordem sugerida

Estritamente sequencial — cada tarefa é insumo da seguinte. A 205 é a que permite testar todo o
resto sem subir banco: crie os fakes com carinho, eles serão usados até a Sprint 9.

## Decisões de arquitetura que se materializam aqui

- **Injeção de dependência**: `createApp(deps)` recebe os repositórios. Produção usa Prisma;
  Jest usa os fakes em memória. A regra de negócio é testada sem banco; o caminho real com
  PostgreSQL fica coberto pelo E2E da [[sprint-5-e2e-fechamento-002|Sprint 5]].
- **Sessão**: JWT HS256 de 24h com `sub` (id) e `tv` (versão do token), no cookie `crm_session`
  — `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` só em produção.
- **Checagem por requisição**: o `requireAuth` valida o JWT, busca o usuário e recusa se estiver
  desativado ou se `tv` ≠ `tokenVersion`. É isso que derruba o acesso na hora ao desativar alguém
  e encerra as outras sessões quando a senha muda. Uma consulta por requisição — aceitável para
  ~10 usuários.
- **Bloqueio de tentativas no banco, não em memória**: conta os `LOGIN_FAILURE` do e-mail nos
  últimos 15 min desde o último `LOGIN_SUCCESS`. Na Vercel cada instância teria a própria memória.

## Definição de pronto

- [x] `POST /api/auth/login` responde 200 com `Set-Cookie` HttpOnly e corpo **sem** `passwordHash`
- [x] E-mail inexistente, senha errada e usuário desativado dão **o mesmo** erro
      `INVALID_CREDENTIALS` (401) e gravam `LOGIN_FAILURE`
- [x] E-mail comparado sem diferenciar maiúsculas
- [x] 5 falhas em 15 min bloqueiam a 6ª com 429 `LOGIN_BLOCKED`; falhas anteriores ao último
      sucesso não contam; fora da janela libera
- [x] `GET /api/auth/me` → 401 sem cookie, 200 com `permissions`
- [x] `PUT /api/auth/password` exige a senha atual, mínimo 6, diferente da atual; zera
      `mustChangePassword`, incrementa `tokenVersion` e devolve cookie novo
- [x] `POST /api/auth/logout` → 204 e cookie expirado
- [x] Senha provisória: só passam `/me`, `/password` e `/logout`; o resto é 403
      `PASSWORD_CHANGE_REQUIRED`
- [x] `GET /health` continua 200 sem sessão, e `tests/api/routes/health.test.ts` segue verde
- [x] `npm run typecheck && npm test && npm run test:coverage` verde

## Riscos e armadilhas

- **Não vazar qual foi o erro.** "E-mail não existe" e "senha errada" devem ser indistinguíveis
  para quem chama — é o que impede descobrir quem tem conta.
- **Nenhuma resposta pode conter `passwordHash` nem `tokenVersion`.** Testar isso explicitamente.
- **JWT nunca em localStorage** — só no cookie HttpOnly. Regra do `CLAUDE.md`.
- **Não quebrar o `/health`**: ele é público e o E2E de fumaça depende dele.

## Entrega

Autenticação completa na API, coberta por testes que rodam sem banco.

Próxima: [[sprint-3-usuarios-api|Sprint 3 — Gestão de usuários na API]].

## Resultado (2026-09-12)

Sprint 2 concluída por TDD. Estado ao fim da feature 002: 310 testes unitários, 16 E2E, cobertura 92,92%.
Detalhe por tarefa em [[002-login-perfis/report|report da 002]].
