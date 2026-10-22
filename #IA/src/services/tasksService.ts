import { ApiError, apiClient } from '@/services/apiClient';
import type {
  CreateTaskRequest,
  TaskListParams,
  TaskResponse,
  UpdateTaskRequest,
} from '@/types/tasks';

const BASE_PATH = '/api/tasks';

function requireBody<T>(body: T | null, path: string): T {
  if (body === null || body === undefined) {
    throw new ApiError(0, 'EMPTY_RESPONSE', `Resposta vazia em ${path}`);
  }
  return body;
}

const taskPath = (id: string) => `${BASE_PATH}/${encodeURIComponent(id)}`;

/** `GET /api/tasks` — só as tarefas do usuário logado. */
export async function listTasks(params: TaskListParams = {}): Promise<TaskResponse[]> {
  const query = new URLSearchParams();
  if (params.completed !== undefined) query.set('completed', String(params.completed));
  if (params.priority) query.set('priority', params.priority);
  const path = query.toString() ? `${BASE_PATH}?${query.toString()}` : BASE_PATH;
  return requireBody(await apiClient<{ data: TaskResponse[] }>(path), path).data;
}

/** `POST /api/tasks` — 201. */
export async function createTask(payload: CreateTaskRequest): Promise<TaskResponse> {
  return requireBody(
    await apiClient<TaskResponse>(BASE_PATH, { method: 'POST', body: payload }),
    BASE_PATH,
  );
}

/** `PUT /api/tasks/{id}`. */
export async function updateTask(id: string, payload: UpdateTaskRequest): Promise<TaskResponse> {
  return requireBody(
    await apiClient<TaskResponse>(taskPath(id), { method: 'PUT', body: payload }),
    taskPath(id),
  );
}

/** `PUT /api/tasks/{id}/complete` — conclui (`true`) ou reabre (`false`). */
export async function setTaskCompleted(id: string, completed: boolean): Promise<TaskResponse> {
  const path = `${taskPath(id)}/complete`;
  return requireBody(
    await apiClient<TaskResponse>(path, { method: 'PUT', body: { completed } }),
    path,
  );
}

/** `DELETE /api/tasks/{id}` — 204. */
export async function deleteTask(id: string): Promise<void> {
  await apiClient<null>(taskPath(id), { method: 'DELETE' });
}
