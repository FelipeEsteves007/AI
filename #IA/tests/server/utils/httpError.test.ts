import { HttpError, isHttpError } from '@server/utils/httpError';
import type { HttpErrorCode } from '@server/utils/httpError';

describe('HttpError', () => {
  it('aceita um código conhecido do union HttpErrorCode', () => {
    const code: HttpErrorCode = 'FORBIDDEN';

    expect(new HttpError(403, code, 'Acesso negado').code).toBe('FORBIDDEN');
  });

  it('guarda status, code e message', () => {
    const error = new HttpError(418, 'TEAPOT', 'Sou um bule');

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(418);
    expect(error.code).toBe('TEAPOT');
    expect(error.message).toBe('Sou um bule');
    expect(error.name).toBe('HttpError');
  });

  it('aceita detalhes opcionais', () => {
    const error = new HttpError(400, 'VALIDATION_ERROR', 'Dados inválidos', {
      email: 'obrigatório',
    });

    expect(error.details).toEqual({ email: 'obrigatório' });
  });

  it('isHttpError distingue HttpError de outros erros', () => {
    expect(isHttpError(new HttpError(404, 'NOT_FOUND', 'não achei'))).toBe(true);
    expect(isHttpError(new Error('qualquer'))).toBe(false);
    expect(isHttpError(null)).toBe(false);
  });

  describe('atalhos', () => {
    const casos: Array<[keyof typeof HttpError, number, string]> = [
      ['validation', 400, 'VALIDATION_ERROR'],
      ['unauthorized', 401, 'UNAUTHORIZED'],
      ['invalidCredentials', 401, 'INVALID_CREDENTIALS'],
      ['forbidden', 403, 'FORBIDDEN'],
      ['passwordChangeRequired', 403, 'PASSWORD_CHANGE_REQUIRED'],
      ['notFound', 404, 'NOT_FOUND'],
      ['emailInUse', 409, 'EMAIL_IN_USE'],
      ['cpfInUse', 409, 'CPF_IN_USE'],
      ['lastAdmin', 409, 'LAST_ADMIN'],
      ['loginBlocked', 429, 'LOGIN_BLOCKED'],
    ];

    it.each(casos)('%s devolve %i com o código %s', (atalho, status, code) => {
      const factory = HttpError[atalho] as (message?: string) => HttpError;
      const error = factory();

      expect(error).toBeInstanceOf(HttpError);
      expect(error.status).toBe(status);
      expect(error.code).toBe(code);
      expect(error.message.length).toBeGreaterThan(0);
    });

    it('permite sobrescrever a mensagem padrão', () => {
      expect(HttpError.notFound('Usuário não encontrado').message).toBe(
        'Usuário não encontrado',
      );
    });

    it('invalidCredentials usa a mensagem genérica exigida pela RN-06', () => {
      expect(HttpError.invalidCredentials().message).toBe('E-mail ou senha incorretos');
    });

    it('validation aceita detalhes', () => {
      expect(HttpError.validation('Dados inválidos', { email: 'obrigatório' }).details).toEqual(
        { email: 'obrigatório' },
      );
    });
  });
});
