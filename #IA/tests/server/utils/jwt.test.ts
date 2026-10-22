import jsonwebtoken from 'jsonwebtoken';

import {
  clearSessionCookieOptions,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
} from '@server/utils/jwt';

/** RN-08: o segredo de sessão precisa de pelo menos 32 caracteres. */
const SECRET = 'segredo-de-teste-suficientemente-longo-32+';
const SECRET_CURTO = 'segredo-curto';
const originalEnv = { ...process.env };

/** `NODE_ENV` é somente leitura na tipagem do Node; nos testes ajustamos pelo índice. */
const mutableEnv = process.env as Record<string, string | undefined>;

function setNodeEnv(value: string): void {
  mutableEnv.NODE_ENV = value;
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  setNodeEnv('test');
});

afterAll(() => {
  process.env = { ...originalEnv };
});

describe('signSessionToken', () => {
  it('assina com HS256 e payload com sub e tv', () => {
    const token = signSessionToken({ userId: 'user-1', tokenVersion: 3 });

    const decoded = jsonwebtoken.decode(token, { complete: true });
    expect(decoded?.header.alg).toBe('HS256');
    expect(decoded?.payload).toMatchObject({ sub: 'user-1', tv: 3 });
  });

  it('expira em 24 horas', () => {
    const token = signSessionToken({ userId: 'user-1', tokenVersion: 0 });

    const payload = jsonwebtoken.decode(token) as { iat: number; exp: number };
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
  });

  it('falha com erro claro quando JWT_SECRET não está definido', () => {
    delete process.env.JWT_SECRET;

    expect(() => signSessionToken({ userId: 'user-1', tokenVersion: 0 })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('falha com erro claro quando JWT_SECRET tem menos de 32 caracteres', () => {
    process.env.JWT_SECRET = SECRET_CURTO;
    expect(SECRET_CURTO.length).toBeLessThan(32);

    expect(() => signSessionToken({ userId: 'user-1', tokenVersion: 0 })).toThrow(
      /JWT_SECRET/,
    );
    expect(() => signSessionToken({ userId: 'user-1', tokenVersion: 0 })).toThrow(/32/);
  });

  it('aceita JWT_SECRET com exatamente 32 caracteres', () => {
    process.env.JWT_SECRET = 'a'.repeat(32);

    expect(() => signSessionToken({ userId: 'user-1', tokenVersion: 0 })).not.toThrow();
  });
});

describe('verifySessionToken', () => {
  it('devolve o payload de um token válido', () => {
    const token = signSessionToken({ userId: 'user-1', tokenVersion: 7 });

    expect(verifySessionToken(token)).toEqual({ userId: 'user-1', tokenVersion: 7 });
  });

  it('recusa token expirado', () => {
    const token = jsonwebtoken.sign({ tv: 0 }, SECRET, {
      algorithm: 'HS256',
      subject: 'user-1',
      expiresIn: '-1s',
    });

    expect(() => verifySessionToken(token)).toThrow();
  });

  it('recusa token adulterado', () => {
    const token = signSessionToken({ userId: 'user-1', tokenVersion: 0 });
    const [header, payload, signature] = token.split('.');
    const adulterado = [
      header,
      Buffer.from(JSON.stringify({ sub: 'user-2', tv: 0 })).toString('base64url'),
      signature,
    ].join('.');
    expect(adulterado).not.toBe(token);
    expect(payload).toBeDefined();

    expect(() => verifySessionToken(adulterado)).toThrow();
  });

  it('recusa token assinado com outro segredo', () => {
    const token = jsonwebtoken.sign({ tv: 0 }, 'outro-segredo', {
      algorithm: 'HS256',
      subject: 'user-1',
      expiresIn: '24h',
    });

    expect(() => verifySessionToken(token)).toThrow();
  });

  it('recusa token com algoritmo none', () => {
    const token = jsonwebtoken.sign({ tv: 0, sub: 'user-1' }, '', {
      algorithm: 'none',
    });

    expect(() => verifySessionToken(token)).toThrow();
  });

  it('recusa token sem tv no payload', () => {
    const token = jsonwebtoken.sign({}, SECRET, {
      algorithm: 'HS256',
      subject: 'user-1',
      expiresIn: '24h',
    });

    expect(() => verifySessionToken(token)).toThrow(/Payload de sessão inválido/);
  });

  it('recusa token com tv que não é número', () => {
    const token = jsonwebtoken.sign({ tv: 'x' }, SECRET, {
      algorithm: 'HS256',
      subject: 'user-1',
      expiresIn: '24h',
    });

    expect(() => verifySessionToken(token)).toThrow(/Payload de sessão inválido/);
  });

  it('recusa token sem sub no payload', () => {
    const token = jsonwebtoken.sign({ tv: 0 }, SECRET, {
      algorithm: 'HS256',
      expiresIn: '24h',
    });

    expect(() => verifySessionToken(token)).toThrow(/Payload de sessão inválido/);
  });

  it('falha com erro claro quando JWT_SECRET não está definido', () => {
    const token = signSessionToken({ userId: 'user-1', tokenVersion: 0 });
    delete process.env.JWT_SECRET;

    expect(() => verifySessionToken(token)).toThrow(/JWT_SECRET/);
  });

  it('falha com erro claro quando JWT_SECRET tem menos de 32 caracteres', () => {
    const token = signSessionToken({ userId: 'user-1', tokenVersion: 0 });
    process.env.JWT_SECRET = SECRET_CURTO;

    expect(() => verifySessionToken(token)).toThrow(/JWT_SECRET/);
    expect(() => verifySessionToken(token)).toThrow(/32/);
  });
});

describe('cookie de sessão', () => {
  it('usa o nome crm_session', () => {
    expect(SESSION_COOKIE_NAME).toBe('crm_session');
  });

  it('é HttpOnly, SameSite=Lax, Path=/ e dura 24h', () => {
    expect(sessionCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_MS,
    });
    expect(SESSION_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('não usa Secure fora de produção', () => {
    setNodeEnv('test');

    expect(sessionCookieOptions().secure).toBe(false);
  });

  it('usa Secure em produção', () => {
    setNodeEnv('production');

    expect(sessionCookieOptions().secure).toBe(true);
  });
});

describe('opções para apagar o cookie de sessão', () => {
  it('repete as opções da criação, sem o maxAge', () => {
    const { maxAge, ...criacao } = sessionCookieOptions();

    expect(maxAge).toBe(SESSION_MAX_AGE_MS);
    expect(clearSessionCookieOptions()).toEqual(criacao);
    expect(clearSessionCookieOptions()).not.toHaveProperty('maxAge');
  });

  it('acompanha o Secure de produção, senão o navegador manteria o cookie antigo', () => {
    setNodeEnv('production');

    expect(clearSessionCookieOptions()).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,
    });
  });
});
