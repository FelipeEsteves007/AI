# Tarefas — 002 Login e Perfis de Acesso

Numeração `TASK-2NN` para não colidir com o backlog da feature 001. Toda tarefa segue o ciclo
**🔴 teste falhando → 🟢 implementação mínima → ♻️ refatoração**.

**Pré-requisito**: decisões D1 (banco), D2 (Zod) e D3 (camelCase) aprovadas — ver `plan.md`.

---

## Sprint 1 — Fundação (dados e utilitários)

### TASK-201: Dependências e configuração ✅
**Depende de**: —
- [x] Instalar `zod`, `bcryptjs`, `jsonwebtoken`, `cookie-parser` e os tipos
- [x] `.env.example`: `API_URL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`; remover `NEXT_PUBLIC_API_URL`

**Testável**: `npm run typecheck` e `npm test` continuam verdes.

### TASK-202: Schema Prisma e migration ✅
**Depende de**: TASK-201, D1
- [x] Enums `UserRole` e `AuditAction`; models `User` e `AuditLog` (ver `plan.md`)
- [x] `npm run db:migrate` gera `prisma/migrations/<data>_auth_users/` — gerada `20260912160022_auth_users` e aplicada em `crm_alunos`

**Testável**: `prisma validate` ok e migration aplicada no banco de desenvolvimento.

### TASK-203: Matriz de permissões ✅
**Depende de**: TASK-201
- [x] 🔴 `tests/api/utils/permissions.test.ts`: cada papel × cada permissão da matriz da spec
- [x] 🟢 `api/utils/permissions.ts`: `hasPermission(role, permission)` e `permissionsFor(role)`

**Testável**: todos os cruzamentos da matriz batem com a spec.

### TASK-204: Senha e JWT ✅
**Depende de**: TASK-201
- [x] 🔴 `tests/api/utils/password.test.ts`: hash ≠ senha, compara certo e errado, senha provisória com tamanho mínimo e aleatória
- [x] 🔴 `tests/api/utils/jwt.test.ts`: assina e valida; token expirado, adulterado ou com outro segredo é recusado; opções do cookie (HttpOnly, SameSite=Lax, 24h, Secure só em produção)
- [x] 🟢 `api/utils/password.ts`, `api/utils/jwt.ts`, `api/utils/httpError.ts`

**Testável**: testes verdes.

**Pronto da Sprint 1**: `npm test` verde e migration aplicada.

---

## Sprint 2 — Autenticação na API

### TASK-205: Repositórios ✅
**Depende de**: TASK-202

> ⚠️ Do review da Sprint 1: o índice único de e-mail no Postgres **diferencia maiúsculas**, mas a RN-01 exige comparação sem diferenciar. Normalizar para minúsculas na escrita e na busca, com teste de `Admin@X.com` versus `admin@x.com`.
- [x] Interfaces `UserRepository` e `AuditLogRepository` em `api/types/auth.ts`
- [x] Implementações Prisma: `api/models/prismaClient.ts`, `userModel.ts`, `auditLogModel.ts`
- [x] Implementações em memória: `tests/api/fakes/inMemoryRepositories.ts` (+ teste dos próprios fakes)

**Testável**: `npm run typecheck` verde; os fakes servem aos testes das próximas tarefas.

### TASK-206: Serviço de autenticação ✅
**Depende de**: TASK-203, TASK-204, TASK-205
- [x] 🔴 `tests/api/services/authService.test.ts`:
  - login certo devolve o usuário e grava `LOGIN_SUCCESS`
  - e-mail inexistente, senha errada e usuário desativado dão o mesmo erro `INVALID_CREDENTIALS` e gravam `LOGIN_FAILURE`
  - e-mail comparado sem diferenciar maiúsculas
  - 5 falhas em 15 min bloqueiam a 6ª (`LOGIN_BLOCKED`); falhas antes do último sucesso não contam; fora da janela libera
  - troca de senha: exige a senha atual, mínimo 6, diferente da atual, zera `mustChangePassword`, incrementa `tokenVersion` e grava `PASSWORD_CHANGED`
- [x] 🟢 `api/services/authService.ts`

**Testável**: testes verdes.

### TASK-207: Middlewares ✅
**Depende de**: TASK-206

> ⚠️ Do review da Sprint 1: o projeto usa **Zod 4**, cuja API mudou em relação à 3 (`z.email()` no lugar de `z.string().email()`, mensagens em `error`). Seguir a documentação da v4.
- [x] 🔴 `tests/api/middleware/requireAuth.test.ts`: sem cookie → 401; token inválido → 401; usuário desativado → 401; `tokenVersion` diferente → 401; senha provisória → 403 `PASSWORD_CHANGE_REQUIRED` fora das 3 rotas liberadas
- [x] 🔴 `tests/api/middleware/requirePermission.test.ts`: permissão ausente → 403
- [x] 🟢 `requireAuth.ts`, `requirePermission.ts`, `validate.ts` (Zod), `errorHandler.ts`, `api/types/express.d.ts`

**Testável**: testes verdes.

### TASK-208: Rotas `/api/auth` ✅
**Depende de**: TASK-207

> ⚠️ Do review da Sprint 1: o `clearCookie` do logout precisa das mesmas opções (`path`, `sameSite`, `secure`) usadas ao criar o cookie. Expor um `clearSessionCookieOptions()` derivado, em vez de repetir as opções no controller.
- [x] 🔴 `tests/api/routes/auth.test.ts` (HTTP real contra `createApp(fakes)`):
  - login 200 com `Set-Cookie` HttpOnly e corpo sem `passwordHash`; 401 genérico; 429 no bloqueio; 400 com corpo inválido
  - `GET /me` 401 sem cookie e 200 com `permissions`
  - `PUT /password` troca a senha e devolve cookie novo
  - logout 204 expira o cookie
  - `/health` continua 200 sem sessão
- [x] 🟢 `authController.ts`, `routes/auth.ts`, `createApp(deps)` em `api/app.ts`

**Testável**: testes verdes; `tests/api/routes/health.test.ts` segue verde.

**Pronto da Sprint 2**: login, logout, `/me` e troca de senha funcionando na API, testados sem banco.

---

## Sprint 3 — Gestão de usuários na API

### TASK-209: Serviço de usuários ✅
**Depende de**: TASK-205
- [x] 🔴 `tests/api/services/userService.test.ts`:
  - criar: e-mail único (409), papel válido, senha provisória devolvida uma vez, `mustChangePassword = true`, `USER_CREATED`
  - trocar papel (`USER_ROLE_CHANGED`); desativar e reativar (`USER_DEACTIVATED` / `USER_REACTIVATED`) incrementando `tokenVersion` ao desativar
  - último admin ativo: desativar ou rebaixar → `LAST_ADMIN`; com dois admins, permitido
  - redefinir senha: nova provisória, `mustChangePassword = true`, `tokenVersion` incrementado, `PASSWORD_RESET`
- [x] 🟢 `api/services/userService.ts`

**Testável**: testes verdes.

### TASK-210: Rotas `/api/users` ✅
**Depende de**: TASK-208, TASK-209
- [x] 🔴 `tests/api/routes/users.test.ts`: admin 200/201; CEO e vendedor 403 em todas; sem sessão 401; 409 `EMAIL_IN_USE` e `LAST_ADMIN`; 404 id inexistente; nenhuma resposta traz `passwordHash` ou `tokenVersion`
- [x] 🟢 `usersController.ts`, `routes/users.ts`

**Testável**: testes verdes.

### TASK-211: Seed do primeiro admin ✅
**Depende de**: TASK-205
- [x] 🔴 `tests/api/database/seeds/seedAdmin.test.ts`: cria admin com senha provisória quando não há admin; não faz nada se já existir admin; exige `SEED_ADMIN_EMAIL`
- [x] 🟢 `api/database/seeds/seedAdmin.ts` e script `npm run db:seed-admin`

**Testável**: testes verdes e seed rodado no banco de desenvolvimento.

**Pronto da Sprint 3**: API completa da feature, com `npm run test:coverage` ≥ 70%.

---

## Sprint 4 — Frontend

### TASK-212: Proxy, cliente HTTP e contexto de sessão ✅
**Depende de**: TASK-208
- [x] `next.config.mjs` com `rewrites` para `API_URL`
- [x] 🔴 `tests/src/context/AuthContext.test.tsx`: carrega o usuário via `/me`; sem sessão fica deslogado; `login` e `logout` atualizam o estado
- [x] 🟢 `src/services/apiClient.ts`, `authService.ts`, `src/context/AuthContext.tsx`

**Testável**: testes verdes.

### TASK-213: Guarda de rotas, login e troca de senha
 ✅
**Depende de**: TASK-212
- [x] 🔴 `tests/src/components/Common/AuthGuard.test.tsx`: sem sessão → `/login`; senha provisória → `/change-password`; logado → mostra a página
- [x] 🔴 `tests/src/components/Auth/LoginForm.test.tsx`: campos obrigatórios, mensagem genérica de erro, aviso de bloqueio
- [x] 🔴 `tests/src/components/Auth/ChangePasswordForm.test.tsx`: mínimo 6, confirmação igual, erros da API
- [x] 🟢 `AuthGuard.tsx`, `LoginForm.tsx`, `ChangePasswordForm.tsx`, `pages/login.tsx`, `pages/change-password.tsx`, `_app.tsx`

**Testável**: testes verdes.

### TASK-214: Layout com menu por permissão
 ✅
**Depende de**: TASK-212
- [x] 🔴 `tests/src/components/Layout/Layout.test.tsx`: "Usuários" só com `users:manage`; mostra o nome do usuário; "Sair" chama o logout
- [x] 🟢 `Layout.tsx`

**Testável**: testes verdes.

### TASK-215: Tela de usuários
 ✅
**Depende de**: TASK-210, TASK-213
- [x] 🔴 `tests/src/components/Users/UserTable.test.tsx`: lista, ações por linha, estado desativado
- [x] 🔴 `tests/src/components/Users/UserFormModal.test.tsx`: validação, envio, erro de e-mail em uso
- [x] 🔴 `tests/src/components/Users/TemporaryPasswordDialog.test.tsx`: mostra a senha uma vez, com aviso
- [x] 🟢 `src/services/usersService.ts`, componentes em `src/components/Users/`, `pages/settings/users.tsx` (só admin)

**Testável**: testes verdes.

**Pronto da Sprint 4**: fluxo completo no navegador com a API rodando.

---

## Sprint 5 — E2E, documentação e verificação

### TASK-216: Ambiente E2E ✅
**Depende de**: TASK-211, TASK-215, D1
- [x] `.env.test` (fora do git) apontando para `crm_alunos_test`
- [x] `tests/e2e/globalSetup.ts`: recusa rodar se o banco não terminar em `_test`; aplica as migrations do zero e cria um usuário por papel e um com senha provisória
- [x] `playwright.config.ts`: sobe API e Next; script `e2e` carregando o `.env.test`

**Testável**: `npm run e2e` sobe os dois servidores e o `health.spec.ts` continua verde.

### TASK-217: Testes E2E ✅
**Depende de**: TASK-216
- [x] `tests/e2e/auth.spec.ts`: login dos 3 papéis; credencial errada; página sem login vai para `/login`; senha provisória força a troca; logout; bloqueio após 5 erros
- [x] `tests/e2e/users.spec.ts`: admin cria usuário e vê a senha provisória; o novo usuário entra e troca a senha; CEO e vendedor recebem 403 na API e não veem o menu; desativado perde o acesso; último admin protegido

**Testável**: `npm run e2e` verde.

### TASK-218: Documentação e verificação final ✅
**Depende de**: todas
- [x] `CLAUDE.md`: pastas `Auth` e `Users`, D2 e D3 resolvidas, comandos `db:seed-admin` e E2E com banco de teste
- [x] Linha de verificação completa do `CLAUDE.md`
- [x] `report.md` desta feature

**Testável**: `npm run typecheck && npm test && npm run test:coverage && npm run e2e && npm run build` verde.

**Pronto da Sprint 5**: os 10 critérios de aceitação da spec comprovados.

---

## Resumo

| Sprint | Tarefas | Entrega |
|--------|---------|---------|
| 1 — Fundação | TASK-201 a 204 | Schema, matriz de permissões, senha e JWT |
| 2 — Autenticação | TASK-205 a 208 | Login, logout, `/me`, troca de senha |
| 3 — Usuários | TASK-209 a 211 | API de usuários e seed do primeiro admin |
| 4 — Frontend | TASK-212 a 215 | Login, troca de senha, menu e tela de usuários |
| 5 — E2E e fechamento | TASK-216 a 218 | E2E com banco real, docs e verificação |
| **Total** | **18 tarefas** | |
