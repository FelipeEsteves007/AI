import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import type { Permission } from '@/types/auth';

interface NavItem {
  label: string;
  href: string;
  /**
   * Permissão exigida para o item aparecer. Ausente = visível para qualquer sessão.
   *
   * ATENÇÃO: isto é apenas cosmético. Esconder um item de menu NÃO é controle de acesso —
   * quem barra o acesso é o backend (`requirePermission`, que responde 403) e, no cliente,
   * o `AuthGuard` da rota. A matriz de permissões vive no backend e chega pronta pelo
   * `GET /api/auth/me`; nunca duplicá-la aqui nem comparar `user.role` diretamente.
   */
  permission?: Permission;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Alunos', href: '/students' },
  { label: 'Cursos', href: '/courses' },
  { label: 'Pipeline', href: '/pipeline' },
  { label: 'Tarefas', href: '/tasks' },
  { label: 'Importar', href: '/settings/import', permission: 'students:import' },
  { label: 'Usuários', href: '/settings/users', permission: 'users:manage' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps): JSX.Element {
  const { user, logout, can } = useAuth();
  // Em telas públicas (login) o Layout pode renderizar fora de um RouterContext.
  const pathname = useRouter()?.pathname ?? '';

  const visibleItems = user
    ? NAV_ITEMS.filter((item) => !item.permission || can(item.permission))
    : [];

  // No mobile o menu rola na horizontal sem barra aparente: garante que o item ativo fique à vista.
  // Só mexe no `scrollLeft` do próprio nav (nunca na rolagem da página); no desktop não há corte.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) {
      return;
    }
    const navBox = nav.getBoundingClientRect();
    const itemBox = active.getBoundingClientRect();
    if (itemBox.right > navBox.right) {
      nav.scrollLeft = nav.scrollLeft + (itemBox.right - navBox.right);
    } else if (itemBox.left < navBox.left) {
      nav.scrollLeft = nav.scrollLeft - (navBox.left - itemBox.left);
    }
  }, [pathname, visibleItems.length]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-700">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3">
          <span className="order-1 text-lg font-semibold text-blue-600">CRM de Alunos</span>

          {user ? (
            <nav
              ref={navRef}
              aria-label="Navegação principal"
              className="order-3 -mx-1 w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] sm:order-2 sm:mx-0 sm:w-auto [&::-webkit-scrollbar]:hidden"
            >
              <ul className="flex items-center gap-1 whitespace-nowrap">
                {visibleItems.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={
                          active
                            ? 'block rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700'
                            : 'block rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}

          {user ? (
            <div className="order-2 flex items-center gap-3 sm:order-3">
              <span className="text-sm font-medium text-gray-900">{user.name}</span>
              <button
                type="button"
                onClick={() => {
                  void logout();
                }}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Sair
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
