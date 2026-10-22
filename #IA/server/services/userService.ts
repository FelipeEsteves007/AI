import { AuditAction, UserRole, type User } from '@prisma/client';

import type {
  AuditLogEntry,
  AuthRepositories,
  PublicUser,
  UpdateUserData,
} from '@server/types/auth';
import { HttpError } from '@server/utils/httpError';
import { generateTemporaryPassword, hashPassword } from '@server/utils/password';
import { normalizeEmail, toPublicUser } from '@server/utils/userMapper';

/** Corpo de `POST /api/users`. */
export interface CreateUserRequest {
  name: string;
  email: string;
  role: UserRole;
}

/** Corpo de `PUT /api/users/{id}`. Só o que vier é alterado. */
export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Resposta da criação e da redefinição de senha: é o **único** ponto do sistema em que
 * uma senha em texto puro sai do backend, e só uma vez, para o admin (RN-04).
 */
export interface TemporaryPasswordResponse {
  user: PublicUser;
  temporaryPassword: string;
}

/** Gestão de usuários (CU-08 a CU-12). Não conhece `req`/`res` nem o Prisma. */
export interface UserService {
  createUser(input: CreateUserRequest, actorId: string): Promise<TemporaryPasswordResponse>;
  listUsers(): Promise<PublicUser[]>;
  updateUser(id: string, input: UpdateUserRequest, actorId: string): Promise<PublicUser>;
  resetPassword(id: string, actorId: string): Promise<TemporaryPasswordResponse>;
}

export function createUserService({ users, auditLogs }: AuthRepositories): UserService {
  /** Atalho de auditoria: sempre com ator e alvo, nunca com senha (RN-13, RN-14). */
  async function audit(
    action: AuditAction,
    actorId: string,
    target: User,
    metadata?: AuditLogEntry['metadata'],
  ): Promise<void> {
    await auditLogs.record({
      action,
      actorId,
      targetUserId: target.id,
      email: target.email,
      metadata,
    });
  }

  /** Carrega o usuário ou recusa a operação com 404. */
  async function loadUser(id: string): Promise<User> {
    const user = await users.findById(id);

    if (!user) {
      throw HttpError.notFound('Usuário não encontrado');
    }

    return user;
  }

  /**
   * RN-12: o último admin ativo não pode ser desativado nem rebaixado.
   * Só olha o contador quando o alvo é um admin ativo e a mudança pedida o tira
   * do grupo de admins ativos — trocar só o nome, ou reativar, passa direto.
   */
  async function assertNotLastAdmin(target: User, input: UpdateUserRequest): Promise<void> {
    const isActiveAdmin = target.role === UserRole.admin && target.isActive;

    if (!isActiveAdmin) {
      return;
    }

    const isDemotion = input.role !== undefined && input.role !== UserRole.admin;
    const isDeactivation = input.isActive === false;

    if (!isDemotion && !isDeactivation) {
      return;
    }

    if ((await users.countActiveAdmins()) <= 1) {
      throw HttpError.lastAdmin();
    }
  }

  return {
    async createUser({ name, email, role }, actorId) {
      const normalizedEmail = normalizeEmail(email);

      if (await users.findByEmail(normalizedEmail)) {
        throw HttpError.emailInUse();
      }

      const temporaryPassword = generateTemporaryPassword();
      const created = await users.create({
        name,
        email: normalizedEmail,
        passwordHash: await hashPassword(temporaryPassword),
        role,
        mustChangePassword: true,
        isActive: true,
      });

      await audit(AuditAction.USER_CREATED, actorId, created, { role: created.role });

      return { user: toPublicUser(created), temporaryPassword };
    },

    async listUsers() {
      return (await users.list()).map(toPublicUser);
    },

    async updateUser(id, input, actorId) {
      const current = await loadUser(id);

      await assertNotLastAdmin(current, input);

      const roleChanged = input.role !== undefined && input.role !== current.role;
      const activationChanged = input.isActive !== undefined && input.isActive !== current.isActive;
      const deactivated = activationChanged && input.isActive === false;

      const changes: UpdateUserData = {
        name: input.name,
        role: input.role,
        isActive: input.isActive,
        // RN-09: desativar derruba a sessão aberta na requisição seguinte.
        tokenVersion: deactivated ? current.tokenVersion + 1 : undefined,
      };

      const updated = await users.update(id, changes);

      if (roleChanged) {
        await audit(AuditAction.USER_ROLE_CHANGED, actorId, updated, {
          from: current.role,
          to: updated.role,
        });
      }

      if (activationChanged) {
        await audit(
          deactivated ? AuditAction.USER_DEACTIVATED : AuditAction.USER_REACTIVATED,
          actorId,
          updated,
        );
      }

      return toPublicUser(updated);
    },

    async resetPassword(id, actorId) {
      const current = await loadUser(id);
      const temporaryPassword = generateTemporaryPassword();

      const updated = await users.update(id, {
        passwordHash: await hashPassword(temporaryPassword),
        mustChangePassword: true,
        // RN-10: redefinir a senha encerra as outras sessões do usuário.
        tokenVersion: current.tokenVersion + 1,
      });

      await audit(AuditAction.PASSWORD_RESET, actorId, updated);

      return { user: toPublicUser(updated), temporaryPassword };
    },
  };
}
