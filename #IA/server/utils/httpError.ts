export type HttpErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'NOT_FOUND'
  | 'EMAIL_IN_USE'
  | 'CPF_IN_USE'
  | 'LAST_ADMIN'
  | 'LOGIN_BLOCKED'
  | 'COURSE_HAS_PURCHASES'
  | 'PURCHASE_DUPLICATE';

/**
 * Códigos conhecidos com autocomplete, sem fechar a porta para um código novo:
 * `string & {}` preserva as sugestões do union e ainda aceita qualquer string.
 */
export type HttpErrorCodeInput = HttpErrorCode | (string & {});

export type HttpErrorDetails = Record<string, string>;

/** Erro de aplicação com status e código, tratado pelo `errorHandler`. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: HttpErrorCodeInput;
  readonly details?: HttpErrorDetails;

  constructor(
    status: number,
    code: HttpErrorCodeInput,
    message: string,
    details?: HttpErrorDetails,
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, HttpError.prototype);
  }

  /** 400 — corpo da requisição inválido. */
  static validation(
    message = 'Dados inválidos',
    details?: HttpErrorDetails,
  ): HttpError {
    return new HttpError(400, 'VALIDATION_ERROR', message, details);
  }

  /** 401 — sem sessão válida. */
  static unauthorized(message = 'Sessão inválida ou expirada'): HttpError {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }

  /** 401 — mensagem genérica de login (RN-06). */
  static invalidCredentials(message = 'E-mail ou senha incorretos'): HttpError {
    return new HttpError(401, 'INVALID_CREDENTIALS', message);
  }

  /** 403 — autenticado, mas sem permissão. */
  static forbidden(message = 'Acesso negado'): HttpError {
    return new HttpError(403, 'FORBIDDEN', message);
  }

  /** 403 — senha provisória pendente de troca (RN-05). */
  static passwordChangeRequired(
    message = 'É necessário trocar a senha provisória antes de continuar',
  ): HttpError {
    return new HttpError(403, 'PASSWORD_CHANGE_REQUIRED', message);
  }

  /** 404 — recurso inexistente. */
  static notFound(message = 'Recurso não encontrado'): HttpError {
    return new HttpError(404, 'NOT_FOUND', message);
  }

  /** 409 — e-mail já cadastrado (RN-01). */
  static emailInUse(message = 'E-mail já cadastrado'): HttpError {
    return new HttpError(409, 'EMAIL_IN_USE', message);
  }

  /** 409 — CPF já cadastrado em outro aluno (TASK-008). */
  static cpfInUse(message = 'CPF já cadastrado'): HttpError {
    return new HttpError(409, 'CPF_IN_USE', message);
  }

  /** 409 — não é possível desativar ou rebaixar o último admin ativo (RN-12). */
  static lastAdmin(
    message = 'Não é possível desativar ou rebaixar o último admin ativo',
  ): HttpError {
    return new HttpError(409, 'LAST_ADMIN', message);
  }

  /** 409 — curso com compras não pode ser excluído (TASK-014). */
  static courseHasPurchases(
    message = 'Não é possível excluir um curso que tem compras',
  ): HttpError {
    return new HttpError(409, 'COURSE_HAS_PURCHASES', message);
  }

  /** 409 — o aluno já comprou este curso (TASK-016). */
  static purchaseDuplicate(message = 'O aluno já comprou este curso'): HttpError {
    return new HttpError(409, 'PURCHASE_DUPLICATE', message);
  }

  /** 429 — tentativas de login bloqueadas temporariamente (RN-07). */
  static loginBlocked(
    message = 'Muitas tentativas de login. Tente novamente em alguns minutos',
  ): HttpError {
    return new HttpError(429, 'LOGIN_BLOCKED', message);
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
