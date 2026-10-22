# Tarefas — CRM de Alunos

## Legenda

- **Prioridade**: 🔴 ALTA | 🟡 MÉDIA | 🟢 BAIXA
- **Estimativa**: em story points (1-13, Fibonacci)
- **Status**: ⏳ Backlog | 🚀 Sprint | ✅ Concluído

---

## Módulo: Infraestrutura & Setup

### TASK-001: Setup do Projeto Next.js + Node.js

**Descrição**: Inicializar projeto Next.js com TypeScript, Tailwind CSS e estrutura de pastas  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 3 SP  
**Dependências**: Nenhuma  
**Módulo**: Infraestrutura

**Subtarefas**:
- [ ] Criar projeto Next.js 14+ com `create-next-app`
- [ ] Instalar Tailwind CSS e configurar
- [ ] Configurar TypeScript stricto
- [ ] Criar estrutura de pastas (src/, components/, pages/, services/, etc.)
- [ ] Configurar .env.local (DATABASE_URL, JWT_SECRET, etc.)
- [ ] Configurar paths absolutos (tsconfig.json)

**Testável**:
- [ ] Projeto roda em `npm run dev` sem erros
- [ ] Estrutura de pastas está criada e funcional
- [ ] Tailwind CSS compila corretamente

---

### TASK-002: Setup do Banco de Dados (PostgreSQL + Prisma)

**Descrição**: Configurar PostgreSQL (local ou Vercel Postgres) e Prisma ORM  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 5 SP  
**Dependências**: TASK-001  
**Módulo**: Infraestrutura

**Subtarefas**:
- [ ] Instalar Prisma CLI e cliente
- [ ] Criar arquivo schema.prisma com todas as tabelas
- [ ] Configurar variável DATABASE_URL
- [ ] Executar primeira migration
- [ ] Criar seed data (usuários, cursos de exemplo)
- [ ] Validar conexão

**Testável**:
- [ ] `npx prisma db push` executa sem erros
- [ ] Tabelas criadas corretamente no PostgreSQL
- [ ] Seed data é inserido
- [ ] `npx prisma studio` exibe dados corretamente

---

### TASK-003: Configurar Autenticação (JWT + Middleware)

**Descrição**: Implementar JWT, login e middleware de autenticação  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 5 SP  
**Dependências**: TASK-001, TASK-002  
**Módulo**: Infraestrutura

**Subtarefas**:
- [ ] Instalar `jsonwebtoken` e `bcryptjs`
- [ ] Criar função de hash de senha
- [ ] Criar endpoint POST /api/auth/login
- [ ] Criar endpoint POST /api/auth/logout
- [ ] Implementar middleware de verificação de JWT
- [ ] Enviar o JWT em cookie HttpOnly (nunca localStorage)
- [ ] Criar tipo UsuarioAutenticado para requests

**Testável**:
- [ ] POST /api/auth/login retorna token válido
- [ ] Token inválido é rejeitado em requisições protegidas
- [ ] Logout limpa token
- [ ] Middleware redireciona para login se não autenticado

---

### TASK-004: Setup de Variáveis de Ambiente & Secrets

**Descrição**: Configurar .env, vercel.json e secrets para produção  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 2 SP  
**Dependências**: TASK-001  
**Módulo**: Infraestrutura

**Subtarefas**:
- [ ] Criar .env.local com variáveis de desenvolvimento
- [ ] Criar .env.example (sem valores)
- [ ] Configurar vercel.json (ou vercel.ts)
- [ ] Adicionar secrets no Vercel (DATABASE_URL, JWT_SECRET, etc.)
- [ ] Testar variáveis em dev e prod

**Testável**:
- [ ] .env.local não é commitado (git ignore)
- [ ] Variáveis carregam corretamente em dev
- [ ] Deploy do Vercel acessa secrets corretamente

---

## Módulo: Autenticação & Usuários

### TASK-005: Tela de Login (Frontend)

**Descrição**: Implementar página de login com validação  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 3 SP  
**Dependências**: TASK-001, TASK-003  
**Módulo**: Autenticação

**Subtarefas**:
- [ ] Criar componente LoginForm com fields email e password
- [ ] Validar input (email format, password min 6 chars)
- [ ] Fazer POST request para /api/auth/login
- [ ] Não armazenar o token no frontend: o backend define o cookie HttpOnly no login
- [ ] Redirecionar para /dashboard após login bem-sucedido
- [ ] Exibir erro "Email ou senha incorretos" se falhar
- [ ] Adicionar link "Esqueceu a senha?"
- [ ] Testes de UI (campo vazio, email inválido, etc.)

**Testável**:
- [ ] Página carrega sem erros em /login
- [ ] Validação de email funciona
- [ ] Submit com credenciais válidas redireciona para dashboard
- [ ] Erro é exibido com credenciais inválidas
- [ ] Token é armazenado após login

---

### TASK-006: Gestão de Usuários (Admin Only)

**Descrição**: Implementar CRUD de usuários (criar, editar, deletar, listagem)  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 5 SP  
**Dependências**: TASK-001, TASK-002, TASK-003  
**Módulo**: Autenticação

**Subtarefas**:
- [ ] Criar endpoint GET /api/users (listagem com paginação)
- [ ] Criar endpoint POST /api/users (criar novo usuário)
- [ ] Criar endpoint PUT /api/users/{id} (editar)
- [ ] Criar endpoint DELETE /api/users/{id} (deletar)
- [ ] Implementar middleware de RBAC (admin only)
- [ ] Frontend: Página /settings/users com tabela
- [ ] Validar que admin não pode ser deletado se único
- [ ] Teste de permissões (vendedor não consegue criar usuário)

**Testável**:
- [ ] Admin consegue listar, criar, editar e deletar usuários
- [ ] Vendedor recebe 403 ao tentar criar usuário
- [ ] Novo usuário recebe senha temporária por email (simulado em dev)
- [ ] Email do usuário é único

---

## Módulo: Alunos (CRUD)

### TASK-007: Listar Alunos (Backend)

**Descrição**: Implementar GET /api/students com filtros e paginação  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 5 SP  
**Dependências**: TASK-002, TASK-003  
**Módulo**: Alunos

**Subtarefas**:
- [ ] Criar query GET /api/students com query params
- [ ] Implementar paginação (page, limit)
- [ ] Implementar filtros (status, search, assignedTo)
- [ ] Implementar sort (sortBy, order)
- [ ] Implementar RBAC (vendedor vê só seus, admin vê todos)
- [ ] Otimizar query com índices de DB
- [ ] Testar performance com 3000+ registros
- [ ] Retornar count total e meta de paginação

**Testável**:
- [ ] GET /api/students retorna 50 registros (default)
- [ ] ?page=2&limit=100 funciona
- [ ] ?status=ativo filtra corretamente
- [ ] ?search=joão busca por nome/email (case-insensitive)
- [ ] Vendedor vê apenas seus alunos (RBAC)
- [ ] Response time < 500ms com 3000 registros

---

### TASK-008: Criar/Editar Aluno (Backend)

**Descrição**: Implementar POST/PUT /api/students  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 4 SP  
**Dependências**: TASK-002, TASK-003  
**Módulo**: Alunos

**Subtarefas**:
- [ ] Criar endpoint POST /api/students (validar email único, CPF único)
- [ ] Criar endpoint PUT /api/students/{id} (atualizar campos)
- [ ] Validar fields: name, email, phone, cpf, status
- [ ] Validar format: email (RFC5322), CPF (dígitos verificadores)
- [ ] Retornar erro 409 se email/CPF duplicado
- [ ] Rastrear updated_at
- [ ] Testar validação de entrada

**Testável**:
- [ ] POST com email válido cria aluno
- [ ] POST com email duplicado retorna 409
- [ ] POST com email inválido retorna 400
- [ ] PUT atualiza fields corretamente
- [ ] Timestamp updated_at muda

---

### TASK-009: Deletar Aluno (Backend)

**Descrição**: Implementar DELETE /api/students/{id} com cascata  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 2 SP  
**Dependências**: TASK-002, TASK-003  
**Módulo**: Alunos

**Subtarefas**:
- [ ] Criar endpoint DELETE /api/students/{id}
- [ ] Implementar cascata: deletar purchases, tasks, pipeline_leads
- [ ] Apenas admin consegue deletar
- [ ] Retornar 204 No Content
- [ ] Testar cascata no banco

**Testável**:
- [ ] DELETE /api/students/{id} retorna 204
- [ ] Compras do aluno são deletadas
- [ ] Tarefas do aluno são deletadas
- [ ] Leads do aluno são deletados
- [ ] Vendedor recebe 403

---

### TASK-010: Detalhe do Aluno (Frontend)

**Descrição**: Implementar página /students/{id} com dados completos  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 5 SP  
**Dependências**: TASK-001, TASK-007  
**Módulo**: Alunos

**Subtarefas**:
- [ ] Criar página /students/[id].tsx
- [ ] Fetch dados do aluno + cursos + leads + tarefas
- [ ] Exibir card com dados pessoais (com edição inline)
- [ ] Exibir card de cursos comprados
- [ ] Exibir card de oportunidades (pipeline)
- [ ] Exibir card de tarefas pendentes
- [ ] Exibir card de anotações (editável)
- [ ] Botões de ação: Editar, Enviar E-mail, Nova Tarefa, Deletar
- [ ] Loading states e error handling

**Testável**:
- [ ] Página carrega dados corretamente
- [ ] Edição inline funciona (salva ao blur)
- [ ] Botões de ação estão acessíveis
- [ ] Dados atualizam em tempo real após edição

---

### TASK-011: Listagem de Alunos (Frontend)

**Descrição**: Implementar página /students com tabela, filtros, busca  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 5 SP  
**Dependências**: TASK-001, TASK-007  
**Módulo**: Alunos

**Subtarefas**:
- [ ] Criar página /students.tsx
- [ ] Componente Table com sorting
- [ ] Componente SearchBar (debounce 300ms)
- [ ] Filtros: Status, Curso, Vendedor (dropdowns)
- [ ] Paginação: page numbers + prev/next
- [ ] Ações por linha: view, edit, delete
- [ ] Loading skeleton enquanto fetch
- [ ] Mobile responsive (tabela em cards no mobile)

**Testável**:
- [ ] Tabela carrega dados de /api/students
- [ ] Busca filtra por nome (debounce funciona)
- [ ] Filtros combinam corretamente
- [ ] Paginação navega entre páginas
- [ ] Clique em linha abre /students/[id]

---

### TASK-012: Importação Bulk de Alunos (Backend)

**Descrição**: Implementar POST /api/students/bulk-import para CSV  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 5 SP  
**Dependências**: TASK-002, TASK-003  
**Módulo**: Alunos

**Subtarefas**:
- [ ] Criar endpoint POST /api/students/bulk-import (multipart/form-data)
- [ ] Parser de CSV (usar library como `csv-parser`)
- [ ] Validar cada linha (email, CPF)
- [ ] Transação: insert all ou rollback
- [ ] Retornar relatório: sucesso, falhas, duplicatas
- [ ] Limit: máx 10.000 registros por import
- [ ] Log de auditoria (quem importou, quando)
- [ ] Testar com 3000 registros

**Testável**:
- [ ] POST com CSV válido importa 3000 registros
- [ ] Relatório mostra 0 falhas se tudo válido
- [ ] Email duplicado retorna erro para aquela linha
- [ ] Transação: se falhar, nenhum dado é insertado
- [ ] Importação é auditada

---

### TASK-013: Importação Bulk de Alunos (Frontend)

**Descrição**: Implementar página /settings/import com upload e preview  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 4 SP  
**Dependências**: TASK-001, TASK-012  
**Módulo**: Alunos

**Subtarefas**:
- [ ] Criar página /settings/import
- [ ] Componente drag-drop para upload
- [ ] Parser CSV local (preview antes de enviar)
- [ ] Exibir preview das 5 primeiras linhas
- [ ] Validação visual (✓, ⚠, ✗ para cada linha)
- [ ] Botão "Importar" envia POST /api/students/bulk-import
- [ ] Barra de progresso durante import
- [ ] Resultado final com relatório (sucesso/falhas)
- [ ] Download de relatório de erros (CSV)

**Testável**:
- [ ] Upload via click e drag-drop funciona
- [ ] Preview exibe corretamente
- [ ] Importação começa após confirmação
- [ ] Progresso atualiza em tempo real
- [ ] Relatório final está correto
- [ ] Dashboard atualiza count de alunos

---

## Módulo: Cursos

### TASK-014: CRUD de Cursos (Backend)

**Descrição**: Implementar GET/POST/PUT/DELETE /api/courses  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 3 SP  
**Dependências**: TASK-002, TASK-003  
**Módulo**: Cursos

**Subtarefas**:
- [ ] GET /api/courses (listagem, paginação)
- [ ] POST /api/courses (create, admin only)
- [ ] PUT /api/courses/{id} (update, admin only)
- [ ] DELETE /api/courses/{id} (delete, admin only, fail se purchases)
- [ ] Validar: name (required), price (required, decimal)
- [ ] Retornar 403 se não admin

**Testável**:
- [ ] CRUD funciona completamente
- [ ] Admin consegue criar/editar/deletar
- [ ] Vendedor recebe 403
- [ ] Delete falha se houver purchases

---

### TASK-015: Gestão de Cursos (Frontend)

**Descrição**: Implementar página /courses com CRUD  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 3 SP  
**Dependências**: TASK-001, TASK-014  
**Módulo**: Cursos

**Subtarefas**:
- [ ] Criar página /courses
- [ ] Tabela: nome, descrição, preço, status
- [ ] Botão "+ Novo Curso"
- [ ] Modal de criar/editar curso
- [ ] Botões de delete com confirmação
- [ ] Validação de preço (até 2 casas decimais)

**Testável**:
- [ ] Tabela carrega cursos
- [ ] Criar novo curso funciona
- [ ] Editar curso funciona
- [ ] Deletar pede confirmação

---

## Módulo: Compras/Purchases

### TASK-016: Registrar Compra de Aluno (Backend)

**Descrição**: Implementar POST /api/students/{id}/purchases  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 3 SP  
**Dependências**: TASK-002, TASK-003, TASK-008  
**Módulo**: Compras

**Subtarefas**:
- [ ] Criar endpoint POST /api/students/{id}/purchases
- [ ] Validar: courseId (exists), purchaseDate (not future), amount
- [ ] Unique constraint: student não pode comprar mesmo curso 2x
- [ ] Retornar 409 se duplicado
- [ ] Retornar 404 se course não existe

**Testável**:
- [ ] POST cria compra corretamente
- [ ] Duplicada retorna 409
- [ ] Course inválido retorna 404
- [ ] Purchase date não pode ser futura

---

### TASK-017: Listar Compras do Aluno (Backend)

**Descrição**: Implementar GET /api/students/{id}/purchases  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 2 SP  
**Dependências**: TASK-002, TASK-003  
**Módulo**: Compras

**Subtarefas**:
- [ ] GET /api/students/{id}/purchases (listagem)
- [ ] Retornar: courseId, courseName, purchaseDate, amount, notes
- [ ] Ordenar por purchaseDate DESC

**Testável**:
- [ ] GET retorna compras do aluno
- [ ] Dados estão corretos
- [ ] Ordenação funciona

---

### TASK-018: Adicionar Curso ao Aluno (Frontend)

**Descrição**: Modal de adicionar compra de curso no detalhe do aluno  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 2 SP  
**Dependências**: TASK-001, TASK-010, TASK-016  
**Módulo**: Compras

**Subtarefas**:
- [ ] Botão "+ Adicionar Curso" no card de Cursos
- [ ] Modal com dropdown de cursos
- [ ] Campo de data (default: hoje)
- [ ] Campo de valor (default: preço do curso)
- [ ] Campo de notas (opcional)
- [ ] Validação: não permitir curso duplicado
- [ ] POST para /api/students/{id}/purchases

**Testável**:
- [ ] Modal abre ao clicar botão
- [ ] Dropdown mostra cursos disponíveis
- [ ] Submissão salva compra
- [ ] Card de Cursos atualiza

---

## Módulo: Dashboard

### TASK-019: Backend de Métricas para Dashboard

**Descrição**: Implementar GET /api/dashboard/metrics com agregações  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 5 SP  
**Dependências**: TASK-002, TASK-003  
**Módulo**: Dashboard

**Subtarefas**:
- [ ] Endpoint GET /api/dashboard/metrics
- [ ] Query params: ?period=30days (7days, 30days, 90days, custom)
- [ ] Calcular: totalStudents, newStudentsThisMonth, totalRevenue
- [ ] Calcular: studentsByCourse (array de {courseId, courseName, count})
- [ ] Calcular: activityRate (% de alunos que acessaram nos últimos 30 dias)
- [ ] Otimizar queries (usar indexes, caching se necessário)
- [ ] Testar performance com 3000 alunos

**Testável**:
- [ ] GET retorna todas as métricas
- [ ] Período custom funciona
- [ ] Valores estão corretos (validar manualmente)
- [ ] Response time < 2 segundos

---

### TASK-020: Dashboard Frontend (React)

**Descrição**: Implementar página /dashboard com cards e gráficos  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 5 SP  
**Dependências**: TASK-001, TASK-019  
**Módulo**: Dashboard

**Subtarefas**:
- [ ] Criar página /dashboard.tsx
- [ ] Componente de KPI card (4 cards principais)
- [ ] Gráfico de barras: Alunos por Curso (Recharts)
- [ ] Gráfico de linhas: Receita por mês (Recharts)
- [ ] Selector de período (dropdown)
- [ ] Fetch de /api/dashboard/metrics
- [ ] Loading skeleton enquanto carrega
- [ ] Responsivo (desktop, tablet, mobile)
- [ ] Cores: primária #2563EB, sucesso #10B981, alerta #F59E0B

**Testável**:
- [ ] Dashboard carrega < 2 segundos
- [ ] Métricas são exibidas corretamente
- [ ] Gráficos renderizam (sem erro)
- [ ] Filtro de período atualiza gráficos
- [ ] Responsivo em mobile

---

## Módulo: Pipeline de Vendas

### TASK-021: Criar/Atualizar Leads (Backend)

**Descrição**: Implementar CRUD de pipeline_leads  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 4 SP  
**Dependências**: TASK-002, TASK-003  
**Módulo**: Pipeline

**Subtarefas**:
- [ ] POST /api/pipeline (criar lead)
- [ ] PUT /api/pipeline/{id} (atualizar lead)
- [ ] PUT /api/pipeline/{id}/status (mudar status)
- [ ] GET /api/pipeline (listagem com filtros)
- [ ] Validar status: prospecting, negotiation, sold, lost
- [ ] Implementar RBAC: vendedor vê só seus leads
- [ ] Retornar summary por status

**Testável**:
- [ ] CRUD funciona
- [ ] Status update funciona
- [ ] Vendedor vê apenas seus leads
- [ ] Summary está correto

---

### TASK-022: Pipeline Frontend (Kanban)

**Descrição**: Implementar página /pipeline com board Kanban  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 5 SP  
**Dependências**: TASK-001, TASK-021  
**Módulo**: Pipeline

**Subtarefas**:
- [ ] Criar página /pipeline
- [ ] Colunas Kanban: Prospecting, Negotiation, Sold, Lost
- [ ] Componente Card de lead (nome, valor, data)
- [ ] Drag & drop entre colunas (usar react-beautiful-dnd ou similar)
- [ ] Clique em card abre detalhe/edit modal
- [ ] Filtros: Vendedor, Período
- [ ] Total de valor por coluna (footer)

**Testável**:
- [ ] Colunas carregam
- [ ] Drag & drop funciona e atualiza backend
- [ ] Filtros funcionam
- [ ] Totais estão corretos

---

## Módulo: Tarefas

### TASK-023: CRUD de Tarefas (Backend)

**Descrição**: Implementar endpoints de tarefas  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 4 SP  
**Dependências**: TASK-002, TASK-003  
**Módulo**: Tarefas

**Subtarefas**:
- [ ] POST /api/tasks (criar tarefa)
- [ ] GET /api/tasks (listar tarefas do usuário)
- [ ] PUT /api/tasks/{id} (editar)
- [ ] PUT /api/tasks/{id}/complete (marcar concluída)
- [ ] DELETE /api/tasks/{id} (deletar)
- [ ] Validar: title, dueDate, priority (low, normal, high)
- [ ] Implementar RBAC: usuário vê apenas suas tarefas
- [ ] Filtros: completed, priority, sortBy dueDate

**Testável**:
- [ ] CRUD funciona completamente
- [ ] Usuário vê apenas suas tarefas
- [ ] Complete atualiza completedAt
- [ ] Filtros funcionam

---

### TASK-024: Tarefas Frontend

**Descrição**: Implementar página /tasks com lista e gerenciamento  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 4 SP  
**Dependências**: TASK-001, TASK-023  
**Módulo**: Tarefas

**Subtarefas**:
- [ ] Criar página /tasks
- [ ] Agrupar por status: Vencidas (vermelho), Hoje, Próximos Dias, Concluídas (cinza)
- [ ] Cards de tarefa: checkbox, título, data, prioridade
- [ ] Botão "+ Nova Tarefa"
- [ ] Modal de criar/editar tarefa
- [ ] Checkbox marca concluída (move para seção)
- [ ] Clique em tarefa abre detalhe
- [ ] Filtros: Status, Prioridade

**Testável**:
- [ ] Tarefas carregam e agrupam corretamente
- [ ] Criar nova tarefa funciona
- [ ] Checkbox marca concluída
- [ ] Tarefas vencidas ficam vermelhas
- [ ] Clique abre detalhe

---

## Módulo: E-mail

### TASK-025: Enviar E-mail Individual (Backend)

**Descrição**: Implementar POST /api/email/send  
**Prioridade**: 🟢 BAIXA  
**Estimativa**: 3 SP  
**Dependências**: TASK-002, TASK-003  
**Módulo**: E-mail

**Subtarefas**:
- [ ] Criar endpoint POST /api/email/send
- [ ] Validar: to (email), subject (required), body (HTML)
- [ ] Integrar SMTP (nodemailer com Sendgrid/Brevo/outro)
- [ ] Logging de emails enviados
- [ ] Tratamento de erros

**Testável**:
- [ ] POST envia e-mail (simulado em dev)
- [ ] Log de auditoria registra envio
- [ ] Erro é tratado gracefully

---

### TASK-026: Enviar E-mail em Massa (Backend)

**Descrição**: Implementar POST /api/email/send-bulk  
**Prioridade**: 🟢 BAIXA  
**Estimativa**: 3 SP  
**Dependências**: TASK-002, TASK-003, TASK-025  
**Módulo**: E-mail

**Subtarefas**:
- [ ] Criar endpoint POST /api/email/send-bulk
- [ ] Input: studentIds[], subject, body (com merge tags: {{name}}, {{course}})
- [ ] Loop: enviar para cada aluno (ou usar queue em v2)
- [ ] Retornar: sent count, failed count, messageIds

**Testável**:
- [ ] POST envia para múltiplos alunos
- [ ] Merge tags são substituídas corretamente
- [ ] Relatório de envio está correto

---

### TASK-027: Enviar E-mail no Frontend

**Descrição**: Modal de envio de e-mail em detalhe do aluno  
**Prioridade**: 🟢 BAIXA  
**Estimativa**: 2 SP  
**Dependências**: TASK-001, TASK-010, TASK-025  
**Módulo**: E-mail

**Subtarefas**:
- [ ] Botão "Enviar E-mail" no detalhe do aluno
- [ ] Modal: To (preenchido), Subject, Body (rich text editor)
- [ ] Submissão POST /api/email/send
- [ ] Toast de confirmação

**Testável**:
- [ ] Modal abre
- [ ] E-mail é enviado
- [ ] Confirmação é exibida

---

## Módulo: Relatórios & Exportação

### TASK-028: Exportar Alunos (CSV/PDF)

**Descrição**: Implementar GET /reports/students-export  
**Prioridade**: 🟢 BAIXA  
**Estimativa**: 3 SP  
**Dependências**: TASK-002, TASK-003, TASK-007  
**Módulo**: Relatórios

**Subtarefas**:
- [ ] Endpoint GET /reports/students-export?format=csv&filters=...
- [ ] Respectar filtros aplicados (status, search, assignedTo)
- [ ] Gerar CSV: nome, email, telefone, CPF, status, cursos, data cadastro
- [ ] Gerar PDF: layout legível (opcional)
- [ ] Headers de download corretos

**Testável**:
- [ ] GET retorna arquivo CSV
- [ ] CSV abre corretamente em Excel
- [ ] Dados respeitam filtros

---

## Módulo: Layout & Navegação

### TASK-029: Header & Sidebar (Navigation)

**Descrição**: Componentes de layout (header, sidebar, footer)  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 3 SP  
**Dependências**: TASK-001  
**Módulo**: Layout

**Subtarefas**:
- [ ] Componente Header: logo, user menu, logout
- [ ] Componente Sidebar: menu de navegação
- [ ] Componente Layout: wrapper para todas as páginas
- [ ] Responsive: burger menu no mobile
- [ ] Links: Home, Alunos, Cursos, Pipeline, Tarefas, Config
- [ ] User profile dropdown: nome, email, logout

**Testável**:
- [ ] Header e Sidebar carregam em todas as páginas
- [ ] Menu é responsivo
- [ ] Logout funciona
- [ ] Links navegam corretamente

---

### TASK-030: Proteção de Rotas (Frontend Middleware)

**Descrição**: Middleware que redireciona para login se não autenticado  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 2 SP  
**Dependências**: TASK-001, TASK-003, TASK-005  
**Módulo**: Layout

**Subtarefas**:
- [ ] Criar middleware de autenticação no app router
- [ ] Redirecionar para /login se sem token
- [ ] Validar token (expiração, formato)
- [ ] Públicas: /login, /reset-password
- [ ] Privadas: todas as outras

**Testável**:
- [ ] Acesso sem token redireciona para login
- [ ] Com token válido, acesso é permitido
- [ ] Token expirado redireciona para login

---

## Módulo: Validação & Testes

### TASK-031: Testes Unitários (Backend)

**Descrição**: Testes de funções críticas (login, CRUD, validações)  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 5 SP  
**Dependências**: Todas as tasks de backend  
**Módulo**: Testes

**Subtarefas**:
- [ ] Instalar Jest + Testing Library
- [ ] Testes de login (credenciais válidas, inválidas)
- [ ] Testes de CRUD de alunos (create, read, update, delete)
- [ ] Testes de validações (email, CPF, etc.)
- [ ] Testes de RBAC (admin vs vendedor)
- [ ] Coverage: mínimo 70%

**Testável**:
- [ ] `npm test` passa todos os testes
- [ ] Coverage report gerado
- [ ] Testes cobrem casos críticos

---

### TASK-032: Testes E2E (Playwright)

**Descrição**: Testes end-to-end (fluxos completos)  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 5 SP  
**Dependências**: Todas as tasks de frontend  
**Módulo**: Testes

**Subtarefas**:
- [ ] Instalar Playwright
- [ ] Teste E2E: Login → Dashboard → Alunos → Detalhe
- [ ] Teste E2E: Importar alunos
- [ ] Teste E2E: Criar lead no pipeline
- [ ] Teste E2E: Criar tarefa
- [ ] Rodar em CI/CD (GitHub Actions)

**Testável**:
- [ ] `npx playwright test` passa todos os testes
- [ ] Testes passam em modo headless
- [ ] CI/CD roda tests em cada push

---

## Módulo: Deploy & DevOps

### TASK-033: Configurar GitHub & CI/CD

**Descrição**: Setup GitHub repository e GitHub Actions  
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 3 SP  
**Dependências**: TASK-001  
**Módulo**: DevOps

**Subtarefas**:
- [ ] Criar repositório GitHub
- [ ] Configurar .gitignore
- [ ] Primeiro commit com estrutura base
- [ ] Configurar GitHub Actions (lint, test, build)
- [ ] Configurar branch protection (main)

**Testável**:
- [ ] Repo público/privado conforme combinado
- [ ] Actions rodam em cada push
- [ ] Build passa antes de merge

---

### TASK-034: Deploy no Vercel

**Descrição**: Configurar projeto no Vercel e deploy automático  
**Prioridade**: 🔴 ALTA  
**Estimativa**: 2 SP  
**Dependências**: TASK-001, TASK-033  
**Módulo**: DevOps

**Subtarefas**:
- [ ] Conectar GitHub repo ao Vercel
- [ ] Configurar environment variables (DATABASE_URL, JWT_SECRET)
- [ ] Configurar vercel.json (ou vercel.ts)
- [ ] Fazer primeiro deploy
- [ ] Testar em prod (login, dashboard, etc.)
- [ ] Configurar domain (se disponível)

**Testável**:
- [ ] Deploy automático funciona (push → deploy)
- [ ] Variáveis de environment carregam corretamente
- [ ] App funciona em produção (sem erros 500)

---

## Resumo de Tarefas por Módulo

| Módulo | Tasks | Total SP |
|--------|-------|----------|
| Infraestrutura | TASK-001 a 004 | 15 |
| Autenticação | TASK-005 a 006 | 8 |
| Alunos | TASK-007 a 013 | 28 |
| Cursos | TASK-014 a 015 | 6 |
| Compras | TASK-016 a 018 | 7 |
| Dashboard | TASK-019 a 020 | 10 |
| Pipeline | TASK-021 a 022 | 9 |
| Tarefas | TASK-023 a 024 | 8 |
| E-mail | TASK-025 a 027 | 8 |
| Relatórios | TASK-028 | 3 |
| Layout | TASK-029 a 030 | 5 |
| Testes | TASK-031 a 032 | 10 |
| DevOps | TASK-033 a 034 | 5 |
| **TOTAL** | **34 tasks** | **112 SP** |

---

## Sprints

### Visão Geral

**Total de Story Points**: 112 SP  
**Divisão**: 3 Sprints (adaptável conforme velocidade)  
**Objetivo Final**: MVP funcional com login, alunos, dashboard, importação e pipeline

---

### 📋 Sprint 1: Infraestrutura & MVP (2-3 dias)

**Objetivo**: Infraestrutura base + Autenticação + CRUD de Alunos + Dashboard  
**Duração**: 2-3 dias  
**Story Points Totais**: 40 SP  
**Prioridade**: 🔴 CRÍTICA

#### Tarefas Incluídas

| ID | Task | SP | Prioridade |
|----|------|----|----|
| TASK-001 | Setup do Projeto Next.js | 3 | 🔴 |
| TASK-002 | Setup de BD (PostgreSQL + Prisma) | 5 | 🔴 |
| TASK-003 | Autenticação (JWT + Middleware) | 5 | 🔴 |
| TASK-004 | Setup de Variáveis de Ambiente | 2 | 🔴 |
| TASK-005 | Tela de Login (Frontend) | 3 | 🔴 |
| TASK-007 | Listar Alunos (Backend) | 5 | 🔴 |
| TASK-008 | Criar/Editar Aluno (Backend) | 4 | 🔴 |
| TASK-011 | Listagem de Alunos (Frontend) | 5 | 🔴 |
| TASK-019 | Métricas para Dashboard (Backend) | 5 | 🔴 |
| TASK-020 | Dashboard Frontend | 5 | 🔴 |
| TASK-029 | Header & Sidebar | 3 | 🔴 |
| TASK-030 | Proteção de Rotas | 2 | 🔴 |

#### Fluxo de Trabalho

1. **Dias 1-2**:
   - TASK-001: Setup projeto
   - TASK-002: Banco de dados
   - TASK-003: Autenticação
   - TASK-004: Variáveis

2. **Dia 2-3**:
   - TASK-005: Tela de login
   - TASK-007/008: CRUD alunos backend
   - TASK-011: Listagem frontend
   - TASK-029/030: Layout e proteção

3. **Dia 3**:
   - TASK-019/020: Dashboard
   - Integração end-to-end
   - Testes manuais

#### Testáveis (Definição de Pronto)

- [ ] **Login funciona**: email + senha → token JWT → redirecionamento para dashboard
- [ ] **Dashboard carrega**: exibe total de alunos (0 por enquanto), sem erros
- [ ] **Tabela de Alunos**: exibe lista (vazia ou com seed data), busca funciona
- [ ] **CRUD básico**: criar aluno, editar, deletar funcionam
- [ ] **Proteção**: sem token → redireciona para /login
- [ ] **Header & Sidebar**: layout responsivo, logout funciona
- [ ] **Zero erros 500** em fluxo base: login → dashboard → alunos
- [ ] **Performance**: dashboard carrega em < 2s

#### Critérios de Aceitação

```
✓ Projeto Next.js + TypeScript + Tailwind rodam sem erros
✓ PostgreSQL conecta e migrations rodam
✓ POST /api/auth/login retorna token válido
✓ GET /students retorna array (vazio ou com seed)
✓ POST /students cria novo aluno
✓ PUT /students/{id} edita aluno
✓ DELETE /students/{id} deleta aluno
✓ GET /dashboard/metrics retorna KPIs
✓ Frontend dashboard renderiza cards e gráficos
✓ Usuário consegue fazer login e logout
✓ Rotas privadas redirecionam para login
✓ App roda em npm run dev sem erros
✓ Build produção (next build) passa
```

---

### 📋 Sprint 2: Funcionalidades Completas (3-4 dias)

**Objetivo**: Importação, Cursos, Compras, Pipeline, Tarefas, E-mail  
**Duração**: 3-4 dias  
**Story Points Totais**: 50 SP  
**Prioridade**: 🟡 ALTA

#### Tarefas Incluídas

| ID | Task | SP | Prioridade |
|----|------|----|----|
| TASK-006 | Gestão de Usuários | 5 | 🟡 |
| TASK-009 | Deletar Aluno (Backend) | 2 | 🟡 |
| TASK-010 | Detalhe do Aluno (Frontend) | 5 | 🟡 |
| TASK-012 | Importação Bulk (Backend) | 5 | 🔴 |
| TASK-013 | Importação Bulk (Frontend) | 4 | 🔴 |
| TASK-014 | CRUD de Cursos (Backend) | 3 | 🟡 |
| TASK-015 | Gestão de Cursos (Frontend) | 3 | 🟡 |
| TASK-016 | Registrar Compra (Backend) | 3 | 🟡 |
| TASK-017 | Listar Compras (Backend) | 2 | 🟡 |
| TASK-018 | Adicionar Curso (Frontend) | 2 | 🟡 |
| TASK-021 | Criar/Atualizar Leads (Backend) | 4 | 🟡 |
| TASK-022 | Pipeline Frontend (Kanban) | 5 | 🟡 |
| TASK-023 | CRUD de Tarefas (Backend) | 4 | 🟡 |
| TASK-024 | Tarefas Frontend | 4 | 🟡 |
| TASK-025 | Enviar E-mail Individual | 3 | 🟢 |

#### Fluxo de Trabalho

1. **Dia 1**:
   - TASK-012: Importação backend (com validação)
   - TASK-013: Importação frontend
   - TASK-009: Delete de aluno

2. **Dia 2**:
   - TASK-010: Detalhe do aluno
   - TASK-014/015: CRUD de cursos
   - TASK-016/017/018: Compras

3. **Dia 3**:
   - TASK-021/022: Pipeline (backend + frontend Kanban)
   - TASK-023/024: Tarefas
   - TASK-025: E-mail

4. **Dia 4**:
   - Integração de tudo
   - Testes manuais
   - Polimento de UI/UX

#### Testáveis (Definição de Pronto)

- [ ] **Importação**: upload de CSV com 3000 alunos → todos importados em < 1 min
- [ ] **Detalhe do Aluno**: página exibe dados, cursos, leads, tarefas, permite editar
- [ ] **Cursos**: CRUD funciona, preço aceita decimais
- [ ] **Compras**: adicionar curso ao aluno funciona, não permite duplicata
- [ ] **Pipeline**: Kanban com 4 colunas, drag & drop funciona
- [ ] **Tarefas**: criar, editar, marcar concluída, deletar funcionam
- [ ] **E-mail**: envio individual funciona (simulado ou real)
- [ ] **RBAC**: vendedor vê apenas seus alunos/leads
- [ ] **Filtros**: todos os filtros funcionam (status, curso, vendedor, etc.)
- [ ] **Zero erros 500** em fluxo completo

#### Critérios de Aceitação

```
✓ POST /api/students/bulk-import importa 3000 registros
✓ Importação relatório mostra sucesso/falhas
✓ GET /students/{id} retorna dados + cursos + leads + tarefas
✓ CRUD de cursos funciona completamente
✓ POST /students/{id}/purchases registra compra
✓ Duplicata de compra retorna 409
✓ GET /api/pipeline retorna leads com filtros
✓ Drag & drop no Kanban atualiza status
✓ CRUD de tarefas funciona
✓ POST /api/email/send funciona
✓ Filtros (status, curso, vendedor) funcionam em todas as páginas
✓ Vendedor vê apenas seus dados (RBAC validado)
✓ Dashboard atualiza com novos dados importados
✓ Performance: importação não trava a UI
✓ Todas as páginas responsive (mobile, tablet, desktop)
```

---

### 📋 Sprint 3: Testes, Deploy e Polimento (1-2 dias)

**Objetivo**: Testes automatizados, Deploy, Bug fixes, Documentação  
**Duração**: 1-2 dias  
**Story Points Totais**: 22 SP  
**Prioridade**: 🟡 MÉDIA

#### Tarefas Incluídas

| ID | Task | SP | Prioridade |
|----|------|----|----|
| TASK-026 | Enviar E-mail em Massa | 3 | 🟢 |
| TASK-027 | Enviar E-mail Frontend | 2 | 🟢 |
| TASK-028 | Exportar Alunos (CSV) | 3 | 🟢 |
| TASK-031 | Testes Unitários | 5 | 🟡 |
| TASK-032 | Testes E2E (Playwright) | 5 | 🟡 |
| TASK-033 | GitHub & CI/CD | 3 | 🟡 |
| TASK-034 | Deploy Vercel | 2 | 🔴 |

#### Fluxo de Trabalho

1. **Dia 1 - Manhã**:
   - TASK-031: Testes unitários (login, CRUD, validações)
   - TASK-032: Testes E2E (fluxo completo)

2. **Dia 1 - Tarde**:
   - TASK-033: GitHub + CI/CD
   - TASK-034: Deploy Vercel
   - Testar em ambiente de produção

3. **Dia 2**:
   - TASK-026/027: E-mail em massa + frontend
   - TASK-028: Exportação CSV
   - Bug fixes e polimento
   - Documentação final

#### Testáveis (Definição de Pronto)

- [ ] **Testes unitários**: `npm test` passa com cobertura > 70%
- [ ] **Testes E2E**: `npm run e2e` passa (login → dashboard → alunos → import)
- [ ] **CI/CD**: GitHub Actions passa em cada push
- [ ] **Deploy**: primeira deploy no Vercel funciona
- [ ] **Produção**: app funciona sem erros (zero 500)
- [ ] **E-mail**: envio em massa funciona
- [ ] **Exportação**: CSV baixa corretamente com filtros
- [ ] **Pronto para uso**: admin consegue cancelar CRM antigo

#### Critérios de Aceitação

```
✓ Jest tests: npm test passa, coverage > 70%
✓ Playwright E2E: npm run e2e passa
✓ GitHub Actions: build + test + lint passam
✓ Vercel deploy: primeira deploy bem-sucedida
✓ Env vars: carregam corretamente em produção
✓ Domain: (se configurado) funciona
✓ POST /api/email/send-bulk funciona
✓ GET /reports/students-export retorna CSV
✓ Botão "Enviar E-mail" exibe modal funcional
✓ Documentação: README.md e GETTING_STARTED.md atualizados
✓ Performance: Lighthouse score > 80
✓ Zero bugs bloqueantes (todos os casos de uso funcionam)
```

---

### 📊 Timeline Completo

```
Sprint 1 (40 SP) ───────────── 2-3 dias
  ├─ Infra & DB
  ├─ Auth & Login
  ├─ Alunos CRUD
  ├─ Dashboard
  └─ Layout

Sprint 2 (50 SP) ───────────── 3-4 dias
  ├─ Importação (3000 alunos)
  ├─ Cursos & Compras
  ├─ Pipeline
  ├─ Tarefas
  └─ E-mail

Sprint 3 (22 SP) ───────────── 1-2 dias
  ├─ Testes
  ├─ Deploy
  ├─ CI/CD
  └─ Polimento

─────────────────────────────────────────────────
TOTAL: 6-9 dias para MVP funcional
```

---

### 🚀 Exemplo de Execução Diária

#### Sprint 1 - Dia 1

**Morning (9am-12pm)**:
- [ ] TASK-001: Setup projeto (3h)
- [ ] TASK-002 init: Começar setup de BD

**Afternoon (2pm-6pm)**:
- [ ] TASK-002: Finalizar setup BD e migrations
- [ ] TASK-003: Começar autenticação (JWT)
- [ ] TASK-004: Variáveis de ambiente

**Testável ao final**: `npm run dev` funciona, BD conecta, variáveis carregam

---

#### Sprint 1 - Dia 2

**Morning (9am-12pm)**:
- [ ] TASK-003: Finalizar autenticação
- [ ] TASK-005: Frontend - tela de login

**Afternoon (2pm-6pm)**:
- [ ] TASK-007/008: Backend CRUD de alunos
- [ ] TASK-011: Frontend listagem de alunos
- [ ] TASK-029: Header & Sidebar

**Testável ao final**: Login funciona, tabela de alunos carrega (vazia)

---

#### Sprint 1 - Dia 3

**Morning (9am-12pm)**:
- [ ] TASK-019/020: Dashboard (backend + frontend)
- [ ] TASK-030: Proteção de rotas

**Afternoon (2pm-6pm)**:
- [ ] Integração: testar fluxo completo (login → dashboard → alunos)
- [ ] Bug fixes
- [ ] Polimento de UI

**Testável ao final**: MVP base funciona, pronto para Sprint 2

---

### 📌 Pontos-Chave por Sprint

#### Sprint 1
- **Foco**: Fundação estável
- **Risco**: Setup de infraestrutura pode ter problemas
- **Mitigação**: Testar cada task isoladamente antes de integrar

#### Sprint 2
- **Foco**: Funcionalidades essenciais
- **Risco**: Importação de 3000 alunos pode ser lenta
- **Mitigação**: Otimizar query, usar índices, testar com volume real

#### Sprint 3
- **Foco**: Qualidade e produção
- **Risco**: Bugs encontrados em testes E2E
- **Mitigação**: Priorizar bugs críticos, aceitar bugs menores

---

### 🎯 Definição de Pronto (DoD - Definition of Done)

Cada tarefa é considerada **pronta** quando:

✅ Código escrito e revisado (self-review mínimo)  
✅ Testes locais passam (manual ou automatizado)  
✅ Sem erros 500 ou console.error/console.warn
✅ Integrada com outras tasks da sprint  
✅ Testável do fluxo de aceitação está confirmado  
✅ Documentação inline (comentários JSDoc)  
✅ Responsivo (funciona em mobile, tablet, desktop)

---

### 📈 Rastreamento de Progresso

#### Sprint 1
- [ ] Dia 1: 10 SP (30%)
- [ ] Dia 2: 18 SP (65%)
- [ ] Dia 3: 40 SP (100%)

#### Sprint 2
- [ ] Dia 1: 12 SP (24%)
- [ ] Dia 2: 25 SP (50%)
- [ ] Dia 3: 38 SP (76%)
- [ ] Dia 4: 50 SP (100%)

#### Sprint 3
- [ ] Dia 1: 15 SP (68%)
- [ ] Dia 2: 22 SP (100%)

---

### 🔄 Próximas Iterações (Backlog Futuro)

**Sprint 4** (se needed):
- [ ] TASK-026: E-mail em massa
- [ ] TASK-027: E-mail Frontend
- [ ] TASK-028: Exportação
- [ ] Bug fixes e optimizações

**Sprint 5** (v2):
- [ ] Integração com Hotmart (automática)
- [ ] Cache com Redis
- [ ] WebSockets para notificações
- [ ] Histórico de contatos (logs)

---

**Versão**: 1.1  
**Data**: 2026-09-11
