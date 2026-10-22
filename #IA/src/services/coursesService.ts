/**
 * Chamadas de `/api/courses` e `/api/students/{id}/purchases` (Sprint 7). O RBAC é do backend:
 * criar, editar e excluir curso sem `courses:manage` responde 403, e tudo chega como `ApiError`.
 */

import { ApiError, apiClient } from '@/services/apiClient';
import type {
  CourseListResponse,
  CourseResponse,
  CreateCourseRequest,
  CreatePurchaseRequest,
  ListCoursesParams,
  PurchaseResponse,
  UpdateCourseRequest,
} from '@/types/courses';

const BASE_PATH = '/api/courses';

function requireBody<T>(body: T | null, path: string): T {
  if (body === null || body === undefined) {
    throw new ApiError(0, 'EMPTY_RESPONSE', `Resposta vazia em ${path}`);
  }
  return body;
}

function coursePath(id: string): string {
  return `${BASE_PATH}/${encodeURIComponent(id)}`;
}

function purchasesPath(studentId: string): string {
  return `/api/students/${encodeURIComponent(studentId)}/purchases`;
}

/** `GET /api/courses` — ordenado por nome. */
export async function listCourses(params: ListCoursesParams = {}): Promise<CourseListResponse> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.isActive !== undefined) query.set('isActive', String(params.isActive));
  const serialized = query.toString();
  const path = serialized ? `${BASE_PATH}?${serialized}` : BASE_PATH;
  return requireBody(await apiClient<CourseListResponse>(path), path);
}

/** `POST /api/courses` — 201. Só admin. */
export async function createCourse(payload: CreateCourseRequest): Promise<CourseResponse> {
  const response = await apiClient<CourseResponse>(BASE_PATH, { method: 'POST', body: payload });
  return requireBody(response, BASE_PATH);
}

/** `PUT /api/courses/{id}` — 200. Só admin; 404 `NOT_FOUND`. */
export async function updateCourse(
  id: string,
  payload: UpdateCourseRequest,
): Promise<CourseResponse> {
  const path = coursePath(id);
  return requireBody(await apiClient<CourseResponse>(path, { method: 'PUT', body: payload }), path);
}

/** `DELETE /api/courses/{id}` — 204. Só admin; 409 `COURSE_HAS_PURCHASES`. */
export async function deleteCourse(id: string): Promise<void> {
  await apiClient<null>(coursePath(id), { method: 'DELETE' });
}

/** `POST /api/students/{id}/purchases` — 201. 409 `PURCHASE_DUPLICATE`, 404 curso ou aluno. */
export async function createPurchase(
  studentId: string,
  payload: CreatePurchaseRequest,
): Promise<PurchaseResponse> {
  const path = purchasesPath(studentId);
  return requireBody(
    await apiClient<PurchaseResponse>(path, { method: 'POST', body: payload }),
    path,
  );
}
