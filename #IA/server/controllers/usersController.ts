import type { RequestHandler } from 'express';

import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserService,
} from '@server/services/userService';
import type { PublicUser } from '@server/types/auth';
import { HttpError } from '@server/utils/httpError';

export interface UsersController {
  list: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  resetPassword: RequestHandler;
}

/** Parâmetro de caminho já validado pela rota (`z.uuid()`). */
interface UserIdParams {
  id: string;
}

/**
 * Handlers de `/api/users`. Camada fina: a regra (e-mail em uso, último admin
 * ativo, senha provisória) fica no `userService`; aqui só entra o que é HTTP.
 *
 * O ator de toda operação é o usuário autenticado, que o `requireAuth` colocou
 * em `req.user` — nunca um id vindo do corpo da requisição.
 *
 * A senha provisória em texto puro sai apenas na criação e na redefinição, uma
 * única vez (RN-04); o `user` das respostas é sempre público (RN-13).
 */
export function createUsersController(service: UserService): UsersController {
  /** Id do ator, garantido pelo `requireAuth`; sem ele a operação não acontece. */
  function actorId(user: PublicUser | undefined): string {
    if (!user) {
      throw HttpError.unauthorized();
    }

    return user.id;
  }

  return {
    list: async (_req, res) => {
      res.status(200).json({ users: await service.listUsers() });
    },

    create: async (req, res) => {
      const { name, email, role } = req.body as CreateUserRequest;
      const { user, temporaryPassword } = await service.createUser(
        { name, email, role },
        actorId(req.user),
      );

      res.status(201).json({ user, temporaryPassword });
    },

    update: async (req, res) => {
      const { id } = req.params as unknown as UserIdParams;
      const { name, role, isActive } = req.body as UpdateUserRequest;
      const user = await service.updateUser(id, { name, role, isActive }, actorId(req.user));

      res.status(200).json({ user });
    },

    resetPassword: async (req, res) => {
      const { id } = req.params as unknown as UserIdParams;
      const { user, temporaryPassword } = await service.resetPassword(id, actorId(req.user));

      res.status(200).json({ user, temporaryPassword });
    },
  };
}
