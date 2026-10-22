# Plano de Implementação — 002 Login e Perfis de Acesso

## Decisões necessárias para aprovar

| # | Decisão | Recomendação | Por quê |
|---|---------|--------------|---------|
| D1 | **Banco PostgreSQL** para desenvolvimento, QA e E2E. Não há PostgreSQL no Windows nem nas duas distros do WSL (`Ubuntu` e `Ubuntu-24.04`: sem pacote, sem cluster, porta 5432 livre) | Instalar o PostgreSQL no WSL `Ubuntu` (`sudo apt install postgresql`) com dois bancos: `crm_alunos` (dev) e `crm_alunos_test` (E2E). O WSL2 repassa `localhost:5432` para o Windows | Sem banco não há login real, QA nem E2E. No WSL é grátis, sem conta externa e você já usa o WSL. Alternativas: PostgreSQL no Windows (`winget install PostgreSQL.PostgreSQL.17`) ou Neon (gerenciado, via Vercel Marketplace) |
| D2 | Biblioteca de validação (decisão em aberto do `CLAUDE.md`) — necessária já no login | **Zod** | Tipos TypeScript inferidos do próprio schema, sem duplicar definições |
| D3 | Caixa dos arquivos que não são componentes (decisão em aberto do `CLAUDE.md`) | **camelCase** (`authService.ts`, `requireAuth.ts`) | É o que o scaffold já usa (`app.ts`, `health.ts`) |

Nota técnica (não precisa decidir): o hash usa o algoritmo bcrypt com 10 rounds, como pede a
constitution, pela biblioteca **bcryptjs** (JavaScript puro). A biblioteca `bcrypt` nativa depende
de script de instalação, e o npm 11 deste projeto não roda scripts de instalação sem aprovação.

## Abordagem técnica

- **API Express** ganha as rotas `/api/auth/*` e `/api/users/*`, com camadas
  `routes → controllers → services → models (Prisma)`, como define o `CLAUDE.md`.
- **Injeção de dependência**: `createApp(deps)` recebe os repositórios. Em produção são os do
  Prisma; nos testes Jest, repositórios em memória. Assim a regra de negócio é testada sem banco,
  e o caminho real com PostgreSQL é coberto pelos testes E2E.
- **Sessão**: JWT HS256 (24h) assinado com `JWT_SECRET`, com `sub` (id do usuário) e `tv`
  (versão do token). Vai no cookie `crm_session` com `HttpOnly`, `SameSite=Lax`, `Path=/`,
  `Secure` em produção e `Max-Age` de 24h.
- **Checagem a cada requisição** (`requireAuth`): lê o cookie, valida o JWT, busca o usuário e
  recusa se ele estiver desativado ou se `tv` for diferente do `tokenVersion` atual. É isso que
  derruba o acesso na hora ao desativar e encerra as outras sessões quando a senha muda. O custo é
  uma consulta por requisição, aceitável para ~10 usuários.
- **Senha provisória** (`mustChangePassword = true`): o `requireAuth` só deixa passar
  `GET /api/auth/me`, `PUT /api/auth/password` e `POST /api/auth/logout`; o resto responde 403
  com o código `PASSWORD_CHANGE_REQUIRED`.
- **Bloqueio de tentativas**: conta os `LOGIN_FAILURE` do e-mail na tabela de auditoria nos
  últimos 15 minutos, desde o último `LOGIN_SUCCESS`. Fica no banco, e não em memória, porque na
  Vercel cada instância teria a própria memória.
- **Frontend → API pelo mesmo domínio**: o Next faz proxy de `/api/*` para a API Express
  (`rewrites` no `next.config.mjs`, destino `API_URL`). O navegador só fala com o domínio do Next,
  então o cookie HttpOnly é de primeira parte e não há CORS.
- **Proteção de páginas**: `AuthContext` chama `GET /api/auth/me` ao abrir o app, e o `AuthGuard`
  manda para `/login` (sem sessão) ou `/change-password` (senha provisória). A proteção real
  continua sendo o 401/403 do backend.
- **Permissões**: a matriz fica em um único arquivo no backend (`api/utils/permissions.ts`);
  o `/api/auth/me` devolve a lista de permissões do usuário, que o frontend usa só para mostrar ou
  esconder itens do menu.

## Dependências novas

| Pacote | Tipo | Motivo |
|--------|------|--------|
| `zod` | produção | Validação de entrada (D2) |
| `bcryptjs` | produção | Hash bcrypt de senha, 10 rounds |
| `jsonwebtoken` + `@types/jsonwebtoken` | produção / dev | Assinar e validar o JWT HS256 |
| `cookie-parser` + `@types/cookie-parser` | produção / dev | Ler o cookie de sessão no Express |

## Modelo de dados (Prisma)

```prisma
enum UserRole {
  admin
  ceo
  vendedor
}

enum AuditAction {
  LOGIN_SUCCESS
  LOGIN_FAILURE
  LOGIN_BLOCKED
  LOGOUT
  PASSWORD_CHANGED
  PASSWORD_RESET
  USER_CREATED
  USER_ROLE_CHANGED
  USER_DEACTIVATED
  USER_REACTIVATED
}

model User {
  id                 String   @id @default(uuid())
  name               String
  email              String   @unique
  passwordHash       String
  role               UserRole
  isActive           Boolean  @default(true)
  mustChangePassword Boolean  @default(true)
  tokenVersion       Int      @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@map("Users")
}

model AuditLog {
  id           String      @id @default(uuid())
  action       AuditAction
  actorId      String?
  targetUserId String?
  email        String?
  ip           String?
  metadata     Json?
  createdAt    DateTime    @default(now())

  @@index([email, action, createdAt])
  @@map("AuditLogs")
}
```

Migration: **não destrutiva**. O schema atual não tem nenhum model, então a migration só cria
tabelas e enums.

## Contrato da API

Todas as rotas usam o prefixo `/api`, respondem JSON e, em erro, `{ "error": "<mensagem>", "code": "<CODIGO>" }`.

| Método e rota | Acesso | Corpo | Sucesso | Erros |
|---------------|--------|-------|---------|-------|
| `POST /api/auth/login` | público | `{ email, password }` | 200 `{ user }` + `Set-Cookie` | 400 inválido · 401 `INVALID_CREDENTIALS` · 429 `LOGIN_BLOCKED` |
| `POST /api/auth/logout` | público | — | 204 + cookie expirado | — |
| `GET /api/auth/me` | autenticado (inclui senha provisória) | — | 200 `{ user, permissions }` | 401 |
| `PUT /api/auth/password` | autenticado (inclui senha provisória) | `{ currentPassword, newPassword }` | 204 + novo cookie | 400 · 401 · 422 `SAME_PASSWORD` / `WRONG_CURRENT_PASSWORD` |
| `GET /api/users` | `users:manage` | — | 200 `{ users }` | 401 · 403 |
| `POST /api/users` | `users:manage` | `{ name, email, role }` | 201 `{ user, temporaryPassword }` | 400 · 401 · 403 · 409 `EMAIL_IN_USE` |
| `PUT /api/users/{id}` | `users:manage` | `{ name?, role?, isActive? }` | 200 `{ user }` | 400 · 401 · 403 · 404 · 409 `LAST_ADMIN` |
| `POST /api/users/{id}/password-reset` | `users:manage` | — | 200 `{ temporaryPassword }` | 401 · 403 · 404 |

`user` sempre no formato `{ id, name, email, role, isActive, mustChangePassword, createdAt }` —
nunca `passwordHash` nem `tokenVersion`. Autenticado com senha provisória, qualquer outra rota
responde 403 `PASSWORD_CHANGE_REQUIRED`.

## Análise de impacto no sistema

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.prisma` | Enums `UserRole` e `AuditAction`; models `User` e `AuditLog` |
| `api/app.ts` | `createApp(deps)`; `cookie-parser`; monta `/api/auth`, `/api/users` e o `errorHandler`. `/health` continua igual |
| `next.config.mjs` | `rewrites` de `/api/:path*` para `${API_URL}/api/:path*` |
| `.env.example` | `API_URL` no lugar de `NEXT_PUBLIC_API_URL`; `SEED_ADMIN_NAME` e `SEED_ADMIN_EMAIL` |
| `package.json` | Dependências novas; scripts `db:seed-admin` e `e2e` com o `.env.test` |
| `playwright.config.ts` | Dois servidores (API e Next) apontando para o banco de teste; `globalSetup` |
| `src/pages/_app.tsx` | Envolve o app com `AuthProvider` e `AuthGuard` |
| `src/components/Layout/Layout.tsx` | Menu com "Usuários" só com `users:manage`; nome do usuário e botão Sair |
| `tests/src/components/Layout/Layout.test.tsx` | Cobre o menu por permissão |
| `CLAUDE.md` | Estrutura (pastas `Auth` e `Users`), decisões D2/D3 e comandos novos |

### Arquivos criados

- **Backend**: `api/types/auth.ts`, `api/types/express.d.ts`, `api/utils/permissions.ts`,
  `api/utils/password.ts`, `api/utils/jwt.ts`, `api/utils/httpError.ts`,
  `api/models/prismaClient.ts`, `api/models/userModel.ts`, `api/models/auditLogModel.ts`,
  `api/services/authService.ts`, `api/services/userService.ts`,
  `api/middleware/requireAuth.ts`, `api/middleware/requirePermission.ts`,
  `api/middleware/validate.ts`, `api/middleware/errorHandler.ts`,
  `api/controllers/authController.ts`, `api/controllers/usersController.ts`,
  `api/routes/auth.ts`, `api/routes/users.ts`, `api/database/seeds/seedAdmin.ts`
- **Migration**: `prisma/migrations/<data>_auth_users/`
- **Frontend**: `src/services/apiClient.ts`, `src/services/authService.ts`,
  `src/services/usersService.ts`, `src/context/AuthContext.tsx`,
  `src/components/Common/AuthGuard.tsx`, `src/components/Auth/LoginForm.tsx`,
  `src/components/Auth/ChangePasswordForm.tsx`, `src/components/Users/UserTable.tsx`,
  `src/components/Users/UserFormModal.tsx`, `src/components/Users/TemporaryPasswordDialog.tsx`,
  `src/pages/login.tsx`, `src/pages/change-password.tsx`, `src/pages/settings/users.tsx`
- **Testes**: ver a estratégia de TDD abaixo; repositórios em memória em `tests/api/fakes/`;
  E2E em `tests/e2e/auth.spec.ts`, `tests/e2e/users.spec.ts` e `tests/e2e/globalSetup.ts`

### RBAC

- Admin ganha a tela e a API de usuários. CEO e vendedor não ganham nem perdem nada visível hoje.
- Antes todas as páginas eram abertas; depois todas exigem login (exceto `/login`), e a API passa a
  responder 401 sem sessão (exceto `/health`, login e logout).

### Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Sem PostgreSQL, não há como rodar o sistema de ponta a ponta | D1 antes de começar; testes Jest não dependem de banco |
| Proxy do Next não repassar o cookie corretamente | Coberto pelo E2E de login no navegador |
| Alguém bloquear a conta de outra pessoa errando a senha de propósito (bloqueio por e-mail) | Bloqueio só dura 15 minutos; fica registrado na auditoria |
| JWT continuar válido após desativação | `requireAuth` consulta o usuário e o `tokenVersion` a cada requisição |
| E2E apagar dados de desenvolvimento | O `globalSetup` só roda se o nome do banco terminar em `_test` |
| Chromium instalado não ser o da versão do Playwright | Rodar `npx playwright install chromium` se o E2E pedir |
| Cobertura cair por causa dos repositórios Prisma (cobertos só pelo E2E) | Manter os repositórios finos, sem regra de negócio |
| Webpack quebrar com o `#` no caminho | Continuar sempre com `--turbopack` |
| Produção: Vercel Postgres foi descontinuado (a constitution ainda cita) | Fora desta feature; escolher Postgres pelo Vercel Marketplace no deploy |

## Estratégia de TDD

| Comportamento | Primeiro teste | Camada |
|---------------|---------------|--------|
| Matriz de permissões | `tests/api/utils/permissions.test.ts` | Jest node |
| Hash, comparação e senha provisória | `tests/api/utils/password.test.ts` | Jest node |
| Emissão e validação do JWT e opções do cookie | `tests/api/utils/jwt.test.ts` | Jest node |
| Login, mensagem genérica, bloqueio 5/15, auditoria, troca de senha | `tests/api/services/authService.test.ts` | Jest node + fakes |
| Criar usuário, trocar papel, desativar, último admin, redefinir senha | `tests/api/services/userService.test.ts` | Jest node + fakes |
| 401 sem sessão, desativado, `tokenVersion`, senha provisória, 403 por permissão | `tests/api/middleware/requireAuth.test.ts`, `requirePermission.test.ts` | Jest node |
| Contrato HTTP de `/api/auth` e `/api/users` (status, cookie, sem hash) | `tests/api/routes/auth.test.ts`, `users.test.ts` | Jest node + fakes |
| Seed do primeiro admin (idempotente) | `tests/api/database/seeds/seedAdmin.test.ts` | Jest node + fakes |
| Sessão no frontend e redirecionamentos | `tests/src/context/AuthContext.test.tsx`, `tests/src/components/Common/AuthGuard.test.tsx` | Jest jsdom |
| Formulários de login e troca de senha | `tests/src/components/Auth/*.test.tsx` | Jest jsdom |
| Menu por permissão e tela de usuários | `tests/src/components/Layout/Layout.test.tsx`, `tests/src/components/Users/*.test.tsx` | Jest jsdom |
| Fluxos reais com PostgreSQL e navegador | `tests/e2e/auth.spec.ts`, `tests/e2e/users.spec.ts` | Playwright |

---

**Versão**: 1.0  
**Data**: 2026-09-11
