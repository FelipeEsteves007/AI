import { ApiError, apiClient } from '@/services/apiClient';
import type { DashboardMetricsResponse, DashboardQuery } from '@/types/dashboard';

/** `GET /api/dashboard/metrics` — vendedor recebe só os números da própria carteira. */
export async function getDashboardMetrics(query: DashboardQuery): Promise<DashboardMetricsResponse> {
  const params = new URLSearchParams({ period: query.period });
  if (query.period === 'custom') {
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
  }
  const path = `/api/dashboard/metrics?${params.toString()}`;
  const body = await apiClient<DashboardMetricsResponse>(path);
  if (!body) {
    throw new ApiError(0, 'EMPTY_RESPONSE', `Resposta vazia em ${path}`);
  }
  return body;
}
