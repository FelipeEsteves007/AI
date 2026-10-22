import type { LeadStatus, Prisma, Student, StudentStatus } from '@prisma/client';

import type { AuditLogEntry } from '@server/types/auth';

/*
 * Tipos de alunos (Sprint 6). As formas de resposta espelham o "Contrato fixado para a
 * Sprint 6" em `ImersaoIA/sprints/sprint-6-alunos.md`; qualquer mudança aqui exige avisar a
 * trilha de frontend.
 */

// ---------------------------------------------------------------------------
// Contrato HTTP
// ---------------------------------------------------------------------------

export type { StudentStatus };

export interface StudentResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** Só dígitos, 11 caracteres. */
  cpf: string | null;
  status: StudentStatus;
  notes: string | null;
  /** ISO 8601. */
  lastContactDate: string | null;
  /** Id do `User` responsável. */
  assignedTo: string | null;
  assignedToName: string | null;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
}

export interface StudentCourseResponse {
  id: string;
  name: string;
  /** `YYYY-MM-DD`. */
  purchaseDate: string;
  amount: number;
}

export interface StudentPipelineLeadResponse {
  id: string;
  status: LeadStatus;
  value: number | null;
  /** ISO 8601. */
  createdAt: string;
}

export interface StudentTaskResponse {
  id: string;
  title: string;
  /** ISO 8601. */
  dueDate: string;
  completed: boolean;
}

export interface StudentDetailResponse extends StudentResponse {
  courses: StudentCourseResponse[];
  pipelineLeads: StudentPipelineLeadResponse[];
  tasks: StudentTaskResponse[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StudentListResponse {
  data: StudentResponse[];
  pagination: PaginationMeta;
}

/** Corpo de `POST /api/students`, já validado e normalizado pela rota. */
export interface CreateStudentRequest {
  /** 1..255, sem espaços nas bordas. */
  name: string;
  email: string;
  phone?: string | null;
  /** Com ou sem máscara; gravado só com dígitos. */
  cpf?: string | null;
  /** Padrão `ativo`. */
  status?: StudentStatus;
  notes?: string | null;
  /** Ignorado para vendedor (vira o próprio id). */
  assignedTo?: string | null;
}

/** Corpo de `PUT /api/students/:id`: parcial, com ao menos um campo. */
export type UpdateStudentRequest = Partial<CreateStudentRequest>;

export const STUDENT_SORT_FIELDS = ['name', 'createdAt', 'status'] as const;
export type StudentSortField = (typeof STUDENT_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/** Query de `GET /api/students`, já validada e com os padrões aplicados pela rota. */
export interface StudentListQuery {
  page: number;
  limit: number;
  status?: StudentStatus;
  search?: string;
  assignedTo?: string;
  sortBy: StudentSortField;
  order: SortOrder;
}

// ---------------------------------------------------------------------------
// Repositório
// ---------------------------------------------------------------------------

/** Aluno com o nome do vendedor responsável, como a listagem precisa. */
export type StudentRecord = Prisma.StudentGetPayload<{
  include: { assignedToUser: { select: { name: true } } };
}>;

/** Aluno com tudo o que a tela de detalhe mostra. */
export type StudentDetailRecord = Prisma.StudentGetPayload<{
  include: {
    assignedToUser: { select: { name: true } };
    purchases: { include: { course: { select: { id: true; name: true } } } };
    pipelineLeads: true;
    tasks: true;
  };
}>;

/**
 * Filtro já resolvido pelo serviço. `assignedTo` aqui é o escopo efetivo: para o vendedor, o
 * serviço sempre coloca o id dele — o repositório só aplica, não decide o RBAC.
 */
export interface StudentFilter {
  status?: StudentStatus;
  /** Nome OU e-mail, sem diferenciar maiúsculas. */
  search?: string;
  assignedTo?: string;
}

export interface StudentListParams {
  filter: StudentFilter;
  sortBy: StudentSortField;
  order: SortOrder;
  skip: number;
  take: number;
}

export interface StudentPage {
  rows: StudentRecord[];
  /** Total do filtro inteiro (mesmo `where` da página), não só da página. */
  total: number;
}

/** Dados completos para gravar um aluno, com o RBAC e os padrões já resolvidos pelo serviço. */
export interface CreateStudentData {
  name: string;
  /** Normalizado também dentro do repositório (o índice único diferencia maiúsculas). */
  email: string;
  phone: string | null;
  /** Só dígitos. */
  cpf: string | null;
  status: StudentStatus;
  notes: string | null;
  assignedTo: string | null;
}

/** Campos alteráveis. Chave ausente não muda; `null` limpa. */
export type UpdateStudentData = Partial<CreateStudentData>;

/**
 * O que foi apagado numa exclusão de aluno, lido na mesma transação do `delete`: é o snapshot
 * que vai para a auditoria (`STUDENT_DELETED`). As contagens são dos filhos levados pela cascata.
 */
export interface StudentDeletionSnapshot {
  id: string;
  name: string;
  email: string;
  cascade: {
    purchases: number;
    pipelineLeads: number;
    tasks: number;
  };
}

/**
 * Monta a entrada de auditoria da exclusão a partir do snapshot. Quem decide o conteúdo é o
 * serviço; o repositório só grava, dentro da mesma transação do `delete`.
 */
export type StudentDeletionAuditBuilder = (snapshot: StudentDeletionSnapshot) => AuditLogEntry;

/** Linha rejeitada na importação. `row` é o número da linha no arquivo (cabeçalho = 1). */
export interface StudentImportError {
  row: number;
  name: string;
  error: string;
}

/** Resposta de `POST /api/students/bulk-import` (TASK-012). */
export interface StudentImportResponse {
  imported: number;
  /** Linhas inválidas (e-mail, CPF, nome, status ou responsável). */
  failed: number;
  /** Linhas com e-mail ou CPF já cadastrado, ou repetido no próprio arquivo. */
  duplicates: number;
  /** Uma entrada por linha rejeitada — falhas e duplicatas. */
  errors: StudentImportError[];
  summary: string;
}

/** Escopo de RBAC já resolvido pelo serviço: `assignedTo` presente prende ao vendedor. */
export type StudentScope = Pick<StudentFilter, 'assignedTo'>;

/**
 * Acesso a dados de alunos. Em produção, Prisma (`api/models/studentModel.ts`); nos testes,
 * o fake em memória.
 *
 * `create` e `update` deixam a violação de unicidade do banco subir como o Prisma lança
 * (`P2002`); `update` e `delete` deixam subir o `P2025` quando o registro não existe (ou está
 * fora do escopo). Quem traduz para 409/404 é o serviço.
 */
export interface StudentRepository {
  list(params: StudentListParams): Promise<StudentPage>;
  /**
   * Detalhe do aluno dentro do escopo informado. Fora do escopo devolve `null`, exatamente
   * como um id inexistente — é o que sustenta o 404 sem revelar existência.
   */
  findDetail(
    id: string,
    scope: Pick<StudentFilter, 'assignedTo'>,
  ): Promise<StudentDetailRecord | null>;
  /** Aluno dentro do escopo, ou `null` (mesma regra do detalhe). */
  findById(id: string, scope: Pick<StudentFilter, 'assignedTo'>): Promise<StudentRecord | null>;
  /** Sem escopo: a unicidade vale para a base inteira. */
  findByEmail(email: string): Promise<Student | null>;
  /** Sem escopo. `cpf` só com dígitos. */
  findByCpf(cpf: string): Promise<Student | null>;
  create(data: CreateStudentData): Promise<StudentRecord>;
  /**
   * S6-11: o escopo entra no `where` da própria gravação, então conferir e gravar é um passo
   * só — aluno removido ou reatribuído no meio vira `P2025`, nunca uma escrita fora do escopo.
   */
  update(id: string, data: UpdateStudentData, scope: StudentScope): Promise<StudentRecord>;
  /**
   * TASK-009. Compras, leads e tarefas do aluno somem pelo `onDelete: Cascade` do schema; o
   * repositório não apaga filhos à mão. Lê o snapshot (dados e contagens dos filhos), apaga e
   * grava a auditoria montada por `audit` — tudo na mesma transação: se a auditoria falhar, a
   * exclusão é desfeita. Devolve o snapshot.
   */
  delete(id: string, audit: StudentDeletionAuditBuilder): Promise<StudentDeletionSnapshot>;
  /**
   * Importação (TASK-012): quais destes e-mails (normalizados) e CPFs (só dígitos) já existem,
   * numa consulta por lista em vez de uma por linha.
   */
  findExistingKeys(emails: string[], cpfs: string[]): Promise<{ emails: string[]; cpfs: string[] }>;
  /** Grava em lote e devolve quantos entraram; linhas que colidirem no índice único são puladas. */
  createMany(data: CreateStudentData[]): Promise<number>;
  /** Exportação (TASK-028): todos os alunos do filtro, por nome, com os cursos comprados. */
  listForExport(filter: StudentFilter): Promise<StudentExportRecord[]>;
}

/** Aluno com responsável e nomes dos cursos, para o CSV exportado. */
export type StudentExportRecord = Prisma.StudentGetPayload<{
  include: {
    assignedToUser: { select: { name: true } };
    purchases: { select: { course: { select: { name: true } } } };
  };
}>;
