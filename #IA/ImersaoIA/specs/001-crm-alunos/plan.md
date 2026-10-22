# Plano de Implementação — CRM de Alunos

## 📋 Resumo Executivo

Criar um CRM interno que substitua a plataforma paga atual em **6-9 dias** com custo zero recorrente. Sistema web responsivo para gerenciar 3.000 alunos, cursos, vendas e tarefas.

**Investimento**: Tempo (desenvolvimento) + Vercel (< $50/mês)  
**Retorno**: Elimina CRM pago (~$100-500/mês)  
**ROI**: Positivo no primeiro mês

---

## 🎯 Objetivos (v1.0)

### Críticos (Must-Have)
- ✅ Login funcional com RBAC (admin, CEO, vendedor)
- ✅ Importar 3.000 alunos via CSV (< 1 min)
- ✅ Dashboard com KPIs (total alunos, receita, atividade)
- ✅ CRUD completo de alunos
- ✅ Gestão de cursos e compras
- ✅ Pipeline de vendas (Kanban)
- ✅ Tarefas e follow-up
- ✅ Deploy em produção (Vercel)

### Importantes (Should-Have)
- ✅ Envio de e-mail individual
- ✅ Exportação de relatórios (CSV)
- ✅ Filtros avançados
- ✅ Testes automatizados (> 70% coverage)

### Nice-to-Have (Could-Have)
- ☐ E-mail em massa com templates
- ☐ Integração Hotmart (automática)
- ☐ WhatsApp/SMS
- ☐ App mobile

---

## 📊 Escopo vs Fora do Escopo

### In Scope (v1.0)

| Feature | Por quê | Prioridade |
|---------|---------|-----------|
| Cadastro de alunos (CRUD) | Base essencial | 🔴 |
| Importação bulk (CSV) | Migração inicial | 🔴 |
| Gestão de cursos | Modelo de negócio | 🔴 |
| Registro de compras | Rastreabilidade | 🔴 |
| Pipeline de vendas | Gestão de leads | 🔴 |
| Dashboard com KPIs | Visão executiva | 🔴 |
| Tarefas/follow-up | Gestão de ações | 🟡 |
| Envio de e-mail | Comunicação | 🟡 |
| Filtros e busca | UX | 🟡 |
| Relatórios/export | Análise | 🟢 |

### Out of Scope (v2+)

| Feature | Motivo | Target |
|---------|--------|--------|
| Integração Hotmart | Não é prioritário, importação manual é aceitável | v2 |
| WhatsApp/SMS automático | Complexidade, não é essencial | v2 |
| Automação de e-mail | Nice-to-have, manual é OK | v2 |
| App mobile | UI web responsiva é suficiente | v3 |
| Histórico de contatos detalhado | Overhead inicial, agrupa em notas | v2 |
| 2FA | Segurança extra, pode esperar | v2 |
| API pública | Integrações são futuro | v2 |

---

## 🏗️ Arquitetura (High-Level)

```
┌─────────────────────────────────────────────────────────┐
│                   VERCEL (Frontend + Backend)           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐        ┌──────────────────────┐  │
│  │   React (SPA)    │◄────────┤  Node.js API        │  │
│  │  Next.js + SSR   │         │ (Express)           │  │
│  │ Tailwind CSS     │         │ Prisma ORM          │  │
│  │                  │         │                      │  │
│  │ Pages:           │         │ Routes:              │  │
│  │ • /login         │         │ • POST /auth/login   │  │
│  │ • /dashboard     │         │ • GET /students      │  │
│  │ • /students      │         │ • POST /students     │  │
│  │ • /courses       │         │ • GET /pipeline      │  │
│  │ • /pipeline      │         │ • POST /tasks        │  │
│  │ • /tasks         │         │ • GET /dashboard/... │  │
│  │ • /settings      │         │                      │  │
│  └──────────────────┘         └──────────────────────┘  │
│          │                              │               │
│          └──────────────────┬───────────┘               │
│                             │                           │
│                    ┌────────▼────────┐                  │
│                    │  PostgreSQL     │                  │
│                    │ (Vercel Postgres)                 │
│                    │                  │                  │
│                    │ Tables:          │                  │
│                    │ • users          │                  │
│                    │ • students       │                  │
│                    │ • courses        │                  │
│                    │ • purchases      │                  │
│                    │ • pipeline_leads │                  │
│                    │ • tasks          │                  │
│                    └──────────────────┘                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📅 Timeline & Sprints

### Sprint 1: Infraestrutura & MVP (2-3 dias)
**Objetivo**: Fundação estável + login + dashboard + alunos  
**Story Points**: 40 SP

```
Dia 1 (Morning):    Setup projeto + BD + Auth
Dia 1 (Afternoon):  Login frontend + CRUD backend
Dia 2 (Morning):    Listagem alunos + Layout
Dia 2 (Afternoon):  Dashboard + integração
Dia 3 (Morning):    Testes manuais + bug fixes
Dia 3 (Afternoon):  Sprint 2 ready

Testável: Login → Dashboard → Alunos (sem erros)
```

### Sprint 2: Funcionalidades (3-4 dias)
**Objetivo**: Importação + Cursos + Pipeline + Tarefas + E-mail  
**Story Points**: 50 SP

```
Dia 1: Importação bulk + Cursos
Dia 2: Compras + Pipeline Kanban
Dia 3: Tarefas + E-mail
Dia 4: Integração + testes + polimento

Testável: Importar 3000 alunos + Drag&drop pipeline + RBAC ativo
```

### Sprint 3: Testes & Deploy (1-2 dias)
**Objetivo**: Qualidade + Produção  
**Story Points**: 22 SP

```
Dia 1 (Morning):    Testes unitários + E2E
Dia 1 (Afternoon):  GitHub Actions + Deploy Vercel
Dia 2 (Morning):    Validação em produção
Dia 2 (Afternoon):  Documentação + Handoff

Testável: Testes passam + Deploy em prod + Zero erros 500
```

**Total: 6-9 dias do conceito ao lançamento**

---

## 👥 Equipe & Responsabilidades

| Papel | Responsável | Tarefas |
|-------|-------------|---------|
| **Product Owner** | Adriano | Aprovação de features, roadmap, decisões de escopo |
| **Tech Lead** | Claude (AI) | Arquitetura, code review, debugging |
| **Frontend Dev** | Claude | React, Next.js, UI/UX |
| **Backend Dev** | Claude | Node.js, API, BD, autenticação |
| **QA/Tester** | Adriano + team | Testes manuais, feedback UX |
| **DevOps** | Claude | GitHub, Vercel, CI/CD, secrets |

---

## 💻 Tech Stack (Decidido)

### Frontend
- **Framework**: Next.js 14+ (React 18)
- **Styling**: Tailwind CSS
- **Testing**: Jest + React Testing Library + Playwright
- **Build**: Vercel (automatic)

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **ORM**: Prisma (type-safe)
- **Auth**: JWT + bcrypt
- **Validation**: Zod ou Joi
- **Email**: nodemailer (SMTP)
- **Logging**: Pino ou Winston

### Database
- **SQL**: PostgreSQL 14+
- **Host**: Vercel Postgres
- **Migrations**: Prisma migrations
- **Backup**: Automático (Vercel)

### DevOps & Deploy
- **VCS**: GitHub
- **CI/CD**: GitHub Actions
- **Hosting**: Vercel
- **Domain**: (TBD)
- **Monitoring**: Vercel Analytics (built-in)

### Testing
- **Unit**: Jest
- **Integration**: Jest + test database
- **E2E**: Playwright
- **Coverage**: Mínimo 70%

---

## 🚀 Estratégia de Deploy

### Pre-Launch (Dev)
```
1. Desenvolvimento local (npm run dev)
2. PostgreSQL local (docker ou cloud)
3. Branch feature → GitHub
4. Vercel preview URL (automático)
5. Code review
6. Merge para main
```

### Launch (Prod)
```
1. Production environment vars no Vercel
2. Database produção (Vercel Postgres)
3. Primeiro deploy automático
4. Smoke tests (login, dashboard, import)
5. Monitoramento (logs, erros)
6. Rollback plan (se necessário)
```

### Post-Launch (Maintenance)
```
Semanal:
- Backup validação
- Monitoring logs
- Relatório de bugs

Mensal:
- Security patches
- Performance review
- User feedback

Trimestral:
- Roadmap v2
- Tech debt assessment
```

---

## 🔒 Segurança

### Antes do Lançamento

| Item | Status | Deadline |
|------|--------|----------|
| Senhas criptografadas (bcrypt) | ✅ | Sprint 1 |
| JWT com expiração | ✅ | Sprint 1 |
| RBAC enforçado no backend | ✅ | Sprint 1 |
| SQL injection proteção (Prisma) | ✅ | Sprint 2 |
| Rate limiting (login) | ✅ | Sprint 3 |
| HTTPS/TLS (Vercel) | ✅ | Sprint 3 |
| Secrets em variáveis (não hardcoded) | ✅ | Sprint 1 |
| Auditoria de ações críticas | ✅ | Sprint 3 |

### Não Required (v2)
- 2FA
- Single Sign-On (SSO)
- Encryption at rest

---

## 📈 Métricas de Sucesso

### Técnicas (Launch Day)
- ✅ Zero erros 500
- ✅ Uptime > 99% (24h baseline)
- ✅ Dashboard < 2s
- ✅ Import 3000 alunos < 1min
- ✅ Testes > 70% coverage
- ✅ Lighthouse score > 80

### Produto (Semana 1)
- ✅ Adriano consegue cancelar CRM antigo
- ✅ 10 pessoas usam sem suporte
- ✅ Nenhuma perda de dados
- ✅ Relatórios funcionam

### Experiência (Mês 1)
- ✅ NPS (Net Promoter Score) > 0
- ✅ Sem reclamações críticas
- ✅ Uptime > 99.5%
- ✅ < 5 bugs críticos descobertos

---

## 📋 Pré-Requisitos

### Infraestrutura
- [ ] Conta Vercel criada
- [ ] GitHub repo preparado
- [ ] Vercel Postgres ativo
- [ ] Domain configurado (opcional)

### Conhecimento
- [ ] Equipe familiar com Next.js/React
- [ ] Conhecimento de PostgreSQL
- [ ] Git workflows
- [ ] Vercel deploy process

### Acesso
- [ ] Adriano com acesso ao Vercel
- [ ] GitHub team setup
- [ ] Email SMTP configurado (Sendgrid, Brevo, etc.)

---

## 🎬 Kickoff Meeting

**Agendado**: TBD  
**Duração**: 30 min  
**Participantes**: Adriano, Tech Lead

### Agenda
1. Revisão de escopo (5 min)
2. Timeline confirmação (5 min)
3. Dependências & blockers (5 min)
4. Communication plan (5 min)
5. Próximos passos (5 min)

### Definition of Done (Kickoff)
- ✅ Escopo aprovado
- ✅ Timeline aceita
- ✅ Infraestrutura pronta
- ✅ Time alinhado

---

## 🚨 Riscos & Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|--------|-----------|
| Importação lenta (3000 alunos) | Alto | Alto | Otimizar query, batch insert, testar cedo |
| BD downtime | Baixo | Alto | Backups automáticos, rollback plan |
| Bugs descobertos em prod | Médio | Médio | Testes E2E, staging env, hotfix ready |
| Scope creep | Médio | Médio | Escopo fixo, recusar novos asks na v1 |
| Integração ruim (frontend/backend) | Médio | Médio | E2E tests, daily integration |
| Performance issues | Médio | Médio | Benchmark cedo, Lighthouse CI |

---

## 🔄 Comunicação & Status

### Daily Standup (Sprint)
**Quando**: 9am (async ou sync)  
**O quê**: O que fiz, o que vou fazer, blockers  
**Formato**: Slack thread ou email

### Weekly Review
**Quando**: Sexta 4pm  
**O quê**: Demo, retrospectiva, roadmap  
**Duração**: 30 min

### Escalation
**Blocker**: Slack DM imediato  
**Question**: GitHub issue ou Slack thread  
**Bug em prod**: Page Adriano + fix ASAP

---

## 📚 Entregáveis

### Código
- [ ] Repositório GitHub públic/privado
- [ ] Deploy automático Vercel
- [ ] README.md (como rodar)
- [ ] GETTING_STARTED.md (primeira vez)
- [ ] .env.example (variáveis)

### Documentação
- [ ] memory/constitution.md (princípios)
- [ ] spec.md (o quê será feito + casos de uso)
- [ ] plan.md (plano + arquitetura)
- [ ] data-model.md (modelo de dados)
- [ ] contracts/api.md (endpoints)
- [ ] ui/design.md (design system) e ui/screens.md (wireframes)
- [ ] tasks.md (backlog + sprints)

### Testes
- [ ] Testes unitários (Jest, > 70%)
- [ ] Testes E2E (Playwright)
- [ ] CI/CD passing (GitHub Actions)

### Produção
- [ ] Deploy em Vercel
- [ ] Domain configurado
- [ ] Email SMTP funcionando
- [ ] Monitoring ativo
- [ ] Handoff documentation

---

## 🎓 Aprendizados & Future

### Post-Launch Retrospective (Semana 2)
- O que deu certo?
- O que pode melhorar?
- Próximas features (v2 roadmap)?

### v2 Roadmap (1-2 meses depois)
- [ ] Integração Hotmart (automática)
- [ ] E-mail em massa com templates
- [ ] Cache com Redis
- [ ] WebSockets para notificações
- [ ] Histórico de contatos
- [ ] Relatórios avançados

### v3+ (3-6 meses depois)
- [ ] App mobile (React Native)
- [ ] API pública para integrações
- [ ] Marketplace de plugins
- [ ] Multi-tenant (para revenda)

---

## ✅ Definição de Pronto

### Sprint Done
- [ ] Todas as tarefas da sprint concluídas
- [ ] Testes passando (locais)
- [ ] Code review completo
- [ ] Merged para main
- [ ] Vercel preview funciona

### Release Ready
- [ ] Testes E2E passando
- [ ] Documentação atualizada
- [ ] Changelog preparado
- [ ] Secrets configurados
- [ ] Monitoring está ligado
- [ ] Rollback plan aprovado

### Launch Done
- [ ] App em produção
- [ ] Usuários acessando
- [ ] Zero erros 500
- [ ] Backup validado
- [ ] Equipe treinada
- [ ] Adriano satisfeito

---

## 📞 Contatos & Escalation

| Papel | Contato | Escalação |
|-------|---------|-----------|
| **Product Owner** | Adriano | Decisões de escopo |
| **Tech Lead** | Claude (AI) | Arquitetura, bugs críticos |
| **Support** | TBD | Issues de produção |

---

## 📝 Assinatura

- [ ] Adriano Santos (Product Owner)
- [ ] Claude (Tech Lead)

**Data**: 2026-09-11  
**Status**: ✅ Aprovado

---

## Arquitetura

### Visão Geral

Sistema web SPA (Single Page Application) com arquitetura de três camadas:
- **Frontend**: React (Vercel)
- **Backend**: Node.js API (Vercel Functions)
- **Database**: PostgreSQL

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│              Vercel (SPA + Static Assets)                   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  BACKEND (Node.js)                          │
│        Vercel Functions (REST API + Auth)                   │
└────────────────────────┬────────────────────────────────────┘
                         │ TCP/SQL
                         │
┌────────────────────────▼────────────────────────────────────┐
│              DATABASE (PostgreSQL)                          │
│         Vercel Postgres or External Provider               │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Principais

#### Frontend (React)

**Estrutura de Pastas:**
```
src/
├── components/
│   ├── Dashboard/
│   ├── Students/
│   ├── Courses/
│   ├── Pipeline/
│   ├── Tasks/
│   ├── Layout/
│   └── Common/
├── pages/
│   ├── Dashboard.tsx
│   ├── Students.tsx
│   ├── Courses.tsx
│   ├── Pipeline.tsx
│   ├── Tasks.tsx
│   └── Settings.tsx
├── services/
│   ├── api.ts (chamadas HTTP)
│   ├── auth.ts
│   └── storage.ts
├── hooks/
├── context/
├── utils/
└── types/
```

**Principais Páginas:**
1. **Dashboard**: KPIs, gráficos, resumos
2. **Alunos**: CRUD de alunos, listagem, filtros, busca
3. **Cursos**: Gestão de cursos, atribuição a alunos
4. **Pipeline**: Kanban/lista de leads, estágios
5. **Tarefas**: To-do list, follow-ups, lembretes
6. **Configurações**: Usuários, permissões (admin only)

#### Backend (Node.js)

**Estrutura de Pastas:**
```
api/
├── routes/
│   ├── auth.ts
│   ├── students.ts
│   ├── courses.ts
│   ├── purchases.ts
│   ├── pipeline.ts
│   ├── tasks.ts
│   ├── dashboard.ts
│   └── users.ts
├── controllers/
├── services/
├── middleware/
│   ├── auth.ts (verificar token JWT)
│   ├── rbac.ts (autorização por papel)
│   └── errorHandler.ts
├── models/
├── database/
│   ├── migrations/
│   └── seeds/
├── utils/
└── types/
```

**Stack Backend:**
- **Framework**: Express
- **Autenticação**: JWT em cookie HttpOnly definido pelo backend
- **Autorização**: Middleware RBAC (role-based access control)
- **ORM**: Prisma (para queries ao PostgreSQL)
- **Validação**: Zod ou Joi
- **Logs**: Pino ou Winston

#### Database (PostgreSQL)

**Tabelas Principais:**
```
users
├── id (UUID PK)
├── email (UNIQUE)
├── password_hash
├── name
├── role (admin, ceo, vendedor)
├── created_at
└── updated_at

students
├── id (UUID PK)
├── name
├── email
├── phone
├── cpf (UNIQUE)
├── status (ativo, inativo, pausado)
├── assigned_to (FK users.id)
├── created_at
└── updated_at

courses
├── id (UUID PK)
├── name
├── description
├── price
├── created_at
└── updated_at

purchases
├── id (UUID PK)
├── student_id (FK students.id)
├── course_id (FK courses.id)
├── purchase_date
├── amount
└── created_at

pipeline_leads
├── id (UUID PK)
├── student_id (FK students.id)
├── status (prospecting, negotiation, sold, lost)
├── assigned_to (FK users.id)
├── value
├── created_at
└── updated_at

tasks
├── id (UUID PK)
├── title
├── description
├── assigned_to (FK users.id)
├── related_to (UUID: student_id ou lead_id)
├── due_date
├── completed_at
├── created_at
└── updated_at
```

### Fluxos Principais

#### Fluxo 1: Login e Autenticação
```
1. Usuário acessa /login
2. Frontend envia email + senha via POST /api/auth/login
3. Backend valida, gera JWT
4. Backend devolve o JWT em cookie HttpOnly (o frontend não manipula o token)
5. O navegador envia o cookie automaticamente nas requisições seguintes
6. Backend valida token em cada request via middleware
```

#### Fluxo 2: Importação de Alunos
```
1. Admin faz upload de CSV em /settings/import
2. Frontend valida formato (nome, email, telefone, CPF)
3. Envia POST /api/students/bulk-import com array de alunos
4. Backend valida dados, insere em batch no PostgreSQL
5. Retorna relatório (sucesso/falhas)
6. Dashboard atualiza contagem de alunos
```

#### Fluxo 3: Criar Tarefa de Follow-up
```
1. Admin/Vendedor acessa Student detail → clica "Nova Tarefa"
2. Preenche: título, descrição, data/hora, assina a si mesmo ou vendedor
3. Frontend envia POST /api/tasks com { assigned_to, related_to: student_id, due_date, ... }
4. Backend insere em tasks table
5. Task aparece em /tasks com filtro de atribuído_a_mim
6. Notificação local (icon badge) quando tarefa vence
```

#### Fluxo 4: Visualizar Dashboard
```
1. Usuário acessa /dashboard
2. Frontend faz GET /api/dashboard/metrics
3. Backend executa queries agregadas:
   - SELECT COUNT(*) FROM students
   - SELECT course_id, COUNT(*) FROM purchases GROUP BY course_id
   - SELECT COUNT(*) FROM students WHERE created_at > (now() - interval '1 month')
   - SELECT SUM(amount) FROM purchases
   - SELECT COUNT(*) FROM students WHERE last_login > (now() - interval '1 month')
4. Retorna JSON com métricas
5. Frontend renderiza gráficos (Chart.js, Recharts, ou similar)
```

### Segurança

1. **Autenticação**: JWT com expiração (ex.: 24h)
2. **Autorização**: Middleware RBAC verifica role do usuário
3. **Validação de Input**: Zod no backend antes de processar
4. **HTTPS**: Obrigatório (Vercel fornece por padrão)
5. **CORS**: Apenas origem do Vercel
6. **SQL Injection**: Prevenido via ORM Prisma
7. **Rate Limiting**: Implementar em funções críticas (login, import)

### Performance

- **Frontend**: Code splitting, lazy loading de componentes, cache de assets
- **Backend**: Índices de DB em foreign keys e campos de busca frequente, paginação de listagens
- **Database**: Connection pooling via Prisma
- **Caching**: Redis para cache de métricas do dashboard (opcional, versão 2)

### Decisões de Arquitetura

| Decisão | Motivo |
|---------|--------|
| REST API | Simples, bem documentada, ideal para MVPs |
| PostgreSQL | Relacional, confiável, suportado por Vercel |
| JWT | Stateless, escalável, sem sessão no servidor |
| Prisma ORM | Type-safe, migrations automáticas, ótima DX |
| React SPA | Reatividade, componentes reutilizáveis, ecossistema maduro |
| Vercel | Hosting unificado, deploy contínuo, suporta Node.js e PostgreSQL |

### Roadmap Futuro

- **v2**: Cache com Redis, WebSockets para notificações em tempo real
- **v3**: Histórico de contatos (logs de e-mail, anotações por interação)
- **v4**: Integração com Hotmart API, automação de e-mail
- **v5**: Mobile app (React Native ou Flutter)

---

**Versão**: 1.1  
**Data**: 2026-09-11
