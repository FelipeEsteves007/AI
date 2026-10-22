import { useRouter } from 'next/router';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';

export const LOGIN_ROUTE = '/login';
export const CHANGE_PASSWORD_ROUTE = '/change-password';

/** Rotas que aparecem sem sessão. Nunca redirecionam — é o que quebra o laço com `/login`. */
const PUBLIC_ROUTES: readonly string[] = [LOGIN_ROUTE];

/** Usado também pelo `_app` para deixar a tela de login fora do menu autenticado. */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname);
}

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Guarda cosmética de rotas: decide o que a interface mostra enquanto o backend continua sendo
 * a única autoridade de acesso (todas as rotas da API respondem 401/403 por conta própria).
 *
 * Laço de redirecionamento: `/login` é pública e sai antes de qualquer checagem; o destino do
 * redirecionamento por senha provisória (`/change-password`) é comparado com a rota atual, então
 * nenhuma rota manda para ela mesma.
 */
export function AuthGuard({ children }: AuthGuardProps): JSX.Element | null {
  const router = useRouter();
  const { status, user } = useAuth();

  const publicRoute = isPublicRoute(router.pathname);
  const isChangePasswordRoute = router.pathname === CHANGE_PASSWORD_ROUTE;

  const mustChangePassword = status === 'authenticated' && user?.mustChangePassword === true;

  let redirectTo: string | null = null;
  if (!publicRoute) {
    if (status === 'unauthenticated') {
      redirectTo = LOGIN_ROUTE;
    } else if (mustChangePassword && !isChangePasswordRoute) {
      // RN-05: com senha provisória só a troca de senha (e o logout) ficam disponíveis.
      redirectTo = CHANGE_PASSWORD_ROUTE;
    }
  }

  useEffect(() => {
    if (redirectTo) {
      void router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  if (publicRoute) {
    return <>{children}</>;
  }

  if (status === 'loading' || redirectTo) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[50vh] items-center justify-center"
      >
        <span className="text-sm text-gray-500">Carregando…</span>
      </div>
    );
  }

  return <>{children}</>;
}
