/**
 * Cliente HTTP do frontend.
 *
 * Fala sempre em caminho relativo (`/api/...`): o Next faz o proxy para a API Express, então o
 * cookie de sessão é de primeira parte e HttpOnly. O JavaScript nunca lê nem grava o token —
 * não há acesso a `localStorage` aqui, por regra do CLAUDE.md.
 */

export interface ApiErrorBody {
  error?: string;
  code?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
  method?: HttpMethod;
  /** Corpo já em objeto; é serializado em JSON e ganha o Content-Type. */
  body?: unknown;
  /** Corpo de texto enviado como está (ex.: CSV); o Content-Type vem em `headers`. */
  rawBody?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

const NO_CONTENT = 204;

async function readErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    const body: unknown = await response.json();
    return body && typeof body === 'object' ? (body as ApiErrorBody) : {};
  } catch {
    return {};
  }
}

/** Faz a requisição e devolve o JSON tipado; `null` quando a resposta é 204. */
export async function apiClient<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T | null> {
  const { method = 'GET', body, rawBody, headers = {}, signal } = options;
  const hasBody = body !== undefined;

  const init: RequestInit = {
    method,
    credentials: 'same-origin',
    headers: hasBody ? { 'Content-Type': 'application/json', ...headers } : { ...headers },
  };
  if (hasBody) {
    init.body = JSON.stringify(body);
  } else if (rawBody !== undefined) {
    init.body = rawBody;
  }
  if (signal) {
    init.signal = signal;
  }

  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha de rede';
    throw new ApiError(0, 'NETWORK_ERROR', message);
  }

  if (!response.ok) {
    const errorBody = await readErrorBody(response);
    throw new ApiError(
      response.status,
      errorBody.code ?? 'UNKNOWN_ERROR',
      errorBody.error ?? `Erro ${response.status} em ${path}`,
      errorBody.details,
    );
  }

  if (response.status === NO_CONTENT) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
