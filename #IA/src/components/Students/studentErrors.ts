import { isApiError } from '@/services/apiClient';
import type { UpdateStudentRequest } from '@/types/students';

export type StudentEditableField = keyof Pick<
  UpdateStudentRequest,
  'name' | 'email' | 'phone' | 'cpf' | 'status' | 'notes'
>;

const EMAIL_IN_USE = 'E-mail já cadastrado em outro aluno';
const CPF_IN_USE = 'CPF já cadastrado em outro aluno';
const NOT_FOUND = 'Este aluno não foi encontrado — talvez tenha sido excluído.';
const INVALID = 'Valor inválido.';
const GENERIC = 'Não foi possível salvar agora. Tente novamente em instantes.';

function detailFor(details: unknown, field: StudentEditableField): string | null {
  if (!details || typeof details !== 'object') {
    return null;
  }
  const message = (details as Record<string, unknown>)[field];
  return typeof message === 'string' && message ? message : null;
}

/** Mensagem exibida junto do campo quando o `PUT /api/students/{id}` falha. */
export function studentFieldErrorMessage(error: unknown, field: StudentEditableField): string {
  if (!isApiError(error)) {
    return GENERIC;
  }
  if (error.code === 'EMAIL_IN_USE') {
    return EMAIL_IN_USE;
  }
  if (error.code === 'CPF_IN_USE') {
    return CPF_IN_USE;
  }
  if (error.status === 400 || error.code === 'VALIDATION_ERROR') {
    return detailFor(error.details, field) ?? (error.message || INVALID);
  }
  if (error.status === 404 || error.code === 'NOT_FOUND') {
    return NOT_FOUND;
  }
  return GENERIC;
}
