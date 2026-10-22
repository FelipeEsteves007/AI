import { ApiError, apiClient } from '@/services/apiClient';
import type {
  CreateLeadRequest,
  LeadResponse,
  PipelineListParams,
  PipelineListResponse,
  UpdateLeadRequest,
} from '@/types/pipeline';
import type { PipelineLeadStatus } from '@/types/students';

const BASE_PATH = '/api/pipeline';

function requireBody<T>(body: T | null, path: string): T {
  if (body === null || body === undefined) {
    throw new ApiError(0, 'EMPTY_RESPONSE', `Resposta vazia em ${path}`);
  }
  return body;
}

/** `GET /api/pipeline` — vendedor recebe só os próprios leads. */
export async function listLeads(params: PipelineListParams = {}): Promise<PipelineListResponse> {
  const query = new URLSearchParams();
  for (const key of ['assignedTo', 'from', 'to'] as const) {
    const value = params[key];
    if (value) query.set(key, value);
  }
  const path = query.toString() ? `${BASE_PATH}?${query.toString()}` : BASE_PATH;
  return requireBody(await apiClient<PipelineListResponse>(path), path);
}

/** `POST /api/pipeline` — 201; 404 se o aluno não é da carteira. */
export async function createLead(payload: CreateLeadRequest): Promise<LeadResponse> {
  return requireBody(
    await apiClient<LeadResponse>(BASE_PATH, { method: 'POST', body: payload }),
    BASE_PATH,
  );
}

/** `PUT /api/pipeline/{id}` — valor e motivo de perda. */
export async function updateLead(id: string, payload: UpdateLeadRequest): Promise<LeadResponse> {
  const path = `${BASE_PATH}/${encodeURIComponent(id)}`;
  return requireBody(await apiClient<LeadResponse>(path, { method: 'PUT', body: payload }), path);
}

/** `PUT /api/pipeline/{id}/status` — muda a coluna do Kanban. */
export async function updateLeadStatus(
  id: string,
  status: PipelineLeadStatus,
  lostReason?: string | null,
): Promise<LeadResponse> {
  const path = `${BASE_PATH}/${encodeURIComponent(id)}/status`;
  return requireBody(
    await apiClient<LeadResponse>(path, { method: 'PUT', body: { status, lostReason } }),
    path,
  );
}
