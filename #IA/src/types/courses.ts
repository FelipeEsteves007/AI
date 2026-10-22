/** Tipos de cursos e compras (Sprint 7), espelhando `api/types/courses.ts`. */

import type { PaginationMeta } from '@/types/students';

export interface CourseResponse {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseListResponse {
  data: CourseResponse[];
  pagination: PaginationMeta;
}

export interface ListCoursesParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export interface CreateCourseRequest {
  name: string;
  description?: string | null;
  /** Até 2 casas decimais. */
  price: number | string;
  isActive?: boolean;
}

export type UpdateCourseRequest = Partial<CreateCourseRequest>;

export interface PurchaseResponse {
  id: string;
  studentId: string;
  courseId: string;
  courseName: string;
  /** `YYYY-MM-DD`. */
  purchaseDate: string;
  amount: number;
  notes: string | null;
  createdAt: string;
}

export interface CreatePurchaseRequest {
  courseId: string;
  /** `YYYY-MM-DD`, nunca no futuro. */
  purchaseDate: string;
  amount?: number | string;
  notes?: string | null;
}
