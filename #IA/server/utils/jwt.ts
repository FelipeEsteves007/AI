import jsonwebtoken, { type JwtPayload } from 'jsonwebtoken';

/** Nome do cookie HttpOnly que carrega a sessão (RN-08). */
export const SESSION_COOKIE_NAME = 'crm_session';

/** Validade da sessão: 24h, sem renovação automática (RN-08). */
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const SESSION_EXPIRES_IN_SECONDS = SESSION_MAX_AGE_MS / 1000;
const ALGORITHM = 'HS256' as const;

export interface SessionTokenInput {
  userId: string;
  tokenVersion: number;
}

export type SessionTokenPayload = SessionTokenInput;

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
  secure: boolean;
}

/** Opções do mesmo cookie no logout: tudo igual, sem `maxAge`. */
export type ClearSessionCookieOptions = Omit<SessionCookieOptions, 'maxAge'>;

/** Tamanho mínimo do segredo HS256: 32 caracteres (256 bits). */
export const JWT_SECRET_MIN_LENGTH = 32;

function getSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'JWT_SECRET não está definido: configure a variável de ambiente antes de emitir ou validar sessões.',
    );
  }

  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET é fraco demais: use pelo menos ${JWT_SECRET_MIN_LENGTH} caracteres (o valor atual tem ${secret.length}).`,
    );
  }

  return secret;
}

/** Assina o JWT HS256 da sessão, com `sub` (id do usuário) e `tv` (versão do token). */
export function signSessionToken({ userId, tokenVersion }: SessionTokenInput): string {
  return jsonwebtoken.sign({ tv: tokenVersion }, getSecret(), {
    algorithm: ALGORITHM,
    subject: userId,
    expiresIn: SESSION_EXPIRES_IN_SECONDS,
  });
}

/** Valida o JWT da sessão. Lança se estiver expirado, adulterado ou com outro segredo. */
export function verifySessionToken(token: string): SessionTokenPayload {
  const payload = jsonwebtoken.verify(token, getSecret(), {
    algorithms: [ALGORITHM],
  }) as JwtPayload;

  const { sub, tv } = payload;

  if (typeof sub !== 'string' || typeof tv !== 'number') {
    throw new jsonwebtoken.JsonWebTokenError('Payload de sessão inválido');
  }

  return { userId: sub, tokenVersion: tv };
}

/** Opções do cookie de sessão: HttpOnly, SameSite=Lax, 24h e Secure só em produção. */
export function sessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
    secure: process.env.NODE_ENV === 'production',
  };
}

/**
 * Opções para apagar o cookie de sessão no logout: as mesmas da criação, menos
 * o `maxAge`. Derivar de `sessionCookieOptions()` garante que `path`, `sameSite`
 * e `secure` nunca divirjam — se divergirem, o navegador mantém o cookie antigo.
 */
export function clearSessionCookieOptions(): ClearSessionCookieOptions {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();

  return options;
}
