import { AuditAction, UserRole, type User } from '@prisma/client';

import { createAuthService } from '@server/services/authService';
import type { AuthRepositories } from '@server/types/auth';
import { HttpError } from '@server/utils/httpError';
import { verifySessionToken } from '@server/utils/jwt';
import { hashPassword } from '@server/utils/password';

import {
  InMemoryAuditLogRepository,
  InMemoryUserRepository,
} from '../fakes/inMemoryRepositories';

/** RN-08: o segredo de sessão precisa de pelo menos 32 caracteres. */
const SECRET = 'segredo-de-teste-suficientemente-longo-32+';

const SENHA = 'senha-atual-123';
const EMAIL = 'admin@crm.test';
const IP = '203.0.113.10';
const MINUTO = 60 * 1000;

let passwordHash: string;

interface Fakes extends AuthRepositories {
  users: InMemoryUserRepository;
  auditLogs: InMemoryAuditLogRepository;
}

function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date('2026-09-01T10:00:00.000Z');

  return {
    id: 'user-1',
    name: 'Adriano',
    email: EMAIL,
    passwordHash,
    role: UserRole.admin,
    isActive: true,
    mustChangePassword: false,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeFakes(users: User[] = [makeUser()]): Fakes {
  return {
    users: new InMemoryUserRepository(users),
    auditLogs: new InMemoryAuditLogRepository(),
  };
}

/** Grava falhas de login com data controlada (minutos atrás), sem mexer no relógio. */
async function seedFailures(
  fakes: Fakes,
  count: number,
  minutesAgo: number,
  email = EMAIL,
): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await fakes.auditLogs.record({
      action: AuditAction.LOGIN_FAILURE,
      email,
      createdAt: new Date(Date.now() - minutesAgo * MINUTO),
    });
  }
}

async function seedSuccess(fakes: Fakes, minutesAgo: number, email = EMAIL): Promise<void> {
  await fakes.auditLogs.record({
    action: AuditAction.LOGIN_SUCCESS,
    email,
    createdAt: new Date(Date.now() - minutesAgo * MINUTO),
  });
}

function actions(fakes: Fakes): AuditAction[] {
  return fakes.auditLogs.entries.map((entry) => entry.action);
}

beforeAll(async () => {
  passwordHash = await hashPassword(SENHA);
});

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

describe('authService.login', () => {
  it('entra com a senha correta, devolve o usuário público e o token da sessão', async () => {
    const fakes = makeFakes([makeUser({ tokenVersion: 3 })]);
    const service = createAuthService(fakes);

    const result = await service.login({ email: EMAIL, password: SENHA, ip: IP });

    expect(result.user).toMatchObject({ id: 'user-1', email: EMAIL, role: UserRole.admin });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('tokenVersion');
    expect(verifySessionToken(result.token)).toEqual({ userId: 'user-1', tokenVersion: 3 });
  });

  it('compara o e-mail sem diferenciar maiúsculas (RN-01)', async () => {
    const service = createAuthService(makeFakes());

    const result = await service.login({ email: '  ADMIN@CRM.test ', password: SENHA });

    expect(result.user.email).toBe(EMAIL);
  });

  it('grava LOGIN_SUCCESS na auditoria, com e-mail e IP e sem a senha (RN-13/RN-14)', async () => {
    const fakes = makeFakes();

    await createAuthService(fakes).login({ email: EMAIL, password: SENHA, ip: IP });

    expect(fakes.auditLogs.entries).toHaveLength(1);
    expect(fakes.auditLogs.entries[0]).toMatchObject({
      action: AuditAction.LOGIN_SUCCESS,
      actorId: 'user-1',
      targetUserId: 'user-1',
      email: EMAIL,
      ip: IP,
    });
    expect(JSON.stringify(fakes.auditLogs.entries)).not.toContain(SENHA);
  });

  it.each([
    ['e-mail inexistente', { email: 'ninguem@crm.test', password: SENHA }],
    ['senha errada', { email: EMAIL, password: 'senha-errada-999' }],
  ])('recusa %s com a mensagem genérica e grava LOGIN_FAILURE (RN-06)', async (_caso, entrada) => {
    const fakes = makeFakes();
    const service = createAuthService(fakes);

    await expect(service.login({ ...entrada, ip: IP })).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail ou senha incorretos',
    });
    expect(actions(fakes)).toEqual([AuditAction.LOGIN_FAILURE]);
    expect(fakes.auditLogs.entries[0]).toMatchObject({ ip: IP });
  });

  it('recusa usuário desativado com o mesmo erro do e-mail inexistente (RN-06)', async () => {
    const fakes = makeFakes([makeUser({ isActive: false })]);

    await expect(
      createAuthService(fakes).login({ email: EMAIL, password: SENHA }),
    ).rejects.toEqual(HttpError.invalidCredentials());
    expect(actions(fakes)).toEqual([AuditAction.LOGIN_FAILURE]);
  });

  it('devolve o mesmo erro para e-mail inexistente, senha errada e usuário desativado', async () => {
    const capturar = async (fakes: Fakes, password: string, email = EMAIL): Promise<HttpError> => {
      try {
        await createAuthService(fakes).login({ email, password });
        throw new Error('era esperado um erro de login');
      } catch (error) {
        return error as HttpError;
      }
    };

    const inexistente = await capturar(makeFakes(), SENHA, 'ninguem@crm.test');
    const senhaErrada = await capturar(makeFakes(), 'outra-senha-123');
    const desativado = await capturar(makeFakes([makeUser({ isActive: false })]), SENHA);

    for (const erro of [inexistente, senhaErrada, desativado]) {
      expect(erro).toBeInstanceOf(HttpError);
      expect({ status: erro.status, code: erro.code, message: erro.message }).toEqual({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'E-mail ou senha incorretos',
      });
    }
  });

  it('deixa entrar com 4 falhas recentes (o limite é 5, RN-07)', async () => {
    const fakes = makeFakes();
    await seedFailures(fakes, 4, 5);

    await expect(
      createAuthService(fakes).login({ email: EMAIL, password: SENHA }),
    ).resolves.toMatchObject({ user: { id: 'user-1' } });
  });

  it('bloqueia a 6ª tentativa após 5 falhas em 15 minutos (RN-07/CU-03)', async () => {
    const fakes = makeFakes();
    await seedFailures(fakes, 5, 5);

    await expect(
      createAuthService(fakes).login({ email: EMAIL, password: 'errada-de-novo', ip: IP }),
    ).rejects.toMatchObject({ status: 429, code: 'LOGIN_BLOCKED' });
    expect(actions(fakes).slice(5)).toEqual([AuditAction.LOGIN_BLOCKED]);
    expect(fakes.auditLogs.entries[5]).toMatchObject({ email: EMAIL, ip: IP });
  });

  it('bloqueia mesmo com a senha correta enquanto a janela não passa (RN-07)', async () => {
    const fakes = makeFakes();
    await seedFailures(fakes, 5, 1);

    await expect(
      createAuthService(fakes).login({ email: EMAIL, password: SENHA }),
    ).rejects.toMatchObject({ status: 429, code: 'LOGIN_BLOCKED' });
    expect(actions(fakes)).not.toContain(AuditAction.LOGIN_SUCCESS);
  });

  it('ignora as falhas anteriores ao último login bem-sucedido (RN-07)', async () => {
    const fakes = makeFakes();
    await seedFailures(fakes, 5, 10);
    await seedSuccess(fakes, 8);
    await seedFailures(fakes, 2, 6);

    await expect(
      createAuthService(fakes).login({ email: EMAIL, password: SENHA }),
    ).resolves.toMatchObject({ user: { id: 'user-1' } });
  });

  it('ignora as falhas fora da janela de 15 minutos (RN-07)', async () => {
    const fakes = makeFakes();
    await seedFailures(fakes, 5, 16);

    await expect(
      createAuthService(fakes).login({ email: EMAIL, password: SENHA }),
    ).resolves.toMatchObject({ user: { id: 'user-1' } });
  });

  it('conta as falhas por e-mail: falhas de outro e-mail não bloqueiam (RN-07)', async () => {
    const fakes = makeFakes();
    await seedFailures(fakes, 5, 2, 'outro@crm.test');

    await expect(
      createAuthService(fakes).login({ email: EMAIL, password: SENHA }),
    ).resolves.toMatchObject({ user: { id: 'user-1' } });
  });

  it('bloqueia também e-mail inexistente, sem revelar que a conta não existe (RN-06/RN-07)', async () => {
    const fakes = makeFakes();
    await seedFailures(fakes, 5, 3, 'ninguem@crm.test');

    await expect(
      createAuthService(fakes).login({ email: 'NINGUEM@crm.test', password: SENHA }),
    ).rejects.toMatchObject({ status: 429, code: 'LOGIN_BLOCKED' });
  });
});

describe('authService.changePassword', () => {
  const NOVA = 'nova-senha-456';

  it('troca a senha, zera mustChangePassword e incrementa o tokenVersion (RN-10/CU-05)', async () => {
    const fakes = makeFakes([makeUser({ mustChangePassword: true, tokenVersion: 2 })]);

    const result = await createAuthService(fakes).changePassword({
      userId: 'user-1',
      currentPassword: SENHA,
      newPassword: NOVA,
      ip: IP,
    });

    const salvo = await fakes.users.findById('user-1');
    expect(salvo?.mustChangePassword).toBe(false);
    expect(salvo?.tokenVersion).toBe(3);
    expect(salvo?.passwordHash).not.toBe(passwordHash);
    expect(salvo?.passwordHash).not.toContain(NOVA);
    expect(result.user.mustChangePassword).toBe(false);
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('devolve um token novo, com o tokenVersion atualizado, para a sessão atual continuar', async () => {
    const fakes = makeFakes([makeUser({ tokenVersion: 2 })]);

    const result = await createAuthService(fakes).changePassword({
      userId: 'user-1',
      currentPassword: SENHA,
      newPassword: NOVA,
    });

    expect(verifySessionToken(result.token)).toEqual({ userId: 'user-1', tokenVersion: 3 });
  });

  it('a senha nova passa a valer no login e a antiga não entra mais', async () => {
    const fakes = makeFakes();
    const service = createAuthService(fakes);

    await service.changePassword({ userId: 'user-1', currentPassword: SENHA, newPassword: NOVA });

    await expect(service.login({ email: EMAIL, password: NOVA })).resolves.toMatchObject({
      user: { id: 'user-1' },
    });
    await expect(service.login({ email: EMAIL, password: SENHA })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('grava PASSWORD_CHANGED na auditoria, sem nenhuma senha em texto puro (RN-13/RN-14)', async () => {
    const fakes = makeFakes();

    await createAuthService(fakes).changePassword({
      userId: 'user-1',
      currentPassword: SENHA,
      newPassword: NOVA,
      ip: IP,
    });

    expect(fakes.auditLogs.entries).toHaveLength(1);
    expect(fakes.auditLogs.entries[0]).toMatchObject({
      action: AuditAction.PASSWORD_CHANGED,
      actorId: 'user-1',
      targetUserId: 'user-1',
      email: EMAIL,
      ip: IP,
    });
    const registrado = JSON.stringify(fakes.auditLogs.entries);
    expect(registrado).not.toContain(SENHA);
    expect(registrado).not.toContain(NOVA);
  });

  it('recusa a senha atual incorreta e não altera nada', async () => {
    const fakes = makeFakes();

    await expect(
      createAuthService(fakes).changePassword({
        userId: 'user-1',
        currentPassword: 'nao-e-a-atual',
        newPassword: NOVA,
      }),
    ).rejects.toMatchObject({ status: 422, code: 'WRONG_CURRENT_PASSWORD' });

    const salvo = await fakes.users.findById('user-1');
    expect(salvo?.passwordHash).toBe(passwordHash);
    expect(salvo?.tokenVersion).toBe(0);
    expect(fakes.auditLogs.entries).toHaveLength(0);
  });

  it('recusa a senha nova com menos de 6 caracteres (RN-03)', async () => {
    const fakes = makeFakes();

    await expect(
      createAuthService(fakes).changePassword({
        userId: 'user-1',
        currentPassword: SENHA,
        newPassword: '12345',
      }),
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect((await fakes.users.findById('user-1'))?.passwordHash).toBe(passwordHash);
  });

  it('recusa a senha nova igual à atual (RN-03)', async () => {
    const fakes = makeFakes();

    await expect(
      createAuthService(fakes).changePassword({
        userId: 'user-1',
        currentPassword: SENHA,
        newPassword: SENHA,
      }),
    ).rejects.toMatchObject({ status: 422, code: 'SAME_PASSWORD' });
    expect(fakes.auditLogs.entries).toHaveLength(0);
  });

  it('recusa a troca de senha de usuário inexistente ou desativado (RN-09)', async () => {
    const inexistente = createAuthService(makeFakes()).changePassword({
      userId: 'nao-existe',
      currentPassword: SENHA,
      newPassword: NOVA,
    });
    const desativado = createAuthService(makeFakes([makeUser({ isActive: false })])).changePassword({
      userId: 'user-1',
      currentPassword: SENHA,
      newPassword: NOVA,
    });

    await expect(inexistente).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    await expect(desativado).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  });
});
