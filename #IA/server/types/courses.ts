import type { Course, Prisma } from '@prisma/client';

import type { PaginationMeta } from '@server/types/students';

/*
 * Tipos de cursos (TASK-014) e compras (TASK-016 e TASK-017) — Sprint 7.
 * Valores em dinheiro trafegam como `number` no JSON e como string decimal ("997.00") até o
 * repositório, para não perder centavos em ponto flutuante na gravação.
 */

// ---------------------------------------------------------------------------
// Contrato HTTP — cursos
// ---------------------------------------------------------------------------

export interface CourseResponse {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
}

export interface CourseListResponse {
  data: CourseResponse[];
  pagination: PaginationMeta;
}

/** Query de `GET /api/courses`, já validada pela rota. */
export interface CourseListQuery {
  page: number;
  limit: number;
  /** Ausente: ativos e inativos. */
  isActive?: boolean;
}

/** Corpo de `POST /api/courses`, já validado. `price` com até 2 casas, como string decimal. */
export interface CreateCourseRequest {
  name: string;
  description?: string | null;
  price: string;
  isActive?: boolean;
}

/** Corpo de `PUT /api/courses/:id`: parcial, com ao menos um campo. */
export type UpdateCourseRequest = Partial<CreateCourseRequest>;

// ---------------------------------------------------------------------------
// Contrato HTTP — compras
// ---------------------------------------------------------------------------

export interface PurchaseResponse {
  id: string;
  studentId: string;
  courseId: string;
  courseName: string;
  /** `YYYY-MM-DD`. */
  purchaseDate: string;
  amount: number;
  notes: string | null;
  /** ISO 8601. */
  createdAt: string;
}

/** Corpo de `POST /api/students/:id/purchases`, já validado. */
export interface CreatePurchaseRequest {
  courseId: string;
  /** `YYYY-MM-DD`, nunca no futuro. */
  purchaseDate: string;
  /** Ausente: preço atual do curso. */
  amount?: string;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Repositórios
// ---------------------------------------------------------------------------

export interface CourseListParams {
  isActive?: boolean;
  skip: number;
  take: number;
}

export interface CoursePage {
  rows: Course[];
  total: number;
}

export interface CreateCourseData {
  name: string;
  description: string | null;
  price: string;
  isActive: boolean;
}

export type UpdateCourseData = Partial<CreateCourseData>;

/**
 * Acesso a dados de cursos. `update` e `delete` deixam subir o `P2025` do Prisma quando o curso
 * não existe; `delete` de curso com compras deixa subir o `P2003` (FK sem cascata).
 */
export interface CourseRepository {
  /** Ordenado por nome, com `id` de desempate. */
  list(params: CourseListParams): Promise<CoursePage>;
  findById(id: string): Promise<Course | null>;
  create(data: CreateCourseData): Promise<Course>;
  update(id: string, data: UpdateCourseData): Promise<Course>;
  delete(id: string): Promise<void>;
}

/** Compra com o nome do curso, como a listagem precisa. */
export type PurchaseRecord = Prisma.PurchaseGetPayload<{
  include: { course: { select: { name: true } } };
}>;

export interface CreatePurchaseData {
  studentId: string;
  courseId: string;
  /** `YYYY-MM-DD`. */
  purchaseDate: string;
  amount: string;
  notes: string | null;
}

/**
 * Acesso a dados de compras. `create` deixa subir o `P2002` do índice único
 * `(studentId, courseId)` — o aluno não compra o mesmo curso duas vezes.
 */
export interface PurchaseRepository {
  /** Compras do aluno, da mais recente para a mais antiga. */
  listByStudent(studentId: string): Promise<PurchaseRecord[]>;
  create(data: CreatePurchaseData): Promise<PurchaseRecord>;
  countByCourse(courseId: string): Promise<number>;
}
