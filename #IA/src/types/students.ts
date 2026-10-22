/**
 * Tipos de alunos — espelham o "Contrato fixado para a Sprint 6"
 * (`ImersaoIA/sprints/sprint-6-alunos.md`). Mudança aqui exige avisar as duas trilhas.
 */

export type StudentStatus = 'ativo' | 'inativo' | 'pausado';

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
  /** Id do User responsável. */
  assignedTo: string | null;
  assignedToName: string | null;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
}

export type PipelineLeadStatus = 'prospecting' | 'negotiation' | 'sold' | 'lost';

export interface StudentCourseSummary {
  id: string;
  name: string;
  /** YYYY-MM-DD. */
  purchaseDate: string;
  amount: number;
}

export interface StudentPipelineLeadSummary {
  id: string;
  status: PipelineLeadStatus;
  value: number | null;
  createdAt: string;
}

export interface StudentTaskSummary {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface StudentDetailResponse extends StudentResponse {
  courses: StudentCourseSummary[];
  pipelineLeads: StudentPipelineLeadSummary[];
  tasks: StudentTaskSummary[];
}

export interface StudentImportError {
  /** Linha no arquivo (cabeçalho = 1). */
  row: number;
  name: string;
  error: string;
}

/** Relatório de `POST /api/students/bulk-import`. */
export interface StudentImportResponse {
  imported: number;
  failed: number;
  duplicates: number;
  errors: StudentImportError[];
  summary: string;
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

export interface CreateStudentRequest {
  /** 1..255 caracteres. */
  name: string;
  email: string;
  phone?: string | null;
  /** Aceita com ou sem máscara; o backend grava só os dígitos. */
  cpf?: string | null;
  /** Padrão `ativo`. */
  status?: StudentStatus;
  notes?: string | null;
  /** Ignorado para vendedor (o backend força o próprio id). */
  assignedTo?: string | null;
}

/** Ao menos um campo. */
export type UpdateStudentRequest = Partial<CreateStudentRequest>;

export type StudentSortBy = 'name' | 'createdAt' | 'status';
export type SortOrder = 'asc' | 'desc';

/** Query de `GET /api/students`. Campos vazios não vão para a URL. */
export interface ListStudentsParams {
  /** Padrão 1. */
  page?: number;
  /** Padrão 50, máximo 500. */
  limit?: number;
  status?: StudentStatus | '';
  /** Nome ou e-mail, sem diferenciar maiúsculas. */
  search?: string;
  /** Ignorado pelo backend quando a sessão é de vendedor. */
  assignedTo?: string;
  /** Padrão `createdAt`. */
  sortBy?: StudentSortBy;
  /** Padrão `desc`. */
  order?: SortOrder;
}
