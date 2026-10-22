# Modelo de Dados — CRM de Alunos

> ⚠️ **Este documento é anterior à feature 002 e diverge do schema real em quatro pontos.**
> A fonte da verdade é o `prisma/schema.prisma` (migrations `auth_users` e `business_models`).
> Decisões registradas em [[sprint-6-alunos#Decisões do orquestrador (2026-09-12)|Sprint 6]]:
>
> | Aqui diz | No schema real |
> |----------|----------------|
> | `User` com `password` e `cuid()` | `User` da [[002-login-perfis/spec\|002]]: `passwordHash`, `uuid()`, `tokenVersion`, `@@map("Users")` |
> | ids com `cuid()` | `uuid()` em todos os models (S6-1) |
> | `Student.email` sem `@unique` | `@unique` — e-mail duplicado é 409 (S6-2) |
> | `Task.relatedStudent` com `onDelete: SetNull` | `onDelete: Cascade` — excluir aluno apaga as tarefas (S6-4) |
>
> Tabelas seguem a convenção da 002: `Students`, `Courses`, `Purchases`, `PipelineLeads`, `Tasks`.

## Diagrama ER (Entidade-Relacionamento)

```
┌─────────────┐
│   USERS     │
├─────────────┤
│ id (PK)     │
│ email       │◄─┐
│ password    │  │
│ name        │  │
│ role        │  │
│ created_at  │  │
│ updated_at  │  │
└─────────────┘  │
                 │
┌────────────────┼──────────────────────────────────────┐
│    STUDENTS    │                                      │
├────────────────┤                                      │
│ id (PK)        │                                      │
│ name           │                                      │
│ email          │                                      │
│ phone          │                                      │
│ cpf            │                                      │
│ status         │                                      │
│ assigned_to    │──────────────────────────────────────┘
│ created_at     │                  (assigned_to = admin responsável)
│ updated_at     │
└────────────────┘
      │
      │ 1:N
      │
┌─────▼──────────┐     ┌────────────────┐
│  PURCHASES      │────►│   COURSES      │
├─────────────────┤     ├────────────────┤
│ id (PK)         │     │ id (PK)        │
│ student_id (FK) │     │ name           │
│ course_id (FK)  │     │ description    │
│ purchase_date   │     │ price          │
│ amount          │     │ created_at     │
│ created_at      │     │ updated_at     │
└─────────────────┘     └────────────────┘

┌────────────────────┐
│  PIPELINE_LEADS    │
├────────────────────┤
│ id (PK)            │
│ student_id (FK)    │──► STUDENTS
│ status             │
│ assigned_to (FK)   │──► USERS
│ value              │
│ created_at         │
│ updated_at         │
└────────────────────┘

┌────────────────────┐
│      TASKS         │
├────────────────────┤
│ id (PK)            │
│ title              │
│ description        │
│ assigned_to (FK)   │──► USERS
│ related_to         │    (student_id ou lead_id)
│ due_date           │
│ completed_at       │
│ created_at         │
│ updated_at         │
└────────────────────┘
```

## Definição Detalhada das Tabelas

### 1. USERS

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | UUID | PRIMARY KEY | Identificador único |
| email | VARCHAR(255) | UNIQUE, NOT NULL | E-mail do usuário (login) |
| password_hash | VARCHAR(255) | NOT NULL | Senha criptografada (bcrypt) |
| name | VARCHAR(255) | NOT NULL | Nome completo |
| role | ENUM | NOT NULL | Papel: 'admin', 'ceo', 'vendedor' |
| is_active | BOOLEAN | DEFAULT true | Se o usuário está ativo |
| created_at | TIMESTAMP | DEFAULT now() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT now() | Data da última atualização |

**Índices:**
- `UNIQUE (email)`
- `INDEX (role)`
- `INDEX (is_active)`

---

### 2. STUDENTS

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | UUID | PRIMARY KEY | Identificador único |
| name | VARCHAR(255) | NOT NULL | Nome do aluno |
| email | VARCHAR(255) | NOT NULL | E-mail do aluno |
| phone | VARCHAR(20) | | Telefone (formato: +55 11 98765-4321) |
| cpf | VARCHAR(11) | UNIQUE | CPF (sem formatação) |
| status | ENUM | DEFAULT 'ativo' | Status: 'ativo', 'inativo', 'pausado' |
| assigned_to | UUID | FOREIGN KEY | User que gerencia este aluno (admin ou vendedor) |
| notes | TEXT | | Anotações gerais |
| last_contact_date | TIMESTAMP | | Última data de contato |
| created_at | TIMESTAMP | DEFAULT now() | Data de cadastro |
| updated_at | TIMESTAMP | DEFAULT now() | Data da última atualização |

**Índices:**
- `UNIQUE (email)` (permitir duplicatas? confirmar)
- `UNIQUE (cpf)`
- `INDEX (status)`
- `INDEX (assigned_to)`
- `INDEX (created_at)`
- `FULL TEXT (name, email)` (para busca)

---

### 3. COURSES

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | UUID | PRIMARY KEY | Identificador único |
| name | VARCHAR(255) | NOT NULL | Nome do curso |
| description | TEXT | | Descrição/ementa |
| price | DECIMAL(10, 2) | NOT NULL | Valor do curso |
| is_active | BOOLEAN | DEFAULT true | Curso ativo ou arquivado |
| created_at | TIMESTAMP | DEFAULT now() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT now() | Última atualização |

**Índices:**
- `INDEX (is_active)`

---

### 4. PURCHASES

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | UUID | PRIMARY KEY | Identificador único |
| student_id | UUID | FOREIGN KEY (students.id) | Aluno que comprou |
| course_id | UUID | FOREIGN KEY (courses.id) | Curso comprado |
| purchase_date | DATE | NOT NULL | Data da compra |
| amount | DECIMAL(10, 2) | NOT NULL | Valor pago |
| notes | TEXT | | Observações (cupom, promoção, etc.) |
| created_at | TIMESTAMP | DEFAULT now() | Data de registro |
| updated_at | TIMESTAMP | DEFAULT now() | Última atualização |

**Índices:**
- `INDEX (student_id)`
- `INDEX (course_id)`
- `INDEX (purchase_date)`
- `UNIQUE (student_id, course_id)` (um aluno não pode comprar o mesmo curso 2x? decidir)

---

### 5. PIPELINE_LEADS

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | UUID | PRIMARY KEY | Identificador único |
| student_id | UUID | FOREIGN KEY (students.id) | Aluno/lead |
| status | ENUM | DEFAULT 'prospecting' | Estágio: 'prospecting', 'negotiation', 'sold', 'lost' |
| assigned_to | UUID | FOREIGN KEY (users.id) | Vendedor responsável |
| value | DECIMAL(10, 2) | | Valor estimado da oportunidade |
| lost_reason | VARCHAR(255) | | Se lost: por que perdeu (opcional) |
| created_at | TIMESTAMP | DEFAULT now() | Data de criação do lead |
| updated_at | TIMESTAMP | DEFAULT now() | Última atualização |

**Índices:**
- `INDEX (student_id)`
- `INDEX (assigned_to)`
- `INDEX (status)`
- `INDEX (created_at)`

---

### 6. TASKS

| Campo | Tipo | Constraints | Descrição |
|-------|------|-------------|-----------|
| id | UUID | PRIMARY KEY | Identificador único |
| title | VARCHAR(255) | NOT NULL | Título da tarefa |
| description | TEXT | | Descrição detalhada |
| assigned_to | UUID | FOREIGN KEY (users.id) | Usuário responsável |
| related_to | UUID | | ID do recurso (student_id, lead_id, course_id) |
| related_type | VARCHAR(50) | | Tipo: 'student', 'lead', 'course' |
| priority | ENUM | DEFAULT 'normal' | Prioridade: 'low', 'normal', 'high' |
| due_date | TIMESTAMP | NOT NULL | Data/hora do vencimento |
| completed_at | TIMESTAMP | | Se concluída, quando foi |
| created_at | TIMESTAMP | DEFAULT now() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT now() | Última atualização |

**Índices:**
- `INDEX (assigned_to)`
- `INDEX (due_date)`
- `INDEX (related_to)`
- `INDEX (completed_at)`
- `INDEX (created_at DESC, assigned_to)` (para "minhas tarefas")

---

## Migrations Iniciais (Prisma)

```prisma
// schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  admin
  ceo
  vendedor
}

enum StudentStatus {
  ativo
  inativo
  pausado
}

enum LeadStatus {
  prospecting
  negotiation
  sold
  lost
}

enum TaskPriority {
  low
  normal
  high
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      UserRole
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  students      Student[]
  tasks         Task[]
  pipelineLeads PipelineLead[]
}

model Student {
  id               String   @id @default(cuid())
  name             String
  email            String
  phone            String?
  cpf              String?  @unique
  status           StudentStatus @default(ativo)
  notes            String?
  lastContactDate  DateTime?
  assignedTo       String?
  assignedToUser   User?    @relation(fields: [assignedTo], references: [id])
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  purchases      Purchase[]
  pipelineLeads  PipelineLead[]
  tasks          Task[]
}

model Course {
  id        String   @id @default(cuid())
  name      String
  description String?
  price     Decimal  @db.Decimal(10, 2)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  purchases Purchase[]
}

model Purchase {
  id            String   @id @default(cuid())
  studentId     String
  courseId      String
  purchaseDate  DateTime
  amount        Decimal  @db.Decimal(10, 2)
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  course  Course  @relation(fields: [courseId], references: [id])

  @@unique([studentId, courseId])
  @@index([studentId])
  @@index([courseId])
  @@index([purchaseDate])
}

model PipelineLead {
  id           String   @id @default(cuid())
  studentId    String
  status       LeadStatus @default(prospecting)
  assignedTo   String
  value        Decimal?  @db.Decimal(10, 2)
  lostReason   String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [assignedTo], references: [id])

  @@index([studentId])
  @@index([assignedTo])
  @@index([status])
}

model Task {
  id             String   @id @default(cuid())
  title          String
  description    String?
  assignedTo     String
  relatedTo      String?
  relatedType    String?
  priority       TaskPriority @default(normal)
  dueDate        DateTime
  completedAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  assignedUser User     @relation(fields: [assignedTo], references: [id])
  relatedStudent Student? @relation(fields: [relatedTo], references: [id], onDelete: SetNull)

  @@index([assignedTo])
  @@index([dueDate])
  @@index([relatedTo])
}
```

---

## Seed Data (Exemplos)

```sql
-- Usuários
INSERT INTO users (id, email, password_hash, name, role) VALUES
  ('user-001', 'you@example.com', '$2b$10$...', 'Você (Admin)', 'admin'),
  ('user-002', 'ceo@example.com', '$2b$10$...', 'CEO Empresa', 'ceo'),
  ('user-003', 'vendedor@example.com', '$2b$10$...', 'João Vendedor', 'vendedor');

-- Cursos
INSERT INTO courses (id, name, price) VALUES
  ('course-001', 'Imersão em IA', 297.00),
  ('course-002', 'Delphi Avançado', 497.00),
  ('course-003', 'Node.js Master', 397.00);

-- Alunos (amostra)
INSERT INTO students (id, name, email, cpf, status, assigned_to) VALUES
  ('student-001', 'João Silva', 'joao@email.com', '12345678901', 'ativo', 'user-003'),
  ('student-002', 'Maria Santos', 'maria@email.com', '98765432109', 'ativo', 'user-003');

-- Compras
INSERT INTO purchases (student_id, course_id, purchase_date, amount) VALUES
  ('student-001', 'course-001', '2026-09-01', 297.00),
  ('student-002', 'course-002', '2026-09-05', 497.00);
```

---

**Versão**: 1.0  
**Data**: 2026-09-11
