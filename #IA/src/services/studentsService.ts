/**
 * Chamadas de `/api/students` (contrato da Sprint 6). O RBAC é do backend: vendedor só recebe os
 * próprios alunos, aluno de outro vendedor responde 404 e excluir sem `students:delete` responde
 * 403 — tudo chega aqui como `ApiError`, lançado pelo `apiClient`.
 */

import { ApiError, apiClient } from '@/services/apiClient';
import type {
  CreateStudentRequest,
  ListStudentsParams,
  StudentDetailResponse,
  StudentListResponse,
  StudentResponse,
  UpdateStudentRequest,
} from '@/types/students';

const BASE_PATH = '/api/students';

const QUERY_KEYS: readonly (keyof ListStudentsParams)[] = [
  'page',
  'limit',
  'status',
  'search',
  'assignedTo',
  'sortBy',
  'order',
];

/**
 * O `apiClient` devolve `null` em 204 ou corpo ilegível. Nestas rotas o contrato sempre traz corpo,
 * então a ausência dele é falha — lançada como `ApiError`, e não escondida por um cast.
 */
function requireBody<T>(body: T | null, path: string): T {
  if (body === null || body === undefined) {
    throw new ApiError(0, 'EMPTY_RESPONSE', `Resposta vazia em ${path}`);
  }
  return body;
}

function studentPath(id: string): string {
  return `${BASE_PATH}/${encodeURIComponent(id)}`;
}

function buildQuery(params: ListStudentsParams): string {
  const query = new URLSearchParams();
  for (const key of QUERY_KEYS) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

/** `GET /api/students` — página de alunos com filtros, busca e ordenação. */
export async function listStudents(params: ListStudentsParams = {}): Promise<StudentListResponse> {
  const path = `${BASE_PATH}${buildQuery(params)}`;
  return requireBody(await apiClient<StudentListResponse>(path), path);
}

/** `GET /api/students/{id}` — aluno com cursos, leads e tarefas. 404 `NOT_FOUND`. */
export async function getStudent(id: string): Promise<StudentDetailResponse> {
  const path = studentPath(id);
  return requireBody(await apiClient<StudentDetailResponse>(path), path);
}

/** `POST /api/students` — 201. 409 `EMAIL_IN_USE` ou `CPF_IN_USE`. */
export async function createStudent(payload: CreateStudentRequest): Promise<StudentResponse> {
  const response = await apiClient<StudentResponse>(BASE_PATH, { method: 'POST', body: payload });
  return requireBody(response, BASE_PATH);
}

/** `PUT /api/students/{id}` — 200. 404, 409 `EMAIL_IN_USE` ou `CPF_IN_USE`. */
export async function updateStudent(
  id: string,
  payload: UpdateStudentRequest,
): Promise<StudentResponse> {
  const path = studentPath(id);
  const response = await apiClient<StudentResponse>(path, { method: 'PUT', body: payload });
  return requireBody(response, path);
}

/** `DELETE /api/students/{id}` — 204. Só admin; 403 `FORBIDDEN`, 404 `NOT_FOUND`. */
export async function deleteStudent(id: string): Promise<void> {
  await apiClient<null>(studentPath(id), { method: 'DELETE' });
}
