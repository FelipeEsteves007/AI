# Constitution — Princípios e Decisões Fundamentais

## Missão do Projeto

Criar um CRM interno de código aberto e controlado que elimine o custo de assinatura recorrente, permitindo que Adriano Santos gerencie seus 3.000 alunos, cursos e vendas de forma eficiente e sem dependência de terceiros.

---

## Valores Fundamentais

### 1. 🎯 Simplicidade
- Não sobre-engenheirar. Cada feature deve ter um propósito claro.
- Código legível e manutenível por uma equipe pequena (10 pessoas).
- UI intuitiva, sem cliques desnecessários.

### 2. 💪 Controlabilidade
- Dados do cliente (alunos) são propriedade do Adriano.
- Nenhuma integração obrigatória com SaaS externo (Hotmart é manual).
- Deploy próprio no Vercel, sob controle total.

### 3. 🚀 Performance
- Dashboard carrega em < 2 segundos.
- Importação de 3.000 alunos em < 1 minuto.
- Zero lag na interface de usuário.

### 4. 🔒 Segurança
- RBAC (role-based access control) desde o dia 1.
- Vendedor nunca vê alunos de outro vendedor.
- Senhas criptografadas com bcrypt.
- Auditoria de ações críticas (login, delete, import).

### 5. 📱 Escalabilidade
- Arquitetura preparada para 10k+ alunos (já pensando no futuro).
- Índices de BD otimizados.
- Sem bottlenecks óbvios no código.

### 6. 🧪 Qualidade
- Testes automatizados (unitários + E2E).
- CI/CD via GitHub Actions.
- Code review simples (antes de merge).
- Zero bugs críticos antes de produção.

---

## Decisões Arquiteturais

### Stack Técnica

| Camada | Decisão | Justificativa |
|--------|---------|---------------|
| **Frontend** | React (Next.js 14+) | Componentes, SSR, Vercel native |
| **Backend** | Node.js + Express | JavaScript full-stack, Vercel support |
| **Database** | PostgreSQL | ACID, relacional, performático |
| **ORM** | Prisma | Type-safe, migrations, studio |
| **Autenticação** | JWT + bcrypt | Stateless, seguro, padrão |
| **Deploy** | Vercel | CI/CD automático, domain, env vars |
| **Styling** | Tailwind CSS | Utilitário, rápido, responsivo |
| **Testing** | Jest + Playwright | Coverage + E2E, padrão industry |

**Princípio**: Usar tools de mercado consolidadas, evitar reinventar a roda.

---

### Decisões de Design

#### Frontend-First
- UI é desenhada ANTES do código (wireframes em `specs/<feature>/ui/screens.md`)
- Mobile-first responsive design
- Sem JavaScript desnecessário (usar CSS sempre que possível)

#### API-First
- Backend expõe REST API clara e previsível
- Frontend consome dados apenas via API
- Fácil integração com mobile/desktop futura

#### Database-Centric
- Lógica de validação vive no banco (constraints)
- Backend valida uma segunda vez (não confiar no client)
- Índices estratégicos para performance

---

### Decisões de Produto

#### Escopo v1 (MVP)
- ✅ Cadastro de alunos
- ✅ Gestão de cursos e compras
- ✅ Pipeline de vendas
- ✅ Tarefas e follow-up
- ✅ Dashboard com KPIs
- ✅ Importação bulk de alunos
- ✅ Envio de e-mail individual
- ❌ Integração automática com Hotmart (v2)
- ❌ WhatsApp/SMS automático (v2)
- ❌ App mobile (v3)

**Princípio**: MVP deve funcionar e ser liberado em < 1 semana. Tudo depois é bônus.

#### RBAC (Role-Based Access Control)

```
┌──────────────────────────────────────────────────────────┐
│              ADMINISTRADOR (Admin)                        │
├──────────────────────────────────────────────────────────┤
│ • Ver todos os alunos, leads, tarefas                    │
│ • Criar/editar/deletar alunos                            │
│ • Gestão de usuários (criar, editar, deletar)           │
│ • Importação bulk                                        │
│ • Gestão de cursos                                       │
│ • Dashboard completo                                     │
│ • Configurações de sistema                              │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   CEO                                    │
├──────────────────────────────────────────────────────────┤
│ • Ver todos os alunos, leads, tarefas                    │
│ • Dashboard completo (visão executiva)                   │
│ • Relatórios                                             │
│ • Não consegue criar usuários, editar config, importar  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   VENDEDOR                               │
├──────────────────────────────────────────────────────────┤
│ • Ver apenas seus próprios alunos atribuídos            │
│ • Criar/editar leads (pipeline)                         │
│ • Criar tarefas (suas e compartilhadas)                 │
│ • Dashboard filtrado (apenas seus dados)                │
│ • Enviar e-mail para seus alunos                        │
│ • Não consegue deletar aluno, não vê outros vendedores  │
└──────────────────────────────────────────────────────────┘
```

**Princípio**: Segurança é enforçada no backend. UI oculta botões, mas backend valida SEMPRE.

---

## Princípios de Desenvolvimento

### 1. **KISS** (Keep It Simple, Stupid)
- Não use 3 libs quando 1 faz o mesmo.
- Não otimize prematuramente (profile depois).
- Nomes de variáveis claros. Código auto-documentado.

### 2. **DRY** (Don't Repeat Yourself)
- Componentes reutilizáveis.
- Serviços/hooks compartilhados.
- Uma fonte da verdade para cada conceito.

### 3. **SOLID** (em escala apropriada)
- **S**ingle Responsibility: um endpoint = uma ação
- **O**pen/Closed: classes abertas para extensão, fechadas para modificação
- **L**iskov: subclasses substituem pai sem quebrar
- **I**nterface Segregation: interfaces pequenas e focadas
- **D**ependency Injection: desacoplar via injeção

### 4. **Fail Fast**
- Validar input imediatamente.
- Retornar erro claro (não deixar falhar silenciosamente).
- Logging de tudo que quebra.

### 5. **Defensive Coding**
- Nunca confiar em dados do client.
- Backend valida TUDO.
- Rate limiting em endpoints críticos.
- SQL injection, XSS, CSRF protegido.

---

## Decisões de Nomenclatura

### Tabelas do Banco
- PascalCase: `Users`, `Students`, `Courses`, `PipelineLeads`
- Plural (tabelas contêm múltiplos registros)
- Verbo + Noun para actions: `PipelineLeads` (não `Pipeline`, não `LeadsPipeline`)

### APIs & Endpoints
- Kebab-case: `/api/students`, `/api/courses`, `/api/pipeline-leads`
- RESTful: `GET /students` (list), `POST /students` (create), `GET /students/{id}` (read), `PUT /students/{id}` (update), `DELETE /students/{id}` (delete)
- Sem verbo: `/students` (não `/getStudents`, `/fetchStudents`)

### Frontend Components
- PascalCase: `StudentCard`, `LoginForm`, `DashboardMetrics`
- Noun: `StudentList` (não `ListStudent`)
- Sufixo de tipo: `StudentModal`, `PipelineKanban`, `TaskTable`

### TypeScript Types
- PascalCase com I prefix (interface): `IStudent`, `IUser`, `IPipelineLead`
- Ou sem prefix (type): `Student`, `User`, `PipelineLead`
- Request/Response: `CreateStudentRequest`, `StudentResponse`

### Environment Variables
- UPPER_SNAKE_CASE: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`
- Prefix por contexto: `DB_*`, `JWT_*`, `SMTP_*`

---

## Princípios de Performance

### Frontend
- **Bundle size**: < 200 KB (gzip) para app shell
- **First Contentful Paint (FCP)**: < 1.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Lighthouse score**: > 80
- Code splitting: páginas lazy-loaded
- Image optimization: next/image, AVIF/WebP
- CSS: Tailwind purge (remove unused styles)

### Backend
- **API response time**: < 500ms (p95) para queries normais
- **Database query time**: < 100ms (p95)
- **Import bulk**: 1000 registros/segundo
- Índices em:
  - Foreign keys
  - Campos de busca (email, name)
  - Campos de filtro (status, created_at)
- Connection pooling: Prisma gerencia

### Database
- `VACUUM ANALYZE` semanal
- Backups automáticos (Vercel Postgres)
- Monitoring de slow queries

---

## Decisões de Segurança

### Senhas
- Hash: bcrypt (10 rounds)
- Nunca armazene plain text
- Mínimo 6 caracteres (será aumentado para 8+ em v2)

### Autenticação
- JWT: HS256 (HMAC + SHA-256)
- Expiração: 24 horas
- Refresh token: (futuro)
- Armazenamento: cookie HttpOnly definido pelo backend (nunca localStorage)

### Autorização
- RBAC no backend (middleware em cada rota)
- Usuário nunca acessa dados além de seu escopo
- Pode haver mais de um admin; o sistema impede desativar ou rebaixar o último admin ativo (feature 002)

### Auditoria
- Log de: login (sucesso/falha), delete, import, update crítico
- Quem, quando, o quê
- Salvar em tabela `audit_log`

### Rate Limiting
- Login: 5 tentativas/15 min
- API geral: 1000 req/hora/IP (futuro)
- Import: 1 req/min (não ativar DoS)

---

## Decisões de Testes

### Cobertura Mínima
- **Crítico (must-test)**: autenticação, CRUD, RBAC, validações
- **Importante (should-test)**: filtros, agregações, soft-delete
- **Nice-to-have**: ui interactions, edge cases

### Tipos de Teste
- **Unitários**: funções puras, validadores, helpers
- **E2E**: fluxos completos (login → dashboard → ação → verificar)
- **Integração**: BD + API (testes E2E cobrem isso)

### Estratégia
- Jest para unitários (backend + utils)
- Playwright para E2E (frontend + backend via API)
- Mínimo 70% coverage (não 100%, é overhead)

---

## Decisões de Deploy

### Ambiente
- **Dev**: local, `npm run dev`
- **Preview**: branch em GitHub → Vercel preview URL
- **Production**: main branch → Vercel production

### Variáveis de Ambiente
- `.env.local` (local, não commitado)
- Vercel secrets (prod)
- `vercel.json` ou `vercel.ts` para config

### Backup & Disaster Recovery
- PostgreSQL: backups automáticos do Vercel
- Código: GitHub repo
- Plano: Restore de backup em < 1 hora

---

## Princípios de Manutenção

### Documentação
- README.md: como rodar e deployar
- GETTING_STARTED.md: primeiros passos
- specs/<feature>/: spec, plan, tasks, data-model, contracts e ui de cada feature
- Comentários no código (JSDoc para funções públicas)

### Refatoring
- Refazer código "smell" quando encontrado
- Não deixar débito técnico acumular
- Code review deve questionar design

### Versionamento
- Semantic versioning: MAJOR.MINOR.PATCH
- v1.0.0 = MVP lançado
- v1.1.0 = features
- v2.0.0 = breaking changes (Hotmart, mobile, etc.)

---

## Decisões Futuras (v2+)

- [ ] Integração automática com Hotmart
- [ ] Cache com Redis
- [ ] WebSockets para notificações em tempo real
- [ ] Histórico de contatos (logs de e-mail, anotações por interação)
- [ ] Relatórios avançados (gráficos customizáveis)
- [ ] App mobile (React Native)
- [ ] Automação de e-mail (templates, agendamento)
- [ ] API pública para integrações
- [ ] Dois fatores (2FA)
- [ ] Audit log público (admin pode ver quem mexeu em quê)

---

## Restrições & Constraints

| Constraint | Motivo |
|-----------|--------|
| Sem terceiros obrigatórios (exceto Vercel/DB) | Máxima controlabilidade |
| Sem ORM alternativo (só Prisma) | Consistência |
| TypeScript strict | Type safety |
| Sem global state (usar React Context) | Previsibilidade |
| Sem node_modules duplicados (npm dedupe) | Bundle size |
| Sem console.log em produção (usar logger) | Profissionalismo |

---

## Definição de Sucesso (v1.0)

✅ **Técnico**:
- [ ] Zero erros 500 em produção (primeiros 30 dias)
- [ ] 99% uptime
- [ ] Dashboard < 2s
- [ ] 3000 alunos importados com sucesso
- [ ] Testes passam (> 70% coverage)

✅ **Produto**:
- [ ] Adriano consegue cancelar CRM antigo
- [ ] Equipe de 10 usa sem treinamento formal
- [ ] Sem perdas de dados
- [ ] Relatórios exportam corretamente

✅ **Experiência**:
- [ ] Interface intuitiva (sem leitura de manual)
- [ ] Mobile responsivo
- [ ] Feedback visual (toast, loading)
- [ ] Sem frustração (UX fluida)

---

## Governança

### Decisões
- **Arquitetura**: Adriano (product owner) + leads técnicos
- **Features**: roadmap aprovado por Adriano
- **Code**: Code review antes de merge

### Mudanças de Escopo
- Apenas Adriano pode autorizar novas features (fora do SPEC)
- Mudanças documentadas nesta constitution ou no spec.md da feature
- Impacto em timeline é comunicado antecipadamente

---

**Versão**: 1.0  
**Data**: 2026-09-11  
**Status**: Aprovado para execução
