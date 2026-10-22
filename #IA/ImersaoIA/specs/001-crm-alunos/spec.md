# Especificação — CRM Interno para Gestão de Alunos

## Problema

Você está pagando assinatura de CRM e quer um sistema próprio para eliminar esse custo recorrente. Atualmente, o CRM pago gerencia seus alunos dos cursos, mas você quer ter controle total sobre a ferramenta e os dados.

## Usuários

- **Admin (você)**: acesso total, gestão de dados, configuração de usuários, visualização de todos os alunos
- **CEO**: acesso a métricas e relatórios (escopo de acesso em definição)
- **1 Vendedor**: acesso a alunos e pipeline de vendas (escopo de acesso em definição)
- **Equipe total**: ~10 pessoas (das quais 3 mencionadas acima; demais usarão a plataforma conforme perfis a definir)

**Tipo de cliente**: Alunos dos seus cursos online.

## Funcionalidades

### Essenciais (MVP)

- **Cadastro de Alunos**: nome, e-mail, telefone, CPF, data de cadastro, status (ativo, inativo, pausado)
- **Gestão de Cursos/Compras**: registrar quais cursos cada aluno comprou, data da compra, valor
- **Pipeline de Vendas / Funil**: leads em diferentes estágios (prospecting, negociação, vendido, perdido)
- **Tarefas e Follow-up**: criar lembretes de ação, atribuir a usuários, acompanhar prazos
- **Dashboard Básico**: 
  - Total de alunos cadastrados
  - Alunos por curso
  - Alunos novos (este mês/semana)
  - Receita total / vendas
  - Taxa de atividade dos alunos
- **Importação de Dados**: upload/importação manual de alunos (CSV ou similar); sem integração automática com Hotmart
- **Envio de E-mail**: disparar e-mails para alunos (sem automação em massa, sem WhatsApp)
- **Relatórios e Filtros**: visualizar alunos por curso, por status, por vendedor, com possibilidade de exportar

### Fora do Escopo (Versão 1)

- Integração automática com Hotmart
- Envio de WhatsApp ou SMS automático
- Sistema de comissões ou cálculo de bônus
- App mobile
- Histórico detalhado de contatos (ligações, e-mails, anotações por contato)
- Automação de e-mail em massa
- Integração com outras plataformas de pagamento

## Módulos

**1. Gerenciamento de Alunos**
- Cadastro, edição, exclusão de alunos
- Campos: nome, e-mail, telefone, CPF, data de cadastro, status
- Busca e filtros por status, curso, vendedor

**2. Gestão de Cursos e Compras**
- Cadastro de cursos disponíveis
- Registro de compras (qual aluno comprou qual curso, data, valor)
- Visualização de histórico de compras por aluno

**3. Pipeline de Vendas**
- Criação e gestão de leads e oportunidades
- Estágios: prospecting, negociação, vendido, perdido
- Atribuição de leads a vendedores

**4. Tarefas e Follow-up**
- Criação de tarefas (admin e vendedores)
- Atribuição a usuários
- Marcação de conclusão
- Lembretes (data/hora)

**5. Dashboard e Relatórios**
- Painel inicial com KPIs principais
- Gráficos de alunos por curso, receita, novos alunos
- Relatórios exportáveis (CSV/PDF)
- Filtros por período, curso, vendedor

**6. Configuração e Usuários**
- Gestão de permissões (admin, CEO, vendedor)
- Configuração de perfis de acesso (em definição)
- Auditoria básica de ações

## Stack Técnica

- **Frontend**: React (TypeScript, CSS-in-JS ou Tailwind)
- **Backend**: Node.js + Express
- **Banco de Dados**: PostgreSQL
- **Hosting**: Vercel (frontend + backend)
- **Autenticação**: JWT + bcrypt próprio, token em cookie HttpOnly (conforme a constitution)

## Constraints Técnicas

- **Prazo**: Imediato (implementação deve começar hoje/ASAP)
- **Volume de Dados**: ~3.000 alunos cadastrados na migração inicial
- **Performance**: Suportar carregamento de 3.000 registros com filtros responsivos
- **Segurança**: Controle de acesso baseado em perfis (RBAC)
- **Integração**: Sem dependências externas no MVP (sem Hotmart, WhatsApp, etc.)
- **Manutenção**: Sistema deve ser mantível apenas por você ou pela equipe (sem complexidade desnecessária)

## Critérios de Aceitação

- [ ] **Importação**: 3.000 alunos importados e visíveis na plataforma
- [ ] **Dashboard**: Exibindo total de alunos, alunos por curso, alunos novos, receita e atividade
- [ ] **Tarefas**: Admin consegue criar, atribuir e acompanhar tarefas de follow-up
- [ ] **Perfis de Acesso**: Admin tem acesso total; CEO e vendedor têm acesso definido (decisão em aberto)
- [ ] **Usabilidade**: Interface intuitiva para que 10 pessoas usem sem treinamento complexo
- [ ] **Estabilidade**: Sem erros críticos em fluxo normal de uso
- [ ] **Pronto para produção**: Você consegue cancelar o CRM atual e migrar para este sistema

---

## Decisões em Aberto

1. ~~**Perfis de Acesso**~~ — **Resolvido** na feature 002: vale a proposta da constitution (ver `specs/002-login-perfis/spec.md`).
2. ~~**Autenticação**~~ — **Resolvido**: JWT + bcrypt próprio, token em cookie HttpOnly; backend em Express.
3. **Exportação**: Formatos suportados na exportação de relatórios (CSV, PDF, Excel)?
4. **Histórico de Contatos**: Será implementado em versão 2 ou pode ser descartado?
5. **Notificações**: Sistema de notificações em tempo real (push, e-mail) para tarefas vencidas?

---

## Cenários de Usuário (Casos de Uso)

### Visão Geral

Este documento descreve os principais fluxos de interação do usuário com o sistema CRM, mapeando o que cada ator faz e como o sistema responde.

---

### Atores

- **Admin** (você): controle total, importação de dados, configuração
- **CEO**: visualização de métricas, relatórios
- **Vendedor**: gestão de leads, tarefas, contatos com alunos

---

### Casos de Uso Principais

#### UC-1: Autenticar e Acessar o Sistema

**Ator**: Admin, CEO, Vendedor  
**Descrição**: Usuário faz login e acessa o dashboard

**Fluxo Principal**:
1. Usuário acessa `https://crm.example.com/login`
2. Preenche email e senha
3. Sistema valida credenciais contra BD
4. Se válido: gera JWT e redireciona para `/dashboard`
5. Se inválido: exibe erro "Email ou senha incorretos"

**Fluxo Alternativo (Primeiro Acesso)**:
- Admin recebe link de reset de senha
- Clica no link, define nova senha
- Faz login com nova senha

**Critério de Aceitação**:
- [ ] Login funciona para todos os papéis (admin, ceo, vendedor)
- [ ] Sessão persiste por 24h (ou até logout)
- [ ] Logout limpa token do navegador

---

#### UC-2: Importar Alunos em Lote

**Ator**: Admin  
**Descrição**: Importar 3.000 alunos de um arquivo CSV

**Fluxo Principal**:
1. Admin acessa `/settings/import`
2. Clica em "Upload CSV"
3. Seleciona arquivo com colunas: `nome, email, telefone, cpf`
4. Sistema valida formato e mostra preview das primeiras 5 linhas
5. Admin confirma "Importar"
6. Sistema inicia bulk insert no BD (transação)
7. Exibe progresso: "Importando... 500/3000"
8. Ao concluir: "3.000 alunos importados com sucesso"
9. Dashboard atualiza contagem

**Fluxo de Erro**:
- Arquivo inválido (not CSV) → "Formato não suportado"
- Linha com CPF duplicado → "Linha 42: CPF já existe. Pulando."
- Email inválido → "Linha 15: Email inválido"

**Critério de Aceitação**:
- [ ] Import suporta até 10.000 registros
- [ ] Valida CPF e email antes de inserir
- [ ] Não falha se houver alguns registros inválidos (continua com válidos)
- [ ] Relatório final mostra: sucesso, falhas, duplicatas
- [ ] Dados aparecem em Students dentro de segundos

---

#### UC-3: Visualizar Dashboard de Métricas

**Ator**: Admin, CEO, Vendedor  
**Descrição**: Ver resumo das principais KPIs

**Fluxo Principal**:
1. Usuário acessa `/dashboard`
2. Sistema carrega dados do endpoint `/api/dashboard/metrics`
3. Exibe cards com:
   - **Total de Alunos**: 3.000
   - **Alunos Novos (este mês)**: 150
   - **Receita Total**: R$ 1.287.450
   - **Alunos por Curso** (gráfico de barras): IA (850), Delphi (600), Node.js (1.550)
   - **Taxa de Atividade** (% de alunos que acessaram nos últimos 30 dias): 42%
4. Usuário pode filtrar por período (últimos 7 dias, 30 dias, 90 dias, custom)
5. Ao mudar filtro, gráficos se atualizam

**Fluxo de Acesso Restrito** (Vendedor):
- Vendedor vê apenas: alunos atribuídos a ele, suas tarefas, seus leads

**Critério de Aceitação**:
- [ ] Dashboard carrega em < 2 segundos
- [ ] Gráficos são responsivos (mobile, tablet, desktop)
- [ ] Filtros de período funcionam
- [ ] Vendedor vê apenas seus dados (RBAC ativo)

---

#### UC-4: Gerenciar Alunos (CRUD)

**Ator**: Admin, Vendedor  
**Descrição**: Criar, editar, visualizar, deletar alunos

##### UC-4.1: Visualizar Lista de Alunos

**Fluxo**:
1. Usuário acessa `/students`
2. Sistema exibe tabela com colunas: `Nome | Email | Telefone | CPF | Status | Cursos | Ações`
3. Usuário pode:
   - **Buscar**: campo de search por nome ou email (debounce 300ms)
   - **Filtrar**: por status (ativo, inativo, pausado), por curso, por vendedor
   - **Paginar**: 50 alunos por página
   - **Ordenar**: por nome, data de cadastro, status
4. Clica em um aluno → abre detalhe em modal ou nova página

**Critério de Aceitação**:
- [ ] Listagem carrega em < 2 segundos
- [ ] Busca é responsiva (sem lag)
- [ ] Filtros funcionam em combinação
- [ ] Paginação não volta para página 1 ao ordenar

##### UC-4.2: Visualizar Detalhe do Aluno

**Fluxo**:
1. Admin/Vendedor abre detalhe de um aluno (clicando na linha ou abrindo `/students/{id}`)
2. Exibe card com:
   - Nome, Email, Telefone, CPF, Status
   - Cursos comprados (com datas e valores)
   - Leads/Oportunidades associadas
   - Tarefas pendentes
   - Anotações gerais
3. Usuário pode editar campo diretamente (inline edit) ou clicar "Editar"
4. Ao clicar "Nova Tarefa", abre form de criação de task

**Critério de Aceitação**:
- [ ] Todos os dados carregam corretamente
- [ ] Edição em linha (inline) salva ao perder foco
- [ ] Histórico de alterações é rastreado (quem editou, quando)

##### UC-4.3: Criar/Editar Aluno

**Fluxo**:
1. Admin clica "+ Novo Aluno" ou abre modal de edição
2. Preenche formulário:
   - Nome (required)
   - Email (required, unique)
   - Telefone (optional)
   - CPF (optional, unique se preenchido)
   - Status (dropdown: ativo, inativo, pausado)
   - Atribuído a (dropdown de vendedores/admin)
3. Clica "Salvar"
4. Sistema valida e insere/atualiza no BD
5. Exibe toast "Aluno salvo com sucesso"

**Critério de Aceitação**:
- [ ] Validação de email (formato válido)
- [ ] Validação de CPF (formato, dígito verificador)
- [ ] Não permite email duplicado
- [ ] Form salva draft se usuário sair sem submeter (localStorage)

##### UC-4.4: Deletar Aluno

**Fluxo**:
1. Admin clica botão "Deletar" em detalhe ou na linha
2. Modal de confirmação: "Tem certeza? Todas as tarefas associadas serão deletadas."
3. Se confirma: deleta aluno (cascata para purchases, pipeline_leads, tasks)
4. Toast: "Aluno deletado"

**Critério de Aceitação**:
- [ ] Vendedor NÃO consegue deletar aluno (apenas admin)
- [ ] Dados associados são deletados corretamente (referential integrity)

---

#### UC-5: Gerenciar Cursos

**Ator**: Admin  
**Descrição**: Manter lista de cursos disponíveis

**Fluxo Principal**:
1. Admin acessa `/courses`
2. Exibe tabela: `Nome | Descrição | Preço | Status | Ações`
3. Pode:
   - Criar novo curso: `/courses/new`
   - Editar: clica em curso
   - Deletar: com confirmação (fail se houver purchases, ou cascata?)
4. Formulário: nome (required), descrição, preço (required)

**Critério de Aceitação**:
- [ ] CRUD funciona
- [ ] Preço aceita até 2 casas decimais
- [ ] Não permite deletar curso que tem compras (ou cascata com confirmação)

---

#### UC-6: Registrar Compra de Aluno

**Ator**: Admin, Vendedor  
**Descrição**: Associar aluno a um curso (registrar compra)

**Fluxo Principal**:
1. Admin abre detalhe do aluno → seção "Cursos"
2. Clica "+ Adicionar Curso"
3. Abre modal com dropdown de cursos
4. Seleciona curso → preenche:
   - Data da compra (default: hoje)
   - Valor (default: preço do curso, mas permite editar)
   - Notas (cupom, promoção, etc.)
5. Clica "Salvar"
6. Insere em purchases table
7. Atualiza lista de cursos do aluno

**Fluxo Alternativo (Import)**:
- Via bulk import CSV (UC-2)

**Critério de Aceitação**:
- [ ] Não permite aluno comprar mesmo curso 2x (validação)
- [ ] Data da compra não pode ser futura
- [ ] Valor é refletido no dashboard (receita total)

---

#### UC-7: Gerenciar Pipeline de Vendas

**Ator**: Admin, Vendedor  
**Descrição**: Acompanhar leads em diferentes estágios

**Fluxo Principal** (Kanban/Board):
1. Vendedor acessa `/pipeline`
2. Exibe colunas: `Prospecting | Negotiation | Sold | Lost`
3. Cada coluna mostra cards de leads/alunos
4. Pode:
   - **Drag & drop**: mover lead entre estágios
   - **Clicar no card**: abre detalhe (aluno, valor, data de criação)
   - **Editar**: valor estimado, notas, razão de perda (se lost)
5. Filtros: por vendedor, por período

**Fluxo Alternativo (List View)**:
- View em tabela em vez de Kanban (para quem prefere)

**Critério de Aceitação**:
- [ ] Drag & drop atualiza status em tempo real (ou com save explícito)
- [ ] Lead "Sold" é refletido como compra? (decidir: automático ou manual?)
- [ ] Vendedor vê apenas seus próprios leads
- [ ] CEO vê todos os leads

---

#### UC-8: Criar e Gerenciar Tarefas (Follow-up)

**Ator**: Admin, Vendedor  
**Descrição**: Lembrar-se de ações (ligar, enviar email, etc.)

**Fluxo Principal** (Criar Tarefa):
1. Usuário clica "+ Nova Tarefa" em qualquer contexto (dashboard, detalhe do aluno, pipeline)
2. Abre modal/form com:
   - Título (required): ex. "Ligar para João sobre dúvida no Curso"
   - Descrição (optional)
   - Relacionada a (aluno, lead, curso) — auto-preenchida se contexto
   - Atribuída a (dropdown de usuários)
   - Prioridade (low, normal, high)
   - Data/Hora de vencimento (date + time picker)
3. Clica "Criar"
4. Insere em tasks table, exibe toast

**Fluxo de Visualização** (Minhas Tarefas):
1. Usuário acessa `/tasks`
2. Exibe lista de tarefas atribuídas a ele (com filtros)
3. Tarefas organizadas por:
   - Status: pendentes, concluídas
   - Prioridade: high, normal, low
   - Vencimento: hoje, amanhã, próxima semana, vencidas
4. Pode:
   - Marcar como concluída (checkbox ou botão)
   - Editar (reabrir form)
   - Deletar

**Fluxo Alternativo** (Notificação de Tarefa Vencida):
- Se tarefa vence em 1h, badge no ícone de tarefas
- Notificação local (browser notification, se permissão)

**Critério de Aceitação**:
- [ ] Tarefas pendentes aparecem em realce (cor, ícone)
- [ ] Tarefas vencidas ficam em vermelho
- [ ] Usuário vê apenas suas tarefas (RBAC)
- [ ] Marcar como concluída atualiza UI imediatamente
- [ ] Deletar tarefa pede confirmação

---

#### UC-9: Enviar E-mail para Aluno

**Ator**: Admin, Vendedor  
**Descrição**: Disparar e-mail para um ou mais alunos

**Fluxo Principal**:
1. Admin acessa `/students` → seleciona aluno → clica "Enviar E-mail"
2. Abre modal com:
   - Para: email do aluno (preenchido)
   - Assunto (required)
   - Corpo (rich text editor, optional)
   - Templates (dropdown de templates salvos)
3. Clica "Enviar"
4. Backend valida, envia via SMTP, retorna confirmação
5. Toast: "E-mail enviado para joao@email.com"

**Fluxo Alternativo** (Bulk):
- Selecionar múltiplos alunos → "Enviar E-mail para 15 alunos"
- Form permite personalização (merge tags: {{nome}}, {{curso}}, etc.)

**Critério de Aceitação**:
- [ ] E-mail é enviado (simulado em dev, real em prod)
- [ ] Não permite e-mail sem assunto
- [ ] Registro de envio é salvo em log (auditoria)
- [ ] Sem automação de campanha (não é marketing automation)

---

#### UC-10: Configurar Usuários e Permissões

**Ator**: Admin  
**Descrição**: Gerenciar equipe e papéis de acesso

**Fluxo Principal**:
1. Admin acessa `/settings/users`
2. Exibe tabela de usuários: `Nome | Email | Role | Status | Ações`
3. Pode:
   - **Criar**: clica "+ Novo Usuário"
     - Preenche: nome, email, role (admin, ceo, vendedor)
     - Sistema gera senha temporária e envia por email
     - Usuário reseta senha no primeiro login
   - **Editar**: muda role ou desativa usuário
   - **Deletar**: com confirmação (fail se houver tarefas assinaladas)
4. Salva alterações

**Fluxo de Permissões** (RBAC):
| Ação | Admin | CEO | Vendedor |
|------|-------|-----|----------|
| Ver todos os alunos | ✓ | ✓ | ✗ (só seus) |
| Importar alunos | ✓ | ✗ | ✗ |
| Ver dashboard completo | ✓ | ✓ | ✗ (só seus dados) |
| Criar/editar tarefas | ✓ | ✓ | ✓ |
| Gerenciar usuários | ✓ | ✗ | ✗ |
| Criar cursos | ✓ | ✗ | ✗ |

**Critério de Aceitação**:
- [ ] RBAC é enforçada no backend (não apenas UI)
- [ ] Vendedor não consegue ver alunos de outro vendedor
- [ ] CEO consegue ver tudo mas não pode criar usuários

---

#### UC-11: Filtrar e Exportar Relatórios

**Ator**: Admin, CEO  
**Descrição**: Gerar relatórios em CSV/PDF

**Fluxo Principal**:
1. Usuário acessa página de alunos, cursos, ou pipeline
2. Configura filtros: período, status, vendedor, curso
3. Clica "Exportar"
4. Seleciona formato: CSV ou PDF
5. Sistema compila dados e download começa
6. Arquivo: `alunos_2026-09-11.csv` (ou PDF)

**Critério de Aceitação**:
- [ ] Export respeita filtros aplicados
- [ ] CSV é aberto corretamente em Excel
- [ ] PDF é formatado legível
- [ ] Exports grandes (1000+) não travam (async/background)

---

### Matriz de Prioridade

| Caso de Uso | Prioridade | Sprint |
|-------------|-----------|--------|
| UC-1: Autenticar | **ALTA** | 1 |
| UC-2: Importar Alunos | **ALTA** | 1 |
| UC-3: Dashboard | **ALTA** | 1 |
| UC-4: Gerenciar Alunos (CRUD) | **ALTA** | 1 |
| UC-5: Gerenciar Cursos | **MÉDIA** | 1 |
| UC-6: Registrar Compra | **ALTA** | 1 |
| UC-7: Pipeline de Vendas | **MÉDIA** | 2 |
| UC-8: Tarefas | **MÉDIA** | 2 |
| UC-9: Enviar E-mail | **BAIXA** | 3 |
| UC-10: Configurar Usuários | **ALTA** | 1 |
| UC-11: Exportar Relatórios | **MÉDIA** | 2 |

---

**Versão**: 1.1  
**Data**: 2026-09-11
