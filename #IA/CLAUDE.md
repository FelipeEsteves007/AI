# CRM Interno para Gestão de Alunos
> CRM interno para a equipe gerenciar os ~3.000 alunos dos cursos, suas compras, o pipeline de vendas e as tarefas de follow-up, eliminando o custo de assinatura do CRM pago atual.

## Stack
| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 15 (Pages Router, Turbopack) + React 18 + TypeScript strict + Tailwind CSS 3 |
| Backend | Node.js 22+ (CI em 24) + Express 5, Vercel Functions |
| ORM / Migrations | Prisma 6 |
| Validação | Zod |
| Banco de dados | PostgreSQL (dev: Docker no WSL; produção: Neon pelo Marketplace da Vercel) |
| Autenticação | JWT próprio (HS256, expira em 24h) em cookie HttpOnly + bcrypt (10 rounds) |
| E-mail | nodemailer (SMTP) |
| Logging | Pino |
| Hosting / CI | Vercel + GitHub Actions |

## Estrutura de pastas
```
.
├── CLAUDE.md                       # este context file
├── package.json                    # scripts: dev, dev:api, build, test, e2e, db:*
├── src/                            # frontend Next.js (Pages Router)
│   ├── components/                 # por módulo: Auth, Users, Dashboard, Students, Courses, Pipeline, Tasks, Layout, Common
│   ├── pages/                      # rotas do Next (_app.tsx aplica o Layout e o CSS global)
│   ├── services/                   # chamadas HTTP à API
│   ├── hooks/                      # hooks compartilhados
│   ├── context/                    # estado global via React Context
│   ├── utils/                      # helpers
│   ├── types/                      # tipos TypeScript
│   └── styles/                     # globals.css (diretivas do Tailwind)
├── server/                         # backend REST em Express (não se chama api/: na Vercel, cada arquivo de api/ vira função pública)
│   ├── app.ts                      # createApp(): monta o app (hoje só /health)
│   ├── server.ts                   # sobe o servidor na API_PORT (padrão 3001)
│   ├── routes/                     # rotas, um arquivo por recurso
│   ├── controllers/                # handlers das rotas
│   ├── services/                   # regras de negócio
│   ├── middleware/                 # auth (JWT), rbac, errorHandler
│   ├── models/                     # acesso a dados sobre o Prisma Client
│   ├── database/                   # migrations/ auxiliares e seeds/
│   ├── utils/                      # helpers
│   └── types/                      # tipos TypeScript
├── prisma/                         # schema.prisma (ainda sem models) e migrations do Prisma
├── tests/                          # testes, espelhando src/ e server/
│   ├── server/                     # Jest (node) — testes de server/
│   ├── src/                        # Jest (jsdom + Testing Library) — testes de src/
│   ├── e2e/                        # Playwright
│   └── setup/                      # jest-dom e mock de CSS
└── ImersaoIA/                      # VAULT DO OBSIDIAN — toda a documentação (padrão GitHub Spec Kit)
    ├── Home.md                     # nota inicial do vault
    ├── README.md                   # índice da documentação
    ├── handoff.md                  # onde paramos, pendências e próximo passo
    ├── memory/constitution.md      # regras que valem para o projeto inteiro
    ├── specs/001-crm-alunos/       # spec, plan, data-model, contracts/, tasks, ui/
    ├── specs/002-login-perfis/     # login e perfis de acesso (entregue)
    └── sprints/                    # roadmap e uma nota por sprint
```

### Documentação vive no Obsidian
Toda documentação, spec, plano, lista de tarefas e relatório do projeto fica **no vault do
Obsidian em `ImersaoIA/`** — nunca em `docs/`, nunca solta na raiz. Ao criar uma nota nova,
usar links em **wikilink** (`[[nota]]`) em vez de caminho relativo e encaixá-la na estrutura
do Spec Kit (`specs/NNN-slug/`). O vault é versionado junto com o código; só o estado de
janela do Obsidian (`.obsidian/workspace*`) fica de fora.

## Como rodar localmente
Frontend e backend ficam no mesmo repositório; as variáveis ficam em `.env.local` (nunca commitado).

**Backend**
```
npm install
cp .env.example .env.local   # preencher DATABASE_URL e JWT_SECRET
npm run db:migrate           # prisma migrate dev lendo o .env.local
npm run db:studio            # conferir os dados
npm run db:seed-admin        # cria o primeiro admin e mostra a senha provisória uma vez
npm run dev:api              # API Express em http://localhost:3001 (GET /health)
```

**Frontend**
```
npm run dev                  # Next.js em http://localhost:3000
```

**Verificação**
```
npm run typecheck && npm test && npm run test:coverage && npm run e2e && npm run build
```

O `e2e` carrega o `.env.test` (fora do git) e roda contra o banco `crm_alunos_test`, em portas
próprias (Next 3100, API 3101). O `globalSetup` **apaga os dados** desse banco e se recusa a rodar
se o nome não terminar em `_test`.

## Padrões de código
- Nomenclatura de arquivos: componentes React em PascalCase (`StudentCard.tsx`); todos os demais em camelCase (`authService.ts`, `requireAuth.ts`)
- Nomenclatura de variáveis e funções: camelCase, com nomes claros e autoexplicativos; variáveis de ambiente em UPPER_SNAKE_CASE com prefixo por contexto (`DB_*`, `JWT_*`, `SMTP_*`)
- Estrutura de endpoints: REST em kebab-case, prefixo `/api`, substantivo no plural e sem verbo (`GET/POST /api/students`, `GET/PUT/DELETE /api/students/{id}`); um endpoint = uma ação
- Estrutura de componentes: PascalCase, substantivo primeiro e sufixo de tipo (`StudentList`, `StudentModal`, `PipelineKanban`, `TaskTable`); estado global só via React Context
- Tipagem: TypeScript strict; tipos em PascalCase, request/response como `CreateStudentRequest` / `StudentResponse`; imports com os aliases `@/` (src) e `@server/` (server)

## TDD
- Framework backend: Jest (+ @swc/jest)
- Framework frontend: Jest + React Testing Library (unitários) e Playwright (E2E)
- Onde ficam os testes: `tests/`, espelhando o código — `tests/server/**` testa `server/**`, `tests/src/**` testa `src/**`; E2E em `tests/e2e/`
- Regra: cobertura mínima de 70% (`npm run test:coverage` falha abaixo disso); E2E com `npm run e2e`
- Testes críticos deste projeto:
  - [x] RBAC aplicado no backend: vendedor não vê alunos de outro vendedor e não consegue excluir aluno (só o admin) — Sprint 6, unidade, rota e E2E
  - [x] Importação CSV de 3.000 alunos: valida CPF e e-mail, pula as linhas inválidas sem abortar e devolve relatório de sucessos, falhas e duplicatas — Sprint 7
  - [x] Cadastro de aluno rejeita e-mail duplicado, e-mail inválido e CPF inválido ou duplicado — Sprint 6 (API; não há tela de cadastro)
  - [x] Compra: aluno não compra o mesmo curso duas vezes e a data da compra não pode ser futura — Sprint 7
  - [x] Login funciona para os três papéis (admin, CEO, vendedor) — feature 002, coberto por unidade e E2E
  - [x] Dashboard retorna total de alunos, alunos por curso, alunos novos, receita e taxa de atividade — Sprint 8

## Nunca fazer
- Nunca integrar automaticamente com a Hotmart: a importação de alunos é manual (CSV)
- Nunca implementar envio automático de WhatsApp ou SMS nem automação de e-mail em massa
- Nunca aplicar controle de acesso só na interface: o RBAC é validado no backend, em toda rota
- Nunca armazenar senha em texto puro, guardar o JWT em localStorage nem commitar `.env.local` ou segredos
- Nunca usar outro ORM além do Prisma nem deixar `console.log` em produção (usar o logger)
- Nunca criar a pasta `api/` na raiz: na Vercel cada arquivo dela vira função pública (o backend fica em `server/` e entra por `src/pages/api/[...path].ts`)
- Nunca passar segredo para `vercel env add` por pipe no PowerShell 5.1: ele insere BOM no valor (usar Git Bash com `printf`)
- Nunca rodar o Next com webpack (sem `--turbopack`) enquanto a pasta do projeto tiver `#` no caminho: o webpack quebra o caminho e o app responde 500

## Decisões em aberto
- [x] ~~Perfis de acesso~~ — resolvido na feature 002: admin faz tudo; CEO vê tudo, sem gerenciar usuários, importar ou configurar; vendedor só os próprios alunos e leads (matriz em `ImersaoIA/specs/002-login-perfis/spec.md`)
- [x] ~~Biblioteca de validação~~ — Zod (decisão D2 da feature 002)
- [x] ~~Biblioteca de logging~~ — Pino (`server/utils/logger.ts`, decisão S9-2)
- [x] ~~Caixa dos arquivos que não são componentes~~ — camelCase (decisão D3 da feature 002)
- [x] ~~Versão do Node~~ — Node 24 no CI (`.nvmrc`), `engines` >= 22 (S9-4)
- [ ] Next 15 + React 18 traz um postcss vulnerável aninhado; a correção exige Next 16, que pede React 19
- [x] ~~Formatos de exportação~~ — só CSV (pronto para Excel), só admin e CEO (S9-3)
- [ ] Histórico de contatos: vai para a v2 ou é descartado
- [x] ~~Notificações de tarefas vencidas~~ — só visual nesta versão (S8-2)
- [x] ~~Lead "vendido" gera compra?~~ — não; a compra é registrada manualmente (S8-1)
- [x] ~~Excluir curso que tem compras~~ — bloquear (409 `COURSE_HAS_PURCHASES`), decisão S7-1 da Sprint 7
- [x] ~~Envio para vários alunos (UC-9)~~ — permitido só por seleção manual (máx. 100); automação continua proibida (S9-1)
- [x] ~~Banco de produção~~ — Neon pelo Marketplace da Vercel (`crm-alunos-db`), produção em https://crm-alunos-sable.vercel.app
- [ ] Proteção da branch `main`: exige GitHub Pro em repositório privado (ou tornar público)
- [ ] Provedor SMTP de produção (sem `SMTP_*` o e-mail é simulado)
