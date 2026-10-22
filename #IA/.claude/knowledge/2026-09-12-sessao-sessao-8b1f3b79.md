---
agent: sessao
slug: sessao-8b1f3b79
data: 2026-09-12
origem: claude
---

# Aprendizados — sessao · sessao-8b1f3b79 · 2026-09-12
## bugs
- A API sobe sem `DATABASE_URL` nem `JWT_SECRET` e o login quebra na primeira tentativa → o script `dev:api` (`tsx watch api/server.ts`) não carregava o `.env.local` → script trocado para `dotenv -e .env.local -- tsx watch api/server.ts`.
- `getByRole('alert')` falha em modo estrito no Playwright, mesmo com a mensagem certa na tela → o Next injeta `<p role="alert" id="__next-route-announcer__">`, que também casa com a busca → criados os localizadores dedicados `formAlert` e `pageAlert` em `tests/e2e/helpers.ts`.
- `health.spec` falha no E2E → a porta 3101 estava ocupada por um servidor órfão de outra sessão, que também respondia em `/health`, e o `webServer` do Playwright reusou esse processo como se fosse a API → processo encerrado; o `webServer` passou a subir a API do projeto.
- Testes do frontend quebram ao usar `fetch`, `Response` ou `Headers` → o jsdom não implementa essas globais → ambiente de teste próprio (`tests/setup/jsdomEnvironment.js`) que copia as globais nativas do Node para o jsdom, sem polyfill novo.
- O middleware de validação lança erro ao gravar em `req.query` → no Express 5, `req.query` é getter sem setter → o valor validado é gravado com `Object.defineProperty`; `body` e `params` continuam com atribuição direta.
- Permissões inexistentes (`students:read:own`, `dashboard:read`, `students:read`, `reports:export`) compilavam nos testes do frontend → o tipo `Permission` do frontend era `string` → o tipo passou a vir de `api/utils/permissions.ts` com `import type`, e o typecheck acusou as quatro.
- Nome não encontrado em `src/types/auth.ts` depois do re-export → `export type { X } from '...'` não cria o nome no escopo local → foi preciso também `import type { Permission, UserRole } from '@api/utils/permissions'`.

## arquitetura
- O seed do primeiro admin é idempotente contando **qualquer** admin, ativo ou desativado. Contar só os ativos deixaria o seed criar um segundo admin quando existisse um desativado. Admin existente e desativado devolve `skipped`, com a orientação de reativá-lo.
- O wrapper de CLI do seed só roda atrás de `isDirectRun()` (compara `path.resolve(process.argv[1])` com `__filename`) e importa os models do Prisma por import dinâmico. Assim, importar o módulo no teste não executa nada nem instancia o Prisma Client.
- `requireAuth` é fail-closed: `allowPasswordChangePending` vale `false` por padrão. As exceções (`/me`, `/password`, `/logout`) são declaradas na rota, não numa lista dentro do middleware.
- JWT: só `JsonWebTokenError` e `TokenExpiredError` viram 401. Erro de configuração do `JWT_SECRET` (ausente ou fraco) cai no 500, para não se disfarçar de "sessão inválida".
- O `errorHandler` responde `{ error, code, details? }`. Erro desconhecido vira 500 `INTERNAL_ERROR`, sem stack nem mensagem interna. Se `res.headersSent`, delega ao `next`. A biblioteca de log (Pino ou Winston) ficou em aberto, com um `TODO`.
- Nas rotas `/api/users`, a autorização (`requireAuth()` + `requirePermission('users:manage')`) roda antes da validação. Quem não tem permissão não descobre se o id existe nem o formato do corpo.
- `clearSessionCookieOptions()` é derivada de `sessionCookieOptions()` (tira só o `maxAge`). Assim, `path`, `sameSite` e `secure` do logout não divergem dos da criação.
- `createApp(repositories = prismaRepositories)` recebe os repositórios por injeção. Instanciar o Prisma Client não abre conexão, então `createApp()` sem argumentos continua servindo a testes sem banco.
- O frontend não duplica a matriz de permissões. `can()` consulta a lista vinda de `/api/auth/me`, o menu nunca compara `user.role`, e os tipos `Permission`/`UserRole` vêm do backend via `import type`, que some na compilação e não leva código de servidor ao navegador.
- Esconder item de menu e o `AuthGuard` são só cosméticos. Quem barra é o backend (401/403 em toda rota).
- A sessão fica só em cookie HttpOnly, nunca em `localStorage`. O cliente HTTP usa caminhos relativos com `credentials: 'same-origin'`, e o Next faz proxy de `/api/:path*` para `API_URL` via `rewrites`; `NEXT_PUBLIC_API_URL` foi substituída.
- O `AuthGuard` evita laço de redirecionamento assim: `PUBLIC_ROUTES` sai cedo, `/change-password` não redireciona para si mesma, o destino é um único valor derivado (`redirectTo`) consumido por um `useEffect`, e usa `router.replace`, não `push`. O `_app.tsx` só envolve com `Layout` as rotas não públicas.
- A senha provisória vive só no estado da página e chega ao diálogo por prop. `onClose` zera o estado, e não existe refetch que a traga de volta.
- O frontend foi desenvolvido em paralelo ao backend, contra o contrato congelado no `plan.md` e com `fetch` simulado. Divergências entre os lados ficam para o E2E pegar.
- E2E: banco separado `crm_alunos_test` no mesmo container, portas próprias (Next 3100, API 3101), `globalSetup` que aborta se o nome do banco não terminar em `_test`, e `workers: 1` porque os specs dividem banco e servidores. Alternativas descartadas: um container só do projeto (mais um para gerenciar) e parar sem E2E (sem prova de integração real).
- A massa do E2E tem um usuário por cenário sensível a estado (admin único, provisória, bloqueio, senha errada), para um teste não contaminar a contagem de falhas ou a regra do último admin de outro.

## padrao
- TDD com o vermelho registrado: primeiro a saída de falha (módulo inexistente ou 404), depois a implementação.
- Mock de `fetch`: `jest.spyOn(global, 'fetch')` com `new Response(JSON.stringify(body), { status })`, `mockResolvedValueOnce` encadeado para sequências, falha de rede com `mockRejectedValue(new TypeError('Failed to fetch'))` e `jest.restoreAllMocks()` no `afterEach`.
- Sem `supertest` no projeto: testes HTTP da API usam o helper `expressTestApp.ts`, um app Express mínimo em porta efêmera.
- Regras aplicadas a vários papéis usam `describe.each` (ex.: 403 para CEO e vendedor nas quatro rotas, mais a checagem de que o repositório não mudou).
- Ausência de segredos (`passwordHash`, `tokenVersion`) é conferida sobre o texto cru da resposta, não sobre o objeto, para pegar qualquer nível de aninhamento.
- Regra de segurança vira teste: ausência de `localStorage` provada espionando `Storage.prototype`.
- Scripts de CLI escrevem com `process.stdout.write`/`process.stderr.write` e sinalizam via `process.exitCode`, sem `console.log`.
- Zod 4: `z.email()`, `z.uuid()`, `z.coerce.number()`, `z.string().trim().pipe(z.email())`; os detalhes de erro saem de `result.error.issues`.
- Testes de interação usam `fireEvent`, porque `@testing-library/user-event` não está instalado.
- Sem `.prettierrc`: formatar com `--single-quote --print-width 100`.
- Fluxo entre agents: cada subagent tem escopo fechado (`api/**` ou `src/**`), não commita e não edita o `tasks.md` enquanto outro agente escreve nele. O orquestrador marca os checkboxes, roda a linha de verificação completa (`tsc --noEmit`, `test`, `test:coverage`, `e2e`, `build`) e commita por bloco.
- No E2E, falha por defeito real do sistema faz o agente parar e relatar: sem `.skip`, `.only`, `waitForTimeout` nem asserção afrouxada.
- Antes de criar algo num container compartilhado com outros projetos, listar os bancos antes e depois e pedir autorização.
- Script Node longo (geração de documentação) vai para um arquivo e roda com `node arquivo.js`, em vez de heredoc embutido no Bash.

## falha
- Heredoc gigante com muito texto e aspas dentro de `bash -c` quebrou com `unexpected EOF while looking for matching '` e nada rodou. Script em arquivo resolve.
- `Permission = string` no frontend parecia inofensivo (não duplicava a matriz), mas deixava typos compilarem e itens de menu sumirem em silêncio.
- A cobertura do Jest media menos do que prometia: com `projects`, o `collectCoverageFrom` da raiz é ignorado e arquivos sem teste ficam fora da conta.
- `getByRole('alert')` não serve em app Next com Playwright em modo estrito, por causa do anunciador de rota.
- O jsdom sozinho não serve para testar código que usa `fetch`.
- Atribuir `req.query` no Express 5 lança erro.
- Health check 200 não prova que é o seu processo atendendo. O Playwright reusou um servidor órfão na porta do E2E, e a verificação manual de login recebeu 200 de outra instância enquanto a API iniciada ali morria com código 127.
- Testes com repositórios em memória e E2E com `.env.test` próprio não pegaram o `dev:api` sem carregar o `.env.local`. Isso só aparece ao subir o ambiente de desenvolvimento de verdade.
- Subir `dev:api` enquanto outra sessão trabalha no mesmo diretório atrapalha: o `prisma generate` falha com EPERM quando a API está aberta.
- Duas sessões no mesmo diretório misturam mudanças no `package.json`, e aí não dá para commitar só a própria parte sem separar trechos à mão.
- A expiração de 24h da sessão não foi coberta no E2E, porque exigiria manipular o relógio; ficou só em teste de unidade.
