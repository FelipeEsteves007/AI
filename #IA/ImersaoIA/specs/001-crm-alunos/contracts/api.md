# Contrato da API REST — CRM de Alunos

## Base URL

```
http://localhost:3001/api     (desenvolvimento)
https://crm.example.com/api   (produção)
```

## Autenticação

O JWT é enviado pelo backend em um cookie HttpOnly no `POST /auth/login` e vale por 24h.
O navegador reenvia o cookie automaticamente; o frontend nunca lê nem armazena o token
(nada de localStorage nem header `Authorization` montado no cliente).

---

## Autenticação & Usuários

### POST /auth/login

**Descrição**: Autenticar usuário e obter JWT

**Request**:
```json
{
  "email": "admin@example.com",
  "password": "senha123"
}
```

**Response 200**:

Header: `Set-Cookie` com o JWT (HttpOnly, expira em 24h). O token não vem no corpo.

```json
{
  "user": {
    "id": "user-001",
    "email": "admin@example.com",
    "name": "Admin Name",
    "role": "admin"
  }
}
```

**Response 401**:
```json
{
  "error": "Email ou senha incorretos"
}
```

---

### POST /auth/logout

**Descrição**: Encerrar a sessão — o backend expira o cookie HttpOnly do JWT

**Request**: (vazio)

**Response 200**:
```json
{
  "message": "Logout realizado"
}
```

---

### POST /auth/reset-password

**Descrição**: Solicitar reset de senha

**Request**:
```json
{
  "email": "admin@example.com"
}
```

**Response 200**:
```json
{
  "message": "E-mail enviado com link de reset"
}
```

---

### PUT /auth/reset-password/{token}

**Descrição**: Completar reset de senha

**Request**:
```json
{
  "password": "novaSenha123",
  "passwordConfirm": "novaSenha123"
}
```

**Response 200**:
```json
{
  "message": "Senha alterada com sucesso"
}
```

---

## Alunos

### GET /students

**Descrição**: Listar alunos com filtros e paginação

**Query Params**:
```
?page=1&limit=50&status=ativo&search=joão&sortBy=name&order=asc
```

**Response 200**:
```json
{
  "data": [
    {
      "id": "student-001",
      "name": "João Silva",
      "email": "joao@email.com",
      "phone": "+55 11 98765-4321",
      "cpf": "12345678901",
      "status": "ativo",
      "assignedTo": "user-003",
      "assignedToName": "João Vendedor",
      "createdAt": "2026-09-01T10:00:00Z",
      "updatedAt": "2026-09-05T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 3000,
    "totalPages": 60
  }
}
```

**Query Params Suportados**:
- `page`: número da página (default: 1)
- `limit`: registros por página (default: 50, max: 500)
- `status`: filtrar por status (ativo, inativo, pausado)
- `search`: busca por nome ou email (full text)
- `sortBy`: campo para ordenação (name, createdAt, status)
- `order`: asc ou desc
- `assignedTo`: filtrar por vendedor (admin vê todos, vendedor vê só seus)

---

### GET /students/{id}

**Descrição**: Obter detalhe de um aluno com todas as informações associadas

**Response 200**:
```json
{
  "id": "student-001",
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "+55 11 98765-4321",
  "cpf": "12345678901",
  "status": "ativo",
  "notes": "Interessado em IA",
  "assignedTo": "user-003",
  "assignedToName": "João Vendedor",
  "createdAt": "2026-09-01T10:00:00Z",
  "updatedAt": "2026-09-05T14:30:00Z",
  "courses": [
    {
      "id": "course-001",
      "name": "Imersão em IA",
      "purchaseDate": "2026-09-01",
      "amount": 297.00
    }
  ],
  "pipelineLeads": [
    {
      "id": "lead-001",
      "status": "prospecting",
      "value": 500.00,
      "createdAt": "2026-09-01T10:00:00Z"
    }
  ],
  "tasks": [
    {
      "id": "task-001",
      "title": "Ligar para João",
      "dueDate": "2026-09-15T14:00:00Z",
      "completed": false
    }
  ]
}
```

---

### POST /students

**Descrição**: Criar novo aluno

**Request**:
```json
{
  "name": "Maria Santos",
  "email": "maria@email.com",
  "phone": "+55 11 99999-8888",
  "cpf": "98765432109",
  "status": "ativo",
  "assignedTo": "user-003"
}
```

**Response 201**:
```json
{
  "id": "student-002",
  "name": "Maria Santos",
  "email": "maria@email.com",
  "phone": "+55 11 99999-8888",
  "cpf": "98765432109",
  "status": "ativo",
  "assignedTo": "user-003",
  "createdAt": "2026-09-11T12:00:00Z",
  "updatedAt": "2026-09-11T12:00:00Z"
}
```

**Validações**:
- `email`: requerido, formato válido, unique
- `cpf`: opcional, format válido, unique se preenchido
- `name`: requerido, max 255 caracteres
- `status`: enum (ativo, inativo, pausado)

---

### PUT /students/{id}

**Descrição**: Atualizar dados de aluno

**Request**:
```json
{
  "name": "Maria Santos Silva",
  "phone": "+55 11 99999-9999",
  "status": "ativo"
}
```

**Response 200**: (mesmo schema que POST)

---

### DELETE /students/{id}

**Descrição**: Deletar aluno (cascata: purchases, tasks, leads)

**Response 204**: (sem body)

**Restrição**: Apenas admin

---

### POST /students/bulk-import

**Descrição**: Importar lote de alunos via CSV

**Request** (multipart/form-data):
```
Content-Disposition: form-data; name="file"
[arquivo CSV com colunas: name, email, phone, cpf, status, assigned_to_email]
```

**Response 200**:
```json
{
  "imported": 3000,
  "failed": 5,
  "duplicates": 2,
  "errors": [
    {
      "row": 42,
      "name": "João Silva",
      "error": "Email duplicado"
    }
  ],
  "summary": "3000 alunos importados com sucesso. 5 registros falharam."
}
```

---

## Cursos

### GET /courses

**Descrição**: Listar cursos

**Query Params**: `?page=1&limit=50&isActive=true`

**Response 200**:
```json
{
  "data": [
    {
      "id": "course-001",
      "name": "Imersão em IA",
      "description": "Aprenda IA do zero",
      "price": 297.00,
      "isActive": true,
      "createdAt": "2026-01-01T10:00:00Z",
      "updatedAt": "2026-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 3
  }
}
```

---

### GET /courses/{id}

**Response 200**: (single course object)

---

### POST /courses

**Descrição**: Criar novo curso (admin only)

**Request**:
```json
{
  "name": "Delphi Avançado",
  "description": "Técnicas avançadas de Delphi",
  "price": 497.00
}
```

**Response 201**: (course object)

---

### PUT /courses/{id}

**Response 200**: (updated course)

---

### DELETE /courses/{id}

**Restrição**: Apenas admin, falha se houver purchases

---

## Compras

### GET /students/{studentId}/purchases

**Descrição**: Listar compras de um aluno

**Response 200**:
```json
[
  {
    "id": "purchase-001",
    "studentId": "student-001",
    "courseId": "course-001",
    "courseName": "Imersão em IA",
    "purchaseDate": "2026-09-01",
    "amount": 297.00,
    "notes": "Cupom 10%",
    "createdAt": "2026-09-01T10:00:00Z"
  }
]
```

---

### POST /students/{studentId}/purchases

**Descrição**: Registrar compra de um aluno

**Request**:
```json
{
  "courseId": "course-001",
  "purchaseDate": "2026-09-01",
  "amount": 297.00,
  "notes": "Cupom 10%"
}
```

**Response 201**: (purchase object)

**Validações**:
- `courseId`: requerido, deve existir
- `purchaseDate`: não pode ser futura
- Não permite comprar mesmo curso 2x

---

### DELETE /students/{studentId}/purchases/{purchaseId}

**Descrição**: Remover compra

**Response 204**

---

## Pipeline de Vendas

### GET /pipeline

**Descrição**: Listar leads com filtros

**Query Params**: `?status=prospecting&assignedTo={userId}&sortBy=value&order=desc`

**Response 200**:
```json
{
  "data": [
    {
      "id": "lead-001",
      "studentId": "student-001",
      "studentName": "João Silva",
      "studentEmail": "joao@email.com",
      "status": "prospecting",
      "assignedTo": "user-003",
      "assignedToName": "João Vendedor",
      "value": 500.00,
      "lostReason": null,
      "createdAt": "2026-09-01T10:00:00Z",
      "updatedAt": "2026-09-05T14:30:00Z"
    }
  ],
  "summary": {
    "prospecting": 10,
    "negotiation": 5,
    "sold": 2,
    "lost": 1
  }
}
```

---

### POST /pipeline

**Descrição**: Criar novo lead

**Request**:
```json
{
  "studentId": "student-001",
  "status": "prospecting",
  "assignedTo": "user-003",
  "value": 500.00
}
```

**Response 201**: (lead object)

---

### PUT /pipeline/{leadId}

**Descrição**: Atualizar lead (mudar status, valor, etc.)

**Request**:
```json
{
  "status": "negotiation",
  "value": 550.00
}
```

**Response 200**: (updated lead)

---

### PUT /pipeline/{leadId}/status

**Descrição**: Mudar status de lead (para Kanban board)

**Request**:
```json
{
  "status": "sold"
}
```

**Response 200**: (updated lead)

**Status Válidos**: prospecting, negotiation, sold, lost

---

### DELETE /pipeline/{leadId}

**Response 204**

---

## Tarefas

### GET /tasks

**Descrição**: Listar tarefas do usuário autenticado

**Query Params**: `?completed=false&sortBy=dueDate&priority=high`

**Response 200**:
```json
{
  "data": [
    {
      "id": "task-001",
      "title": "Ligar para João",
      "description": "Pergunta sobre a próxima aula",
      "assignedTo": "user-003",
      "relatedTo": "student-001",
      "relatedType": "student",
      "priority": "high",
      "dueDate": "2026-09-15T14:00:00Z",
      "completedAt": null,
      "createdAt": "2026-09-11T10:00:00Z",
      "updatedAt": "2026-09-11T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15
  }
}
```

---

### GET /tasks/{id}

**Response 200**: (single task)

---

### POST /tasks

**Descrição**: Criar nova tarefa

**Request**:
```json
{
  "title": "Ligar para João",
  "description": "Pergunta sobre a próxima aula",
  "assignedTo": "user-003",
  "relatedTo": "student-001",
  "relatedType": "student",
  "priority": "high",
  "dueDate": "2026-09-15T14:00:00Z"
}
```

**Response 201**: (task object)

---

### PUT /tasks/{id}

**Descrição**: Atualizar tarefa

**Request**:
```json
{
  "title": "Ligar para João (URGENTE)",
  "priority": "high",
  "completedAt": null
}
```

**Response 200**: (updated task)

---

### PUT /tasks/{id}/complete

**Descrição**: Marcar tarefa como concluída

**Request**: (vazio)

**Response 200**:
```json
{
  "...": "...",
  "completedAt": "2026-09-11T15:30:00Z"
}
```

---

### DELETE /tasks/{id}

**Response 204**

---

## Dashboard

### GET /dashboard/metrics

**Descrição**: Obter KPIs para o dashboard

**Query Params**: `?period=30days` (7days, 30days, 90days, custom)

**Response 200**:
```json
{
  "totalStudents": 3000,
  "newStudentsThisMonth": 150,
  "totalRevenue": 1287450.00,
  "studentsByCourseCourseId": "course-001", "courseName": "Imersão em IA", "count": 850 }
  ],
  "activityRate": 42,
  "period": "30days",
  "generatedAt": "2026-09-11T12:00:00Z"
}
```

---

## Usuários & Configuração

### GET /users

**Descrição**: Listar usuários (admin only)

**Response 200**:
```json
[
  {
    "id": "user-001",
    "email": "admin@example.com",
    "name": "Admin",
    "role": "admin",
    "isActive": true,
    "createdAt": "2026-01-01T10:00:00Z"
  }
]
```

---

### POST /users

**Descrição**: Criar novo usuário (admin only)

**Request**:
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "vendedor"
}
```

**Response 201**:
```json
{
  "id": "user-004",
  "email": "newuser@example.com",
  "name": "New User",
  "role": "vendedor",
  "isActive": true,
  "tempPassword": "TempPass123!" 
}
```

Note: Enviar e-mail com link de reset de senha

---

### PUT /users/{id}

**Descrição**: Atualizar usuário (admin only)

**Request**:
```json
{
  "name": "Updated Name",
  "role": "ceo",
  "isActive": true
}
```

**Response 200**: (user object)

---

### DELETE /users/{id}

**Descrição**: Deletar usuário (admin only)

**Response 204**

---

## Envio de E-mail

### POST /email/send

**Descrição**: Enviar e-mail para aluno

**Request**:
```json
{
  "to": "joao@email.com",
  "subject": "Boas-vindas ao curso",
  "body": "<h1>Bem-vindo!</h1><p>Sua compra foi confirmada.</p>",
  "relatedTo": "student-001"
}
```

**Response 200**:
```json
{
  "messageId": "msg-12345",
  "to": "joao@email.com",
  "subject": "Boas-vindas ao curso",
  "sentAt": "2026-09-11T12:00:00Z"
}
```

---

### POST /email/send-bulk

**Descrição**: Enviar e-mail para múltiplos alunos

**Request**:
```json
{
  "studentIds": ["student-001", "student-002"],
  "subject": "Novo conteúdo disponível",
  "body": "Oi {{name}}, novo conteúdo saiu para {{courseName}}!",
  "useTemplate": true
}
```

**Response 200**:
```json
{
  "sent": 2,
  "failed": 0,
  "messageIds": ["msg-12345", "msg-12346"]
}
```

---

## Relatórios & Exportação

### GET /reports/students-export

**Descrição**: Exportar lista de alunos (CSV ou PDF)

**Query Params**: `?format=csv&status=ativo&sortBy=name`

**Response**: 200 (arquivo binário com headers)
```
Content-Type: text/csv
Content-Disposition: attachment; filename="students_2026-09-11.csv"

[dados CSV]
```

---

## Tratamento de Erros

Todos os erros retornam status apropriado + JSON:

```json
{
  "error": "Descrição do erro",
  "code": "ERRO_CODE",
  "details": {
    "field": "fieldName",
    "message": "Detalhes específicos"
  }
}
```

**Códigos HTTP Padrão**:
- `200 OK`: sucesso
- `201 Created`: recurso criado
- `204 No Content`: deletado/sem body
- `400 Bad Request`: validação falhou
- `401 Unauthorized`: não autenticado
- `403 Forbidden`: sem permissão
- `404 Not Found`: recurso não existe
- `409 Conflict`: violação de constraint (ex.: email duplicado)
- `500 Internal Server Error`: erro do servidor

---

## Rate Limiting

- Geral: 1000 requisições por hora por IP
- Login: 5 tentativas falhas = bloqueio por 15 min
- Bulk import: 1 por minuto

---

**Versão**: 1.0  
**Data**: 2026-09-11  
**Status**: Pronto para implementação
