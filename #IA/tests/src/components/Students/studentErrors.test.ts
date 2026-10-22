import { studentFieldErrorMessage } from '@/components/Students/studentErrors';
import { ApiError } from '@/services/apiClient';

describe('studentFieldErrorMessage', () => {
  it('409 EMAIL_IN_USE', () => {
    expect(studentFieldErrorMessage(new ApiError(409, 'EMAIL_IN_USE', 'x'), 'email')).toBe(
      'E-mail já cadastrado em outro aluno',
    );
  });

  it('409 CPF_IN_USE', () => {
    expect(studentFieldErrorMessage(new ApiError(409, 'CPF_IN_USE', 'x'), 'cpf')).toBe(
      'CPF já cadastrado em outro aluno',
    );
  });

  it('400 usa o details do campo quando vem', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Dados inválidos', {
      cpf: 'CPF inválido',
      email: 'E-mail inválido',
    });
    expect(studentFieldErrorMessage(error, 'cpf')).toBe('CPF inválido');
  });

  it('400 sem details do campo usa a mensagem do erro', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Nome é obrigatório', { email: 'x' });
    expect(studentFieldErrorMessage(error, 'name')).toBe('Nome é obrigatório');
  });

  it('404 explica que o aluno sumiu', () => {
    expect(studentFieldErrorMessage(new ApiError(404, 'NOT_FOUND', 'x'), 'name')).toMatch(
      /não foi encontrado/i,
    );
  });

  it('qualquer outra falha vira mensagem genérica', () => {
    expect(studentFieldErrorMessage(new Error('rede'), 'name')).toMatch(/não foi possível salvar/i);
    expect(studentFieldErrorMessage(new ApiError(500, 'UNKNOWN_ERROR', 'boom'), 'name')).toMatch(
      /não foi possível salvar/i,
    );
  });
});
