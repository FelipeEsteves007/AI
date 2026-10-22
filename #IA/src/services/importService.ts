import { ApiError, apiClient } from '@/services/apiClient';
import type { StudentImportResponse } from '@/types/students';

const PATH = '/api/students/bulk-import';

/** `POST /api/students/bulk-import` com o CSV como texto. Só admin (`students:import`). */
export async function importStudents(csv: string): Promise<StudentImportResponse> {
  const response = await apiClient<StudentImportResponse>(PATH, {
    method: 'POST',
    rawBody: csv,
    headers: { 'Content-Type': 'text/csv' },
  });
  if (!response) {
    throw new ApiError(0, 'EMPTY_RESPONSE', `Resposta vazia em ${PATH}`);
  }
  return response;
}
