# Relatório — 002 Login e Perfis de Acesso

Feature entregue em 2026-09-12. Escopo em [[002-login-perfis/spec|spec]], plano em
[[002-login-perfis/plan|plan]] e tarefas em [[002-login-perfis/tasks|tasks]].

## O que foi implementado

| Tarefa | Entrega | Status |
|--------|---------|--------|
| TASK-201 | Dependências (zod, bcryptjs, jsonwebtoken, cookie-parser) e `.env.example` | ✅ |
| TASK-202 | Models `User` e `AuditLog`, enums e migration `20260912160022_auth_users` | ✅ |
| TASK-203 | Matriz de permissões (7 permissões × 3 papéis), fail-closed | ✅ |
| TASK-204 | bcrypt 10 rounds, JWT HS256 24h, opções de cookie e erros HTTP tipados | ✅ |
| TASK-205 | Repositórios: interfaces, implementações Prisma e fakes em memória | ✅ |
| TASK-206 | `authService`: login, bloqueio 5/15 e troca de senha | ✅ |
| TASK-207 | `requireAuth`, `requirePermission`, `validate` (Zod 4) e `errorHandler` | ✅ |
| TASK-208 | Rotas `/api/auth` e `createApp(deps)` | ✅ |
| TASK-209 | `userService`: criação, papel, ativação, último admin e reset | ✅ |
| TASK-210 | Rotas `/api/users` com RBAC no backend | ✅ |
| TASK-211 | Seed do primeiro admin, idempotente | ✅ |
| TASK-212 | Proxy `/api` no Next, `apiClient` e `AuthContext` | ✅ |
| TASK-213 | `AuthGuard`, telas de login e de troca de senha | ✅ |
| TASK-214 | Layout com menu por permissão | ✅ |
| TASK-215 | Tela `/settings/users` | ✅ |
| TASK-216 | Ambiente E2E: banco de teste, portas 3100/3101 e trava de segurança | ✅ |
| TASK-217 | 16 testes E2E com banco e navegador reais | ✅ |
| TASK-218 | Documentação e verificação final | ✅ |

## Verificação (execução real, 2026-09-12)

| Comando | Resultado |
|---------|-----------|
| `npm run typecheck` | sem erros |
| `npm test` | **310 testes**, 28 suítes |
| `npm run test:coverage` | **92,92%** statements · 86,27% branches (mínimo: 70%) |
| `npm run e2e` | **16 testes**, 41,4 s |
| `npm run build` | compilou |

## Critérios de aceitação

Provados de ponta a ponta pelo E2E: 1 (mensagem genérica), 2 (401 e redirecionamento),
3 (senha provisória), 4 (403 para CEO e vendedor), 5 (desativado perde acesso),
6 (último admin), 7 (bloqueio 5/15), 8 (cookie HttpOnly, nenhuma senha nas respostas)
e 9 (logout). O 10 é a própria linha de verificação acima.

**Não coberto**: a expiração de 24h da sessão (CU-07), que exigiria manipular o relógio.
Hoje ela está coberta só por teste de unidade do JWT.

## Correções vindas do review da Sprint 1

- `UserRole` deixou de ser declarado à mão e passou a vir do Prisma: o typecheck acusa
  divergência se um papel novo entrar no schema.
- `JWT_SECRET` passou a exigir 32 caracteres, em vez de apenas existir.
- O ramo de payload inválido do JWT, única linha descoberta, ganhou três testes.
- `normalizeEmail` e `toPublicUser` saíram de `api/types/` para `api/utils/userMapper.ts`:
  em `types/` ficavam fora da cobertura.

## Desvios do plano

- **Cobertura**: o `collectCoverageFrom` estava no nível raiz do `jest.config.js`, e o Jest o
  ignora quando existe `projects` — arquivos sem teste ficavam fora da conta. Movido para dentro
  de cada projeto, com os repositórios Prisma excluídos de forma explícita (são finos e cobertos
  pelo E2E).
- **Tipos do frontend**: `Permission` era `string`, sem trava nenhuma. Passou a vir de
  `api/utils/permissions` por import de tipo; o typecheck pegou na hora quatro permissões
  inexistentes que estavam em testes.
- **Portas do E2E**: 3100 e 3101 em vez de 3000 e 3001, para não atropelar o ambiente de
  desenvolvimento nem o banco `crm_alunos`.
- **bcryptjs** no lugar do `bcrypt` nativo (mesmo algoritmo, 10 rounds): o npm 11 deste projeto
  não roda scripts de instalação sem aprovação, e o nativo depende disso.

## Decisões fechadas nesta feature

- **D1**: PostgreSQL do container Docker no WSL, com `crm_alunos` (desenvolvimento) e
  `crm_alunos_test` (E2E).
- **D2**: Zod para validação. **D3**: camelCase nos arquivos que não são componentes.
- Perfis de acesso: vale a proposta da [[constitution]] — era a decisão em aberto nº 1.
- Autenticação: JWT próprio com bcrypt, em cookie HttpOnly. Backend em Express.

## Pendências

- [ ] O admin pode desativar a própria conta havendo outro admin ativo?
- [ ] Permissões do CEO para criar e editar alunos e leads — definir na feature de cada módulo.
- [ ] Biblioteca de log (Pino ou Winston): há um `TODO` no `errorHandler` e um `console.info`
      no `api/server.ts` esperando essa decisão.
- [ ] Cobertura da expiração de sessão em E2E.

## Próximo passo

Entregar o [[002-login-perfis/qa-test-plan|plano de testes]] ao QA: 30 casos, matriz de
permissões por papel e o passo a passo de montagem do ambiente. Depois, a
[[sprint-6-alunos|Sprint 6]].
