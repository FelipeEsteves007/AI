import { AuditAction } from '@prisma/client';

import type { AuthRepositories, PublicUser } from '@server/types/auth';
import { HttpError } from '@server/utils/httpError';
import { signSessionToken } from '@server/utils/jwt';
import { hashPassword, verifyPassword } from '@server/utils/password';
import { normalizeEmail, toPublicUser } from '@server/utils/userMapper';

/** Janela de contagem das falhas de login (RN-07). */
export const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/** Falhas na janela que já bloqueiam a próxima tentativa (RN-07). */
export const MAX_LOGIN_FAILURES = 5;

/** Tamanho mínimo da senha escolhida pelo usuário (RN-03). */
export const MIN_PASSWORD_LENGTH = 6;

export interface LoginInput {
  email: string;
  password: string;
  /** IP da requisição, só para a auditoria (RN-14). */
  ip?: string | null;
}

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
  ip?: string | null;
}

/** Sessão emitida: o usuário para a resposta e o JWT que vai no cookie HttpOnly (RN-08). */
export interface SessionResult {
  user: PublicUser;
  token: string;
}

export interface AuthService {
  login(input: LoginInput): Promise<SessionResult>;
  changePassword(input: ChangePasswordInput): Promise<SessionResult>;
}

/**
 * Serviço de autenticação: login com bloqueio por tentativas e troca de senha.
 * Recebe os repositórios por injeção — Prisma em produção, fakes em memória nos testes.
 *
 * Nenhuma senha em texto puro é registrada em auditoria nem em log (RN-13).
 */
export function createAuthService({ users, auditLogs }: AuthRepositories): AuthService {
  /**
   * Falhas que valem para o bloqueio: as dos últimos 15 minutos, contadas a partir do
   * último login bem-sucedido, quando ele for mais recente que o início da janela (RN-07).
   */
  async function isBlocked(email: string, now: Date): Promise<boolean> {
    const windowStart = new Date(now.getTime() - LOGIN_ATTEMPT_WINDOW_MS);
    const lastSuccessAt = await auditLogs.findLastSuccessfulLoginAt(email);
    const since =
      lastSuccessAt && lastSuccessAt.getTime() > windowStart.getTime() ? lastSuccessAt : windowStart;

    return (await auditLogs.countFailedLoginsSince(email, since)) >= MAX_LOGIN_FAILURES;
  }

  async function login({ email, password, ip = null }: LoginInput): Promise<SessionResult> {
    const normalizedEmail = normalizeEmail(email);

    if (await isBlocked(normalizedEmail, new Date())) {
      await auditLogs.record({ action: AuditAction.LOGIN_BLOCKED, email: normalizedEmail, ip });

      throw HttpError.loginBlocked();
    }

    const user = await users.findByEmail(normalizedEmail);
    const passwordMatches = user ? await verifyPassword(password, user.passwordHash) : false;

    // Usuário inexistente, desativado ou senha errada dão exatamente a mesma resposta (RN-06).
    if (!user || !user.isActive || !passwordMatches) {
      await auditLogs.record({
        action: AuditAction.LOGIN_FAILURE,
        targetUserId: user?.id ?? null,
        email: normalizedEmail,
        ip,
      });

      throw HttpError.invalidCredentials();
    }

    await auditLogs.record({
      action: AuditAction.LOGIN_SUCCESS,
      actorId: user.id,
      targetUserId: user.id,
      email: normalizedEmail,
      ip,
    });

    return {
      user: toPublicUser(user),
      token: signSessionToken({ userId: user.id, tokenVersion: user.tokenVersion }),
    };
  }

  async function changePassword({
    userId,
    currentPassword,
    newPassword,
    ip = null,
  }: ChangePasswordInput): Promise<SessionResult> {
    const user = await users.findById(userId);

    // Sessão de usuário inexistente ou já desativado não troca senha (RN-09).
    if (!user || !user.isActive) {
      throw HttpError.unauthorized();
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw HttpError.validation('Dados inválidos', {
        newPassword: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
      });
    }

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new HttpError(422, 'WRONG_CURRENT_PASSWORD', 'Senha atual incorreta');
    }

    if (await verifyPassword(newPassword, user.passwordHash)) {
      throw new HttpError(422, 'SAME_PASSWORD', 'A nova senha precisa ser diferente da atual');
    }

    // tokenVersion + 1 invalida as outras sessões do usuário (RN-10).
    const updated = await users.update(user.id, {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
      tokenVersion: user.tokenVersion + 1,
    });

    await auditLogs.record({
      action: AuditAction.PASSWORD_CHANGED,
      actorId: updated.id,
      targetUserId: updated.id,
      email: updated.email,
      ip,
    });

    return {
      user: toPublicUser(updated),
      token: signSessionToken({ userId: updated.id, tokenVersion: updated.tokenVersion }),
    };
  }

  return { login, changePassword };
}
