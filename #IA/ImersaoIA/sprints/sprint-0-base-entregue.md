---
sprint: 0
status: concluída
origem: 001 TASK-001, 002 (parcial), 004
---

# Sprint 0 — Base do projeto (já entregue)

> Documento de referência, não de trabalho. Registra o que já existe para nenhuma sprint
> replanejar isso. Voltar para o [[Roadmap]].

## O que está de pé

| Item | Estado | Onde |
|------|--------|------|
| Next.js 15 (Pages Router, Turbopack) + React 18 + TS strict | ✅ | `package.json`, `tsconfig.json` |
| Tailwind CSS 3 | ✅ | `tailwind.config.js`, `src/styles/globals.css` |
| Estrutura de pastas de `src/`, `api/`, `tests/` | ✅ | com `README.md` em cada pasta |
| API Express 5 com `createApp()` | ✅ | `api/app.ts`, `api/server.ts` |
| Rota `GET /health` | ✅ | `api/routes/health.ts` |
| Prisma 6 configurado (datasource + generator) | ✅ | `prisma/schema.prisma` |
| PostgreSQL 17 acessível, banco `crm_alunos` criado | ✅ | container Docker no WSL — ver [[handoff]] |
| `.env.local` preenchido e validado | ✅ | `DATABASE_URL`, `JWT_SECRET` |
| `.env.example` versionado | ✅ | |
| Jest (api + src) e Playwright configurados | ✅ | `jest.config.js`, `playwright.config.ts` |
| Testes de fumaça | ✅ | `tests/api/routes/health.test.ts`, `tests/e2e/health.spec.ts`, `tests/src/components/Layout/Layout.test.tsx` |
| Layout esqueleto | ✅ | `src/components/Layout/Layout.tsx`, `_app.tsx`, `index.tsx` |
| Documentação no vault do Obsidian | ✅ | este vault |

## O que ainda falta desta base

- [ ] **Repositório Git** — o projeto **não é** um repositório Git hoje (`git rev-parse` falha).
      Nada versionado, nenhum histórico. Fazer `git init` + commit inicial **antes** da Sprint 1,
      para que o schema e as migrations nasçam versionados.
- [ ] GitHub remoto e CI — planejado para a [[sprint-9-email-relatorios-deploy|Sprint 9]]
      (TASK-033), mas o `git init` local não precisa esperar.

## O que explicitamente **não** existe

Nada de negócio foi implementado. Para não haver ilusão de progresso:

- `prisma/schema.prisma` **sem nenhum model** — só `generator` e `datasource`
- nenhuma migration, nenhum seed
- `api/`: só `/health`. Sem rotas, controllers, services, models ou middleware
- `src/`: só `Layout.tsx`, `_app.tsx` e `index.tsx`. Sem páginas de negócio, services ou context
- dependências ainda **não** instaladas: `zod`, `bcryptjs`, `jsonwebtoken`, `cookie-parser`,
  e mais adiante `recharts`, um parser de CSV e `nodemailer`

## Correção de uma decisão registrada

O `plan.md` da 002 traz a decisão **D1** dizendo que não existe PostgreSQL disponível e recomendando
`sudo apt install postgresql` no WSL. **Isso está desatualizado**: em 2026-09-12 encontramos um
container Docker com PostgreSQL 17 já pronto no WSL `Ubuntu`, e é ele que o projeto usa. A decisão
D1 está resolvida na prática, por outro caminho.

Consequência para a [[sprint-5-e2e-fechamento-002|Sprint 5]]: o banco de teste `crm_alunos_test`
será criado **no mesmo container**, não num Postgres nativo:

```bash
wsl -d Ubuntu -e bash -lc 'docker exec postgres createdb -U postgres crm_alunos_test'
```

## Próximo passo

[[sprint-1-fundacao-auth|Sprint 1 — Fundação de autenticação]].
