# Handoff — CRM Interno para Gestão de Alunos

> Estado atual do trabalho e próximo passo. Atualizar sempre **este** arquivo (não criar um por sessão).

Última atualização: 2026-09-14 (sessão 4 — MVP no ar na Vercel)

---

## Onde paramos

**Sessão 4 (2026-09-14), sétima parte: dados fictícios em produção** para os alunos da aula verem a aplicação pronta (o Adriano vai excluir o projeto da Vercel depois).
- **Seed:** `seedDemo` rodado no Neon, com 3.000 alunos, 2.219 compras, 389 oportunidades e 276 tarefas.
- **Logins** (senha `Demo@12345` para todos):
  - `admin@demo.crm.test`;
  - `ceo@demo.crm.test`;
  - `ana@demo.crm.test`, `bruno@demo.crm.test` e `camila@demo.crm.test`, que são vendedores e donos das tarefas.
- **Confirmado pela API de produção:** o admin vê 3.000 alunos, e a vendedora Ana vê 883 alunos e 95 tarefas.
- **Repetir o seed:** ele é idempotente e só apaga o que ele mesmo criou. O comando é `DATABASE_URL=<unpooled do Neon> tsx server/database/seeds/seedDemo.ts` **sem** `NODE_ENV=production`.

**Sessão 4, sexta parte:**
- **E2E:** nova suíte `tests/e2e/business.spec.ts` com 4 fluxos (cursos e compras, Kanban, tarefas, e-mail e exportação CSV). A suíte agora tem 27 testes.
- **Tarefas:** o checkbox virou otimista, com reversão se a API falhar.
- **Deploy automático:** continua **BLOCKED**, porque o autor dos commits é `asrsantos@gmail.com` e não o dono da conta Vercel. A produção é atualizada com `vercel deploy --prod` até o Adriano escolher uma solução: e-mail do commit, ligar a conta `asrsantos` à Vercel ou tornar o repositório público.

**Sessão 4, quinta parte: o MVP está em produção em https://crm-alunos-sable.vercel.app.**

- **Estrutura:** a Vercel transforma cada arquivo de `api/` em função pública, então o backend virou `server/` (alias `@server/`) e roda dentro do Next por `src/pages/api/[...path].ts`, num projeto só. Em dev e no E2E nada muda, porque o `API_URL` mantém o proxy para 3001/3101.
- **Banco:** Neon pelo Marketplace (`crm-alunos-db`, só production e preview), com as migrations aplicadas. O locale `C.UTF-8` casa o `ILIKE` com acento.
- **Variáveis:** `JWT_SECRET` e `LOG_LEVEL` foram recriadas pelo Git Bash, porque o pipe do PowerShell pôs BOM nos valores e a produção deu 500.
- **Admin:** o primeiro admin (`adriano@adrianosantostreina.com.br`) foi criado no banco de produção. A senha provisória foi mostrada uma vez ao Adriano e **precisa ser trocada no primeiro login**.
- **Deploy automático:** o projeto está ligado ao GitHub, e cada push na `main` gera um deploy de produção.
- **Pendentes:**
  - SMTP de produção (sem ele o e-mail fica simulado);
  - proteção de branch (exige plano Pro).
- **Arquivos soltos:** `.agents/`, `.claude/skills/` e `skills-lock.json` foram criados pela instalação do Neon ("agent skills"). Estão fora do git e o Adriano decide se ficam.

### Quarta parte da sessão 4: código da [[sprint-9-email-relatorios-deploy|Sprint 9]] publicado no GitHub
- **Repositório:** privado, em https://github.com/adrianosantostreina/crm-alunos, com o CI verde.
- **Proteção de branch:** bloqueada, porque o plano gratuito não oferece isso em repositório privado.
- **Deploy na Vercel:** adiado pelo Adriano.
Relatório final da feature em [[001-crm-alunos/report|report da 001]].

- **E-mail:**
  - `POST /api/email/send`, com o modal "Enviar e-mail" no detalhe do aluno;
  - `POST /api/email/send-bulk`, disparado pela seleção de alunos na listagem (máx. 100), com `{{name}}` e `{{course}}`;
  - auditoria `EMAIL_SENT`;
  - sem `SMTP_HOST`, o envio é simulado.
- **Exportação:** `GET /api/reports/students-export?format=csv`, com o botão "Exportar CSV" para admin e CEO. O CSV sai pronto para o Excel e respeita os filtros da tela.
- **Logger Pino:** `api/utils/logger.ts`, usado no `server.ts` e no `errorHandler`. Não há `console.log` em `api/` e `src/`.
- **Migration** `20260914153139_email_and_export_audit`, que acrescenta ao enum `EMAIL_SENT` e `STUDENTS_EXPORTED`.
- **CI:** `.github/workflows/ci.yml` com os jobs `verify` e `e2e`, e `.nvmrc` = 24. O CI **ainda não rodou**, porque falta o remoto.
- **E2E da jornada:** `tests/e2e/journey.spec.ts`, cobrindo login → dashboard → importação → alunos.
- **Verificação verde:**

  | Etapa | Resultado |
  |---|---|
  | typecheck | ok |
  | Testes unitários | 828 |
  | Cobertura | 92% |
  | Integração | 34 |
  | E2E | 23 |
  | build | ok |

### Terceira parte da sessão 4: [[sprint-8-dashboard-pipeline-tarefas|Sprint 8]] concluída
Também foi feita sem subagentes.

- **Dashboard** na rota `/`: `GET /api/dashboard/metrics` com 4 KPIs e gráficos do `recharts` 2.15.
  Responde em 71 ms com 3.000 alunos.
- **Pipeline** em `/pipeline`: `/api/pipeline` e Kanban com arrastar e soltar nativo, mudança otimista que se desfaz se a API falhar,
  filtros por vendedor e por período.
- **Tarefas** em `/tasks`: `/api/tasks` (cada usuário só vê as próprias), agrupamento por prazo e filtros.
  O botão "Nova tarefa" do detalhe do aluno foi habilitado.
- **Decisões S8-1 a S8-6** registradas na nota da sprint:
  - lead vendido não gera compra;
  - notificação só visual;
  - taxa de atividade = fração de alunos com status `ativo`;
  - `Task.relatedTo` só aponta para aluno, sem migration.
- **Verificação verde:**

  | Etapa | Resultado |
  |---|---|
  | typecheck | ok |
  | Testes unitários | 810 |
  | Cobertura | 92,03% |
  | Integração | 34 |
  | E2E | 22 |
  | build | ok |

  O E2E passou a esperar o título "Dashboard" depois do login.

### Segunda parte da sessão 4: [[sprint-7-importacao-cursos-compras|Sprint 7]] concluída
A Sprint 7 foi feita **sem subagentes**, por pedido do Adriano, com a orientação "é projeto de aula, não precisamos de coisas reais".

- **Cursos:** `/api/courses` (CRUD, escritas só admin) e página `/courses`. Excluir curso com compras
  é **bloqueado** (409), decisão S7-1.
- **Compras:** `GET/POST /api/students/:id/purchases` e botão "+ Adicionar curso" no detalhe do aluno.
- **Importação CSV:** `POST /api/students/bulk-import` (texto `text/csv`, parser próprio, linha a
  linha com relatório e auditoria `STUDENTS_IMPORTED`) e página `/settings/import`, com item "Importar" no menu.
- **Migration nova:** `20260914141809_students_imported_audit`, que só acrescenta o valor ao enum.
- **Verificação verde:**

  | Etapa | Resultado |
  |---|---|
  | typecheck | ok |
  | Testes unitários | 762 |
  | Cobertura | 93,32% |
  | Integração | 34 |
  | E2E | 22 |
  | build | ok |

- **Decisão do Adriano sobre a Sprint 6:** a tela de cadastro de aluno (UC-4.3) e o histórico de alterações
  (UC-4.2) **ficam fora**. O plano segue como está.

### Primeira parte da sessão 4: fechamento da [[sprint-6-alunos|Sprint 6]]

Foram usados 4 subagentes: `backend-api`, `code-reviewer` e `qa-testes` duas vezes.

- **Auditoria `STUDENT_DELETED`** (migration `20260914132927_student_deleted_audit`):
  - o log é gravado **na mesma `$transaction`** do delete, depois do review, que apontou risco de exclusão sem registro;
  - se o log falhar, a exclusão é desfeita, e isso foi provado no Postgres real.
- **Teste de integração** do `studentModel` no `crm_alunos_test`, com `npm run test:integration`. Ele achou um **bug real, já corrigido**: `%` e `_` na busca funcionavam como curinga.
- **E2E de alunos:** `tests/e2e/students.spec.ts`, com 6 cenários.
- **Verificação completa verde:**

  | Etapa | Resultado |
  |---|---|
  | typecheck | ok |
  | Testes unitários | 674 |
  | Cobertura | 94,99% |
  | Integração | 34 |
  | E2E | 22 |
  | build | ok |

- **Commits:**
  - `00475c8` agents, hooks e RAG;
  - `96c0550` Sprint 6;
  - mais um commit de documentação.

**Lacuna encontrada:** não existe **tela de cadastro de aluno**. Pela decisão do Adriano, ela fica fora.

### Estado herdado da sessão 3

A implementação da Sprint 6 (domínio de alunos) está concluída e revisada. As 6 tarefas (Tarefa 0 + TASK-007 a 011) passaram pelo fluxo
orquestrador → agent do módulo → `code-reviewer` isolado. Foram 9 reviews e **nenhum bloqueante**.
Os achados "importante" de cada review foram corrigidos na tarefa seguinte do mesmo agent, e a
última rodada saiu **APROVADA** sem ressalvas.

O que existe hoje, além do que a [[002-login-perfis/report|feature 002]] entregou:

- Models de negócio no banco (`Student`, `Course`, `Purchase`, `PipelineLead`, `Task`), migration
  `20260912190237_business_models`
- API `GET/POST /api/students` e `GET/PUT/DELETE /api/students/:id` com RBAC no backend: vendedor
  só vê e edita os próprios alunos (filtro na query), só o admin exclui, cascata de compras,
  oportunidades e tarefas
- Telas `/students` (tabela, busca com debounce, filtros, paginação, cards no mobile) e
  `/students/[id]` (edição inline, cursos, oportunidades, tarefas, anotações)
- Seed de demonstração com **3.000 alunos fictícios** (`npm run db:seed-demo`)

**Números verificados no fim da sessão**: 398 testes da API e 259 do frontend verdes, typecheck
verde, zero warnings de `act`. Listagem com 3.000 alunos no Postgres real responde em **9 a 52 ms**
(meta < 500 ms).

## Próximo passo concreto

1. **Configurar um SMTP de produção:** adicionar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM` em production e preview, **pelo Git Bash**.
   - Migrations futuras em produção: `vercel env pull <arquivo fora do projeto> --environment=production` e depois `prisma migrate deploy` com o `DATABASE_URL_UNPOOLED`.
2. **Proteção da `main`:** decidir entre assinar o GitHub Pro, tornar o repositório público ou seguir sem proteção.
2. **Pendências das Sprints 7 e 8** que não foram feitas (projeto de aula):
   - E2E específico de dashboard, pipeline e tarefas;
   - excluir lead.
3. **Pendências da Sprint 7:**
   - E2E específico de cursos, compras e importação;
   - teste de integração do `createMany`/`findExistingKeys`;
   - auditoria da exclusão de curso.

Sugestões de review não aplicadas nesta sessão:
- `auditLogModel.ts` com 61% de cobertura (consultas do bloqueio de login, anteriores à sessão);
- retenção (LGPD) do snapshot do aluno excluído no `AuditLog`;
- `targetId`/`targetType` genéricos se a tela de auditoria sair.

Ainda falta um teste de rota que confira no `snapshot()` do fake, após o 204, que os filhos foram apagados.
Hoje isso só é coberto pela integração.

## Decisões desta sessão

### Sprint 6 (detalhe e justificativa em [[sprint-6-alunos]])

| # | Decisão |
|---|---------|
| S6-1 | `uuid()` em todos os models (a 001 usava `cuid()`) |
| S6-2 | `Student.email` `@unique` no banco |
| S6-3 | `User` da 002 prevalece; o do [[data-model]] foi ignorado |
| S6-4 | Excluir aluno apaga as tarefas (`Cascade`, não `SetNull`) |
| S6-5 | `GET /api/students/:id` entrou na TASK-007 |
| S6-6 | Os 3 papéis criam e editam alunos; vendedor só os próprios, sem reatribuir |
| S6-7 | Filtro por curso adiado para a Sprint 7 |
| S6-8 | Filtro por vendedor só para quem tem `users:manage` |
| S6-9 | No detalhe, vendedor só vê as próprias oportunidades e tarefas |
| S6-10 | Não atribuir aluno novo a usuário desativado |
| S6-11 | Escopo aplicado também na gravação; `P2025` → 404 |
| — | E-mail de aluno normalizado em minúsculas; CPF gravado só com dígitos e validado por dígito verificador |

O [[data-model]] ganhou um aviso de divergência: **o `prisma/schema.prisma` é a fonte da verdade.**

A dívida da FK polimórfica de `Task.relatedTo` ficou registrada em
[[sprint-8-dashboard-pipeline-tarefas|Sprint 8]]: resolver antes do módulo de tarefas.

### Infraestrutura de agents e automação (em `.claude/` e `.opencode/`)

- **Agents** em `.claude/agents/`: `code-reviewer` (só leitura), `backend-api`, `frontend-ui`,
  `database-prisma`, `qa-testes`. Todos se identificam no chat (`🤖 agent: <nome>`) e declaram o
  gate ao devolver. Espelho em `.opencode/agent/`.
- **Comandos** `/review`, `/implementar`, `/entrega` (e `/nova-implementacao`) com protocolo de
  identificação do orquestrador. Espelho em `.opencode/commands/`.
- **Hooks por agent** em `.claude/hooks/<agent>/` (Node `.mjs`), declarados no frontmatter dos
  agents. ⚠️ **Não foram vistos disparando** na sessão em que foram criados: um probe real passou
  sem bloqueio, embora o script bloqueie quando chamado direto. Confirmar depois de reiniciar o
  Claude Code. Plugin equivalente para OpenCode em `.opencode/plugin/agent-hooks.ts`.
- **RAG de aprendizados** (`.claude/scripts/` + `.claude/hooks/rag/`, registrados em
  `.claude/settings.json`): captura em `SubagentStop` e `Stop`, injeção em `UserPromptSubmit`.
  SQLite + sqlite-vec + all-MiniLM-L6-v2, tudo local. Funcionando em uso real. Detalhes e
  armadilhas em `.claude/scripts/README.md`.

## Pendências fora da Sprint 6

- **RAG**: sem deduplicação (injeta trechos parecidos); o resumo **não filtra segredos nem dados de
  aluno** antes de gravar em `.claude/knowledge/`; no `UserPromptSubmit` o agent ativo é sempre
  "orquestrador"; sem testes automatizados.
- **Sugestões de review não aplicadas** (opcionais, registradas nos retornos): mensagem de vazio
  enganosa se o reload falhar após excluir o último da página; `writeGuarded` casando `P2002` por
  substring; limite de tamanho em `phone`/`notes`; índice composto `(assignedTo, createdAt)`;
  busca sem acento (`unaccent`).
- **Conferir o locale do banco de produção** no deploy: em dev é `en_US.utf8` e o `ILIKE` casa
  `JOÃO` com `joão`; com locale `C` isso quebra.
- Decisões em aberto do `CLAUDE.md`: logging (Pino ou Winston), versão do Node, Next 16 × React 19,
  e as regras de negócio listadas lá.
- Decidir se vale `--restart unless-stopped` no container do Postgres.

## Armadilhas / o que não fazer

- **Não rodar `npm run build` com o `next dev` no ar.** Os dois usam a mesma pasta `.next`; o build
  sobrescreve o cache do servidor de desenvolvimento e **todas as páginas passam a responder 500**.
  Aconteceu nesta sessão. Correção: parar o Next, `rm -rf .next`, `npm run dev`. A regra está no
  agent `frontend-ui`.
- **`npm run db:generate` dá EPERM com o `npm run dev:api` no ar** (o Windows trava a DLL do
  Prisma). Parar a API antes de gerar o client ou migrar. Sem isso, os tipos são gerados mas o
  **client de runtime não conhece os models novos** — o typecheck passa e o banco real falha.
- **Testes com fake em memória provam o fake, não o Postgres** (collation, `ILIKE` com acento,
  transação, cascata). Por isso existe a pendência do teste de integração.
- **`shell: true` no `child_process` do Windows quebra caminhos com espaço e `#`** — este projeto
  tem os dois. Chamar `node` com o CLI da ferramenta, sem shell.
- **Não rodar `npx prettier`**: o projeto não usa formatador; ele baixa na hora e reformata com
  aspas duplas.
- **Não confundir as distros:** o container está na `Ubuntu` (22.04), não na `Ubuntu-24.04`.
- **Não apagar `/opt/databases/pg`** nem rodar `prisma migrate reset`: o volume tem bancos de outros
  projetos (`CursoREST`, `TurboMobile`).
- **Não rodar o Next sem `--turbopack`**: o `#` no caminho quebra o webpack.
- **Não commitar `.claude/knowledge/`** sem antes resolver o filtro de segredos do RAG (hoje está
  fora do `.gitignore`).
- A senha `masterkey` e a senha `Demo@12345` são de ambiente local.

## Como rodar e validar

```bash
wsl -d Ubuntu -e bash -lc 'docker start postgres'   # o container não sobe sozinho
npm install
npm run db:migrate       # prisma migrate dev lendo o .env.local
npm run db:generate      # com o dev:api PARADO
npm run db:seed-demo     # 3.000 alunos fictícios (idempotente, só mexe no que é demo)
npm run dev:api          # API em http://localhost:3001
npm run dev              # Next em http://localhost:3000
```

Verificação (com o `next dev` parado por causa do build):

```bash
npm run typecheck && npm test && npm run test:coverage && npm run test:integration && npm run e2e && npm run build
```

O `test:integration` (sessão 4) roda o model contra o Postgres real no `crm_alunos_test` e fica fora do
`npm test`. Ele aborta se o banco não terminar em `_test` e aplica as migrations pendentes com `migrate deploy`.
Os dados que cria são marcados e apagados no fim.

O `e2e` usa o `.env.test` e o banco `crm_alunos_test`, nas portas 3100/3101; o `globalSetup` apaga
os dados desse banco e se recusa a rodar se o nome não terminar em `_test`.

### Prévia com dados fictícios

Senha para todos: `Demo@12345`.

| Papel | E-mail |
|-------|--------|
| admin | `admin@demo.crm.test` |
| ceo | `ceo@demo.crm.test` |
| vendedor | `ana@demo.crm.test` (883 alunos), `bruno@demo.crm.test`, `camila@demo.crm.test` |
| desativado | `diego@demo.crm.test` |

Os usuários reais (`adriano@…` e `jose@jose.com.br`) não são tocados pelo seed. Um aluno demo foi
excluído no teste da cascata (hoje são 2.999); rodar `db:seed-demo` de novo restaura os 3.000.
Capturas da prévia em `ImersaoIA/sprints/assets/sprint-6/`.

## O ambiente PostgreSQL

| Item | Valor |
|------|-------|
| Onde | Container Docker `postgres` na distro WSL **`Ubuntu`** (Ubuntu 22.04.5 LTS) |
| Versão | PostgreSQL 17.0 |
| Porta | `5432`, acessível do Windows em `localhost:5432` |
| Usuário / senha | `postgres` / `masterkey` |
| Bancos do projeto | `crm_alunos` (dev, locale `en_US.utf8`) e `crm_alunos_test` (E2E) |
| Dados | bind mount `/opt/databases/pg` — compartilhado com outros projetos |
| Restart policy | `no` — **não sobe sozinho** |

Se `docker start postgres` falhar com `network <id> does not exist`:

```bash
docker network disconnect -f pg_network postgres
docker start postgres
docker network rm pg_network && docker network create pg_network
docker network connect pg_network postgres
```

## Branch e sincronização

- Branch local **`master`**, rastreando **`origin/main`** em https://github.com/adrianosantostreina/crm-alunos (privado). Para enviar: `git push`.
- O CI roda a cada push, com os jobs `verify` e `e2e`.
- Sessão 4 commitou tudo:
  - `00475c8` agents, hooks e RAG;
  - `96c0550` Sprint 6;
  - `533589d` documentação;
  - `b72ff76` cursos e compras;
  - mais os commits da importação e da documentação da Sprint 7.
  Só `.claude/knowledge/` continua fora do git, de propósito, até existir o filtro de segredos do RAG.
- Os `package.json` e `package-lock.json` com as dependências do RAG entraram no commit da Sprint 6,
  porque o arquivo misturava as duas mudanças.
- `dev:api` e `next dev` foram **parados** nesta sessão para a migration e o build. Subir de novo
  com `npm run dev:api` e `npm run dev`.
- ⚠️ A memória registra outra sessão que já trabalhou neste diretório. Antes de commitar, conferir o
  `git status`.
