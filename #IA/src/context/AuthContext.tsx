import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { isApiError } from '@/services/apiClient';
import {
  changePassword as changePasswordRequest,
  getSession,
  login as loginRequest,
  logout as logoutRequest,
} from '@/services/authService';
import type {
  AuthStatus,
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  Permission,
} from '@/types/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  permissions: Permission[];
  status: AuthStatus;
  login: (credentials: LoginRequest) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  changePassword: (payload: ChangePasswordRequest) => Promise<void>;
  /** Só cosmético: esconder item de menu. A checagem que vale é a do backend. */
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface SessionState {
  user: AuthUser | null;
  permissions: Permission[];
  status: AuthStatus;
}

const LOGGED_OUT: SessionState = { user: null, permissions: [], status: 'unauthenticated' };

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState<SessionState>({
    user: null,
    permissions: [],
    status: 'loading',
  });

  /** Busca `/api/auth/me`. 401 (ou qualquer falha) significa apenas "sem sessão", sem erro visível. */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const { user, permissions } = await getSession();
      setSession({ user, permissions, status: 'authenticated' });
    } catch {
      setSession(LOGGED_OUT);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (credentials: LoginRequest): Promise<AuthUser> => {
      // O erro sobe para quem chamou (com status e code) para o formulário exibir a mensagem.
      const { user } = await loginRequest(credentials);
      await refresh();
      return user;
    },
    [refresh],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
    } catch (error) {
      // Sair nunca falha para o usuário: o estado local é limpo de qualquer jeito.
      if (!isApiError(error)) {
        throw error;
      }
    } finally {
      setSession(LOGGED_OUT);
    }
  }, []);

  const changePassword = useCallback(
    async (payload: ChangePasswordRequest): Promise<void> => {
      await changePasswordRequest(payload);
      await refresh();
    },
    [refresh],
  );

  const can = useCallback(
    (permission: Permission): boolean => session.permissions.includes(permission),
    [session.permissions],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session.user,
      permissions: session.permissions,
      status: session.status,
      login,
      logout,
      refresh,
      changePassword,
      can,
    }),
    [session, login, logout, refresh, changePassword, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um <AuthProvider>.');
  }
  return context;
}
