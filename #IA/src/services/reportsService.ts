import { ApiError } from '@/services/apiClient';

export interface StudentsExportFilter {
  status?: string;
  search?: string;
  assignedTo?: string;
}

/**
 * `GET /api/reports/students-export` — baixa o CSV com os filtros da tela. Usa `fetch` direto
 * (o `apiClient` só lê JSON) e entrega o arquivo ao navegador. Só admin e CEO (403 para vendedor).
 */
export async function downloadStudentsCsv(filter: StudentsExportFilter): Promise<void> {
  const query = new URLSearchParams({ format: 'csv' });
  for (const [key, value] of Object.entries(filter)) {
    if (value) query.set(key, value);
  }

  const response = await fetch(`/api/reports/students-export?${query.toString()}`, {
    credentials: 'same-origin',
  });
  if (!response.ok) {
    throw new ApiError(response.status, response.status === 403 ? 'FORBIDDEN' : 'EXPORT_FAILED', 'Falha ao exportar');
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'alunos.csv';
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
