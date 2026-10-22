import type { RequestHandler } from 'express';

import type { AuthService } from '@server/services/authService';
import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  MeResponse,
} from '@server/types/auth';
import { HttpError } from '@server/utils/httpError';
import {
  clearSessionCookieOptions,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '@server/utils/jwt';
import { permissionsFor } from '@server/utils/permissions';

export interface AuthController {
  login: RequestHandler;
  logout: RequestHandler;
  me: RequestHandler;
  changePassword: RequestHandler;
}

/**
 * Handlers de `/api/auth`. Camada fina: a regra fica no `authService`; aqui só
 * entra o que é HTTP — cookie de sessão, status e corpo da resposta.
 *
 * O corpo já chega validado pelo `validate()` da rota, e o token nunca aparece
 * na resposta JSON: vive somente no cookie HttpOnly (RN-08).
 */
export function createAuthController(service: AuthService): AuthController {
  return {
    login: async (req, res) => {
      const { email, password } = req.body as LoginRequest;
      // O IP vai só para a auditoria (RN-14).
      const { user, token } = await service.login({ email, password, ip: req.ip ?? null });

      res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
      res.status(200).json({ user } satisfies LoginResponse);
    },

    /**
     * Logout é público e idempotente: só apaga o cookie. As opções vêm de
     * `clearSessionCookieOptions()` — repetidas à mão, um `path` ou `sameSite`
     * diferente faria o navegador manter o cookie antigo.
     */
    logout: (_req, res) => {
      res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
      res.status(204).end();
    },

    me: (req, res) => {
      const user = req.user;

      if (!user) {
        throw HttpError.unauthorized();
      }

      res.status(200).json({ user, permissions: permissionsFor(user.role) } satisfies MeResponse);
    },

    changePassword: async (req, res) => {
      const user = req.user;

      if (!user) {
        throw HttpError.unauthorized();
      }

      const { currentPassword, newPassword } = req.body as ChangePasswordRequest;
      // A troca incrementa o `tokenVersion` e invalida o cookie atual (RN-10):
      // por isso a sessão de quem trocou é reemitida na mesma resposta.
      const { token } = await service.changePassword({
        userId: user.id,
        currentPassword,
        newPassword,
        ip: req.ip ?? null,
      });

      res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
      res.status(204).end();
    },
  };
}
