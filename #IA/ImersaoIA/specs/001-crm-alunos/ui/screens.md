# Telas (Wireframes) — CRM de Alunos

## Índice de Telas

1. [Login](#login)
2. [Dashboard](#dashboard)
3. [Listagem de Alunos](#listagem-de-alunos)
4. [Detalhe do Aluno](#detalhe-do-aluno)
5. [Gestão de Cursos](#gestão-de-cursos)
6. [Pipeline de Vendas (Kanban)](#pipeline-de-vendas-kanban)
7. [Tarefas e Follow-ups](#tarefas-e-follow-ups)
8. [Configurações](#configurações)
9. [Importação de Alunos](#importação-de-alunos)

---

## Login

```
┌─────────────────────────────────────────┐
│                                         │
│             CRM ADRIANO                 │
│        Gestão de Alunos e Vendas        │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  Email                           │   │
│  │  [email@example.com____________] │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  Senha                           │   │
│  │  [••••••••••••••••••••••••••••] │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ☐ Lembrar de mim                       │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │      [ Entrar ]                  │   │
│  └──────────────────────────────────┘   │
│                                         │
│  Esqueceu a senha?                      │
│                                         │
└─────────────────────────────────────────┘
```

**Elementos**:
- Logo/Nome do sistema
- Campo de Email (required)
- Campo de Senha (required)
- Link "Esqueceu a senha?"
- Botão "Entrar" (primary color)
- Checkbox "Lembrar de mim" (opcional)

**Validações**:
- Email: formato válido
- Senha: mínimo 6 caracteres
- Erro: exibir toast vermelho "Email ou senha incorretos"

**Redirecionamento**: Após login bem-sucedido → `/dashboard`

---

## Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  CRM  [≡] Adriano                        [😊] Admin [v]      │
├─────────────────────────────────────────────────────────────┤
│  Dashboard                                                   │
│  [Home] [Alunos] [Cursos] [Pipeline] [Tarefas] [Config]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Período: [Últimos 30 dias ▼]  [Custom Range]              │
│                                                              │
│  ┌───────────────────┐  ┌───────────────────┐               │
│  │  Total de Alunos  │  │  Alunos Novos     │               │
│  │  3.000            │  │  150              │               │
│  │  ↑ 5% vs mês ant. │  │  (este mês)       │               │
│  └───────────────────┘  └───────────────────┘               │
│                                                              │
│  ┌───────────────────┐  ┌───────────────────┐               │
│  │  Receita Total    │  │  Taxa de Atividade│               │
│  │  R$ 1.287.450     │  │  42%              │               │
│  │  ↑ 12% vs mês ant.│  │  (últimos 30 dias)│               │
│  └───────────────────┘  └───────────────────┘               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Alunos por Curso                                     │   │
│  │                                                      │   │
│  │  Imersão IA ████████████████ 850 (28%)              │   │
│  │  Node.js    ████████████████████ 1.550 (52%)        │   │
│  │  Delphi     ██████████ 600 (20%)                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Receita por Mês (últimos 6 meses)                   │   │
│  │                                                      │   │
│  │  [Gráfico de barras: valores por mês]               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Elementos Principais**:
- **Header**: Logo, user menu (logout), settings
- **Navigation**: Menu lateral com links
- **KPI Cards**: 4 cards com métricas principais (grande font, destaque)
- **Gráfico de Barras**: Alunos por curso (Recharts ou similar)
- **Gráfico de Linhas**: Receita por mês
- **Filtro de Período**: Dropdown com opções (7 dias, 30 dias, 90 dias, custom)

**Responsividade**:
- Desktop (1200px+): 2 colunas de cards, gráficos lado a lado
- Tablet (768px): 2 cards por linha, gráficos empilhados
- Mobile (< 768px): 1 card por linha, gráficos empilhados

**Interatividade**:
- Hover em card → sombra aumenta
- Clique em card → opção de drill-down (ex.: "Ver todos os alunos da IA")
- Filtro de período → gráficos se atualizam em tempo real

---

## Listagem de Alunos

```
┌─────────────────────────────────────────────────────────────┐
│  CRM  [≡] Adriano                        [😊] Admin [v]      │
├─────────────────────────────────────────────────────────────┤
│  Alunos                                                      │
│  [Home] [Alunos] [Cursos] [Pipeline] [Tarefas] [Config]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [🔍 Buscar por nome ou email_____] [+ Novo Aluno]         │
│                                                              │
│  Filtros: [Status ▼] [Curso ▼] [Vendedor ▼]  [x limpar]    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Nome    │ Email              │ Telefone │ CPF │ Status│   │
│  ├──────────────────────────────────────────────────────┤   │
│  │João S.  │joao@email.com      │98765-4321│12345│ ✓     │   │
│  │Maria S. │maria@email.com     │99999-8888│98765│ ✓     │   │
│  │Pedro O. │pedro@email.com     │97777-6666│54321│ ✓     │   │
│  │Ana L.   │ana@email.com       │98888-5555│11111│ -     │   │
│  │...      │...                 │...       │...  │ ...   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Página 1 de 60  [< Anterior] [1] [2] [3]... [Próximo >]   │
│  Mostrando 50 de 3.000 registros                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Elementos**:
- **Search bar**: Busca por nome ou email (debounce 300ms)
- **Filtros**: Status, Curso, Vendedor (dropdowns, multi-select)
- **Botão de Ação**: "+ Novo Aluno" (primary color)
- **Tabela**: Colunas: Nome, Email, Telefone, CPF, Status, Ações (edit/delete/view)
- **Paginação**: Page numbers + setas, com info de total de registros

**Interatividade**:
- Clique em linha → abre detalhe do aluno
- Ícone de edição → abre form inline ou modal
- Ícone de delete → confirmação
- Sort: clique no header da coluna para ordenar

---

## Detalhe do Aluno

```
┌─────────────────────────────────────────────────────────────┐
│  CRM  [≡] Adriano                        [😊] Admin [v]      │
├─────────────────────────────────────────────────────────────┤
│  Alunos > João Silva                                         │
│  [Home] [Alunos] [Cursos] [Pipeline] [Tarefas] [Config]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [✎ Editar] [💬 Enviar Email] [📋 Nova Tarefa] [🗑 Deletar]  │
│                                                              │
│  ┌─────────────────────────────────┐                         │
│  │  João Silva                 [✏] │                         │
│  │                                 │                         │
│  │  Email: joao@email.com      [✏] │                         │
│  │  Telefone: +55 11 98765-4321[✏] │                         │
│  │  CPF: 123.456.789-01        [✏] │                         │
│  │  Status: Ativo              [✏] │                         │
│  │  Atribuído a: João Vendedor [✏] │                         │
│  │                                 │                         │
│  └─────────────────────────────────┘                         │
│                                                              │
│  ┌─────────────────────────────────┐                         │
│  │ Cursos Comprados                │                         │
│  ├─────────────────────────────────┤                         │
│  │ Imersão em IA    R$ 297  01/09  │                         │
│  │ Delphi Avançado  R$ 497  10/09  │                         │
│  │ [+ Adicionar Curso]             │                         │
│  └─────────────────────────────────┘                         │
│                                                              │
│  ┌─────────────────────────────────┐                         │
│  │ Oportunidades (Pipeline)        │                         │
│  ├─────────────────────────────────┤                         │
│  │ Lead: R$ 500 (Prospecting)      │                         │
│  │ Lead: R$ 750 (Negotiation)      │                         │
│  └─────────────────────────────────┘                         │
│                                                              │
│  ┌─────────────────────────────────┐                         │
│  │ Tarefas Pendentes               │                         │
│  ├─────────────────────────────────┤                         │
│  │ ☐ Ligar para João       15/09   │                         │
│  │ ☐ Enviar material       18/09   │                         │
│  └─────────────────────────────────┘                         │
│                                                              │
│  ┌─────────────────────────────────┐                         │
│  │ Anotações                   [✏] │                         │
│  ├─────────────────────────────────┤                         │
│  │ Interessado em IA, tem     dúvidas na aula 3...           │
│  │                                 │                         │
│  └─────────────────────────────────┘                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Elementos**:
- **Header**: Nome do aluno, breadcrumb
- **Ações**: Editar, Enviar E-mail, Nova Tarefa, Deletar (buttons no topo)
- **Card de Dados Pessoais**: Nome, Email, Telefone, CPF, Status, Atribuído a (cada linha editável inline)
- **Card de Cursos**: Lista de cursos comprados com data e valor, botão "+ Adicionar Curso"
- **Card de Oportunidades**: Leads/pipeline com status e valor
- **Card de Tarefas**: Tarefas pendentes do aluno
- **Card de Anotações**: Texto livre, editável

**Interatividade**:
- Inline edit: clique no valor, edita, salva ao sair
- Adicionar curso: abre modal com dropdown de cursos
- Nova tarefa: abre modal de criação
- Clique em lead: abre detalhe do lead

---

## Gestão de Cursos

```
┌─────────────────────────────────────────────────────────────┐
│  CRM  [≡] Adriano                        [😊] Admin [v]      │
├─────────────────────────────────────────────────────────────┤
│  Cursos                                                      │
│  [Home] [Alunos] [Cursos] [Pipeline] [Tarefas] [Config]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [+ Novo Curso]                                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Curso             │ Descrição │ Preço    │ Status     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Imersão em IA     │ Aprenda... │ R$ 297  │ ✓ Ativo   │   │
│  │ Delphi Avançado   │ Técnicas...│ R$ 497  │ ✓ Ativo   │   │
│  │ Node.js Master    │ Backend... │ R$ 397  │ ✓ Ativo   │   │
│  │ (curso arquivado) │ Old stuff  │ R$ 0    │ - Inativo │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Elementos**:
- Botão "+ Novo Curso"
- Tabela: Curso, Descrição (truncada), Preço, Status, Ações (edit/archive/delete)

---

## Pipeline de Vendas (Kanban)

```
┌─────────────────────────────────────────────────────────────┐
│  CRM  [≡] Adriano                        [😊] Admin [v]      │
├─────────────────────────────────────────────────────────────┤
│  Pipeline de Vendas                                          │
│  [Home] [Alunos] [Cursos] [Pipeline] [Tarefas] [Config]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Filtro: [Vendedor: Todos ▼] [Período: Mês ▼]              │
│                                                              │
│  PROSPECTING       NEGOTIATION       SOLD         LOST       │
│  (10 leads)        (5 leads)         (2 leads)    (1 lead)   │
│  ┌────────────┐    ┌────────────┐    ┌─────────┐ ┌────────┐│
│  │João Silva  │    │Maria S.    │    │Pedro O. │ │Ana L.  ││
│  │R$ 500      │    │R$ 750      │    │R$ 1.200│ │Sem int.││
│  │Pros...     │    │01/09       │    │Vendido │ │       ││
│  │[→]         │    │[→]         │    │[→]     │ │[x]     ││
│  └────────────┘    └────────────┘    └─────────┘ └────────┘│
│  ┌────────────┐    ┌────────────┐    ┌─────────┐           │
│  │Ana C.      │    │Carlos M.   │    │Beatriz  │           │
│  │R$ 600      │    │R$ 400      │    │R$ 2.000│           │
│  │[→]         │    │[→]         │    │[→]     │           │
│  └────────────┘    └────────────┘    └─────────┘           │
│  ┌────────────┐                                             │
│  │Daniel F.   │                                             │
│  │R$ 300      │                                             │
│  │[→]         │                                             │
│  └────────────┘                                             │
│                                                              │
│  Total: R$ 3.750  | R$ 1.150  | R$ 3.200 | R$ 0            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Elementos**:
- **Colunas Kanban**: Prospecting, Negotiation, Sold, Lost
- **Cards**: Nome do aluno, valor, data, ícone de ação (expand)
- **Drag & Drop**: Mover card entre colunas para mudar status
- **Total por Coluna**: Soma dos valores em cada estágio
- **Filtros**: Vendedor, período

**Interatividade**:
- Drag & drop atualiza status
- Hover em card → destaca
- Clique em card → exibe detalhe em modal
- Duplo clique em valor → edita inline

---

## Tarefas e Follow-ups

```
┌─────────────────────────────────────────────────────────────┐
│  CRM  [≡] Adriano                        [😊] Admin [v]      │
├─────────────────────────────────────────────────────────────┤
│  Tarefas                                                     │
│  [Home] [Alunos] [Cursos] [Pipeline] [Tarefas] [Config]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [+ Nova Tarefa]                                            │
│                                                              │
│  Filtro: [Status: Pendentes ▼] [Prioridade: Todas ▼]       │
│                                                              │
│  VENCIDAS (2)                                               │
│  ┌─────────────────────────────────┐                        │
│  │ ☐ Ligar para João       15/09   │ HOJE AINDA!           │
│  │ ☐ Confirmar pagamento   10/09   │ VENCEU 1 DIA          │
│  └─────────────────────────────────┘                        │
│                                                              │
│  HOJE (1)                                                   │
│  ┌─────────────────────────────────┐                        │
│  │ ☐ Enviar material       11/09   │                        │
│  └─────────────────────────────────┘                        │
│                                                              │
│  PRÓXIMOS DIAS (5)                                          │
│  ┌─────────────────────────────────┐                        │
│  │ ☐ Follow-up com Maria   12/09   │                        │
│  │ ☐ Enviar proposta       14/09   │                        │
│  │ ☐ Agendar reunião       15/09   │                        │
│  │ ☐ Revisar contrato      16/09   │                        │
│  │ ☐ Enviar certificado    18/09   │                        │
│  └─────────────────────────────────┘                        │
│                                                              │
│  CONCLUÍDAS (12)                                            │
│  ┌─────────────────────────────────┐                        │
│  │ ☑ Confirmar presença    08/09   │ Concluída há 3 dias   │
│  │ ☑ Enviar boas-vindas    07/09   │ Concluída há 4 dias   │
│  └─────────────────────────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Elementos**:
- **Botão "+ Nova Tarefa"**
- **Grupos por Status**: Vencidas (vermelho), Hoje, Próximos Dias, Concluídas (cinza)
- **Cards de Tarefa**: Checkbox, Título, Data de vencimento, Status visual
- **Filtros**: Status, Prioridade
- **Ações**: Marcar concluída, editar, deletar

**Interatividade**:
- Checkbox → marca como concluída (move para seção)
- Clique em tarefa → abre detalhe/edição
- Drag & drop entre seções? (opcional)
- Badge de notificação: "2 tarefas vencidas"

---

## Configurações

```
┌─────────────────────────────────────────────────────────────┐
│  CRM  [≡] Adriano                        [😊] Admin [v]      │
├─────────────────────────────────────────────────────────────┤
│  Configurações                                               │
│  [Home] [Alunos] [Cursos] [Pipeline] [Tarefas] [Config]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Usuários] [Importação] [Empresa] [Segurança]             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Usuários da Equipe                                  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Email             │ Nome      │ Papel      │ Status │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ you@example.com   │ Admin     │ Admin      │ ✓      │   │
│  │ ceo@example.com   │ CEO Name  │ CEO        │ ✓      │   │
│  │ vend@example.com  │ Vendedor  │ Vendedor   │ ✓      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [+ Novo Usuário]                                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Importação de Alunos                                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ [📁 Selecionar arquivo CSV]                         │   │
│  │ Formato esperado: nome, email, telefone, cpf       │   │
│  │                                                     │   │
│  │ [Preview (5 primeiras linhas)]                      │   │
│  │ [Importar]  [Cancelar]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Elementos**:
- **Tabs**: Usuários, Importação, Empresa, Segurança
- **Gerenciamento de Usuários**: Tabela com email, nome, papel, status + botão "+ Novo"
- **Importação**: Upload de arquivo, preview, botão de import

---

## Importação de Alunos

```
┌─────────────────────────────────────────────────────────────┐
│  CRM  [≡] Adriano                        [😊] Admin [v]      │
├─────────────────────────────────────────────────────────────┤
│  Importação de Alunos                                        │
│  [Home] [Alunos] [Cursos] [Pipeline] [Tarefas] [Config]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PASSO 1: UPLOAD DE ARQUIVO                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  [📁 SELECIONE O ARQUIVO CSV]                       │   │
│  │                                                     │   │
│  │  (ou arraste aqui)                                  │   │
│  │                                                     │   │
│  │  Colunas esperadas: nome, email, telefone, cpf    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  PASSO 2: REVIEW & VALIDAÇÃO                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Preview (5 de 3.000 registros)                      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ nome            │ email          │ telefone │ cpf   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ João Silva      │ joao@... ✓     │98765... │ ✓    │   │
│  │ Maria Santos    │ maria@... ✓    │99999... │ ✓    │   │
│  │ Pedro Oliveira  │ pedro@... ⚠    │97777... │ ⚠    │   │
│  │ Ana Lima        │ ana@...   ✓    │98888... │ ✓    │   │
│  │ Carlos Mendes   │ (inválido) ✗   │96666... │ ✓    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ⚠  3 registros têm problemas (duplicatas ou inválidos)    │
│  ✓  2.997 registros estão prontos para importar            │
│                                                              │
│  [← Voltar] [Importar 2.997 alunos →]                      │
│                                                              │
│  PASSO 3: PROGRESSO                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Importando... 1.500 de 2.997 (50%)                 │   │
│  │  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │                                                     │   │
│  │  Tempo estimado: 2 min                              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ✓ IMPORTAÇÃO CONCLUÍDA                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ 2.997 alunos importados com sucesso              │   │
│  │ ⚠  3 registros falharam (verifique a lista)         │   │
│  │                                                     │   │
│  │ [Baixar Relatório] [Ir para Alunos] [Fechar]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Elementos**:
- **Passo 1**: Upload via drag & drop ou click
- **Passo 2**: Preview das primeiras linhas, validação com ícones (✓, ⚠, ✗)
- **Passo 3**: Barra de progresso com % e tempo estimado
- **Resultado**: Resumo (sucesso/falhas) + downloads de relatório

**Interatividade**:
- Drag & drop funcional
- Click para selecionar arquivo
- Preview atualiza após seleção
- Progresso em tempo real (WebSocket ou polling)
- Botão de download do relatório de erros (CSV)

---

## Padrões de Design

### Cores Primárias
- **Primária**: #2563EB (Azul)
- **Sucesso**: #10B981 (Verde)
- **Alerta**: #F59E0B (Amarelo)
- **Erro**: #EF4444 (Vermelho)
- **Neutro**: #6B7280 (Cinza)

### Tipografia
- **Header**: Títulos grandes (H1 32px)
- **Subtítulo**: 18px
- **Body**: 14px
- **Small**: 12px

### Componentes Reutilizáveis
- **Button**: Primary (azul), Secondary (cinza), Danger (vermelho)
- **Card**: Sombra leve, border-radius 8px
- **Modal**: Overlay escuro, centered, close button
- **Toast**: Notificação no canto inferior direito
- **Badge**: Status com cores (sucesso, alerta, erro)
- **Pagination**: Números + setas

### Responsividade
- **Breakpoints**:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

---

**Versão**: 1.0  
**Data**: 2026-09-11  
**Status**: Pronto para design e prototipagem
