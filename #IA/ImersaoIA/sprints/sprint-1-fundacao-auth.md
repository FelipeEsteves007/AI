---
sprint: 1
status: concluída
origem: 002 TASK-201 a 204
---

# Sprint 1 — Fundação de autenticação

> Detalhe de cada tarefa em [[002-login-perfis/tasks|tasks da 002]]. Voltar para o [[Roadmap]].

## Objetivo

Colocar no lugar as peças que todo o resto usa: as dependências, os **primeiros models do banco**
e os utilitários puros de permissão, senha e JWT. Nenhuma rota ainda — só a base testada.

## Pré-requisitos

- [x] `git init` e commit inicial feitos (ver [[sprint-0-base-entregue|Sprint 0]])
- [x] Container Postgres no ar: `wsl -d Ubuntu -e bash -lc 'docker start postgres'`
- [x] Decisões **D2 (Zod)** e **D3 (camelCase)** aprovadas — estão como recomendação no
      `plan.md` da 002 e como decisões em aberto no `CLAUDE.md`. Aprovar as duas **fecha** essas
      pendências do projeto. D1 já está resolvida (ver [[sprint-0-base-entregue|Sprint 0]]).

## Tarefas

| ID | Tarefa | Depende de |
|----|--------|------------|
| TASK-201 | Dependências e configuração (`zod`, `bcryptjs`, `jsonwebtoken`, `cookie-parser`) | — |
| TASK-202 | Schema Prisma (`User`, `AuditLog`, enums) e primeira migration | TASK-201 |
| TASK-203 | Matriz de permissões — `hasPermission`, `permissionsFor` | TASK-201 |
| TASK-204 | Utilitários de senha (bcrypt 10 rounds) e JWT HS256 | TASK-201 |

## Ordem sugerida

1. **TASK-201** primeiro e sozinha — instala tudo e ajusta o `.env.example`. Confirmar que
   `npm run typecheck` e `npm test` continuam verdes antes de seguir.
2. **TASK-202** logo depois: é a que destrava o resto do projeto (é a primeira migration do banco).
3. **TASK-203** e **TASK-204** são independentes entre si e não dependem da 202 — dá para fazer
   em qualquer ordem, ou em paralelo se houver duas mãos.

## Definição de pronto

- [x] `zod`, `bcryptjs`, `jsonwebtoken`, `cookie-parser` e tipos instalados
- [x] `.env.example` com `API_URL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`; sem `NEXT_PUBLIC_API_URL`
- [x] `prisma/schema.prisma` com os enums `UserRole` e `AuditAction` e os models `User` e `AuditLog`
- [x] `npm run db:migrate` gerou `prisma/migrations/<data>_auth_users/` e aplicou no `crm_alunos`
- [x] `npx prisma validate` passa
- [x] `api/utils/permissions.ts` cobre **todos** os cruzamentos papel × permissão da matriz da spec
- [x] `api/utils/password.ts`, `api/utils/jwt.ts` e `api/utils/httpError.ts` criados
- [x] Testes escritos **antes** da implementação, todos verdes
- [x] `npm run typecheck && npm test && npm run test:coverage` verde

## Riscos e armadilhas

- **`bcrypt` nativo não.** Usar `bcryptjs` (JavaScript puro): o npm 11 deste projeto não roda
  scripts de instalação sem aprovação, e o `bcrypt` nativo depende disso. Continua sendo o
  algoritmo bcrypt com 10 rounds, como manda a constitution.
- **A migration só cria.** O schema não tem nenhum model hoje, então não há risco de perda de
  dados. Mas o `crm_alunos` divide o container com `CursoREST` e `TurboMobile`, de outros
  projetos — conferir a `DATABASE_URL` antes de rodar qualquer coisa destrutiva.
- **A matriz de permissões é a fonte única.** Ela mora só em `api/utils/permissions.ts`. Não
  duplicar a regra no frontend: o `/me` devolve a lista pronta.
- **Testar o JWT pelo que ele recusa**, não só pelo que aceita: token expirado, adulterado e
  assinado com outro segredo têm que falhar.

## Entrega

Base testada, sem nenhuma rota nova. `npm test` verde e migration aplicada no banco de
desenvolvimento.

Próxima: [[sprint-2-autenticacao-api|Sprint 2 — Autenticação na API]].

## Resultado (2026-09-12)

- TASK-201 a 204 concluídas por TDD; 69 testes verdes em 6 suítes.
- Cobertura: **96,05%** (mínimo 70%).
- Migration `20260912160022_auth_users` aplicada em `crm_alunos`.
- Verificação completa (`typecheck`, `test`, `test:coverage`, `e2e`, `build`) passou.
- Extra: script `npm run db:validate` criado, porque o `prisma validate` não enxerga o `.env.local` sozinho.
