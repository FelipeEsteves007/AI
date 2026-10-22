import { fireEvent, render, screen } from '@testing-library/react';

import { Layout } from '@/components/Layout/Layout';
import type { AuthContextValue } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser, Permission, UserRole } from '@/types/auth';

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

let pathname = '/';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname }),
}));

const useAuthMock = useAuth as jest.MockedFunction<typeof useAuth>;
const logout = jest.fn();

function makeUser(role: UserRole, name: string): AuthUser {
  return {
    id: `id-${role}`,
    name,
    email: `${role}@crm.test`,
    role,
    isActive: true,
    mustChangePassword: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function mockSession(user: AuthUser | null, permissions: Permission[]): void {
  useAuthMock.mockReturnValue({
    user,
    permissions,
    status: user ? 'authenticated' : 'unauthenticated',
    login: jest.fn(),
    logout,
    refresh: jest.fn(),
    changePassword: jest.fn(),
    can: (permission: Permission) => permissions.includes(permission),
  } as unknown as AuthContextValue);
}

beforeEach(() => {
  jest.clearAllMocks();
  pathname = '/';
  mockSession(null, []);
});

describe('Layout', () => {
  it('renderiza o cabeçalho e o conteúdo da página', () => {
    render(
      <Layout>
        <p>conteúdo</p>
      </Layout>,
    );

    expect(screen.getByText('CRM de Alunos')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('conteúdo');
  });

  describe('sem usuário autenticado', () => {
    it('não mostra menu nem botão Sair', () => {
      render(
        <Layout>
          <p>login</p>
        </Layout>,
      );

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Alunos' })).not.toBeInTheDocument();
    });
  });

  describe('com usuário autenticado', () => {
    it('mostra o nome do usuário', () => {
      mockSession(makeUser('vendedor', 'Marina Vendas'), ['tasks:write']);

      render(
        <Layout>
          <p>conteúdo</p>
        </Layout>,
      );

      expect(screen.getByText('Marina Vendas')).toBeInTheDocument();
    });

    it('mostra os itens de navegação do sistema em um nav rotulado', () => {
      mockSession(makeUser('ceo', 'Carlos CEO'), ['data:view-all', 'tasks:write']);

      render(
        <Layout>
          <p>conteúdo</p>
        </Layout>,
      );

      expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
      for (const item of ['Dashboard', 'Alunos', 'Cursos', 'Pipeline', 'Tarefas']) {
        expect(screen.getByRole('link', { name: item })).toBeInTheDocument();
      }
    });

    it('marca o item da rota atual com aria-current', () => {
      pathname = '/students';
      mockSession(makeUser('admin', 'Ana Admin'), ['users:manage']);

      render(
        <Layout>
          <p>conteúdo</p>
        </Layout>,
      );

      expect(screen.getByRole('link', { name: 'Alunos' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
    });

    it('chama logout ao clicar em Sair', () => {
      mockSession(makeUser('admin', 'Ana Admin'), ['users:manage']);

      render(
        <Layout>
          <p>conteúdo</p>
        </Layout>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

      expect(logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('menu no mobile (rolagem horizontal)', () => {
    const rectOf = (left: number, right: number): DOMRect =>
      ({ left, right, top: 0, bottom: 40, width: right - left, height: 40, x: left, y: 0 }) as DOMRect;

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('rola sem mostrar a barra de rolagem', () => {
      mockSession(makeUser('admin', 'Ana Admin'), ['users:manage']);

      render(
        <Layout>
          <p>conteúdo</p>
        </Layout>,
      );

      const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
      expect(nav).toHaveClass('overflow-x-auto', '[scrollbar-width:none]', '[&::-webkit-scrollbar]:hidden');
    });

    it('traz o item ativo para a área visível quando ele está fora, à direita', () => {
      pathname = '/settings/users';
      mockSession(makeUser('admin', 'Ana Admin'), ['users:manage']);
      const writes: number[] = [];
      jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        if (this.tagName === 'NAV') return rectOf(0, 390);
        if (this.getAttribute('aria-current') === 'page') return rectOf(420, 500);
        return rectOf(0, 0);
      });
      jest.spyOn(HTMLElement.prototype, 'scrollLeft', 'get').mockReturnValue(0);
      jest.spyOn(HTMLElement.prototype, 'scrollLeft', 'set').mockImplementation((value: number) => {
        writes.push(value);
      });

      render(
        <Layout>
          <p>conteúdo</p>
        </Layout>,
      );

      expect(writes).toEqual([110]);
    });

    it('não mexe na rolagem quando o item ativo já está visível (desktop)', () => {
      pathname = '/students';
      mockSession(makeUser('admin', 'Ana Admin'), ['users:manage']);
      const setter = jest.fn();
      jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        if (this.tagName === 'NAV') return rectOf(400, 900);
        if (this.getAttribute('aria-current') === 'page') return rectOf(480, 560);
        return rectOf(0, 0);
      });
      jest.spyOn(HTMLElement.prototype, 'scrollLeft', 'set').mockImplementation(setter);

      render(
        <Layout>
          <p>conteúdo</p>
        </Layout>,
      );

      expect(setter).not.toHaveBeenCalled();
    });
  });

  describe('item Usuários (permissão users:manage)', () => {
    it('aparece para quem tem a permissão users:manage', () => {
      mockSession(makeUser('admin', 'Ana Admin'), ['users:manage']);

      render(
        <Layout>
          <p>conteúdo</p>
        </Layout>,
      );

      const link = screen.getByRole('link', { name: 'Usuários' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/settings/users');
    });

    it('não aparece para o CEO', () => {
      mockSession(makeUser('ceo', 'Carlos CEO'), ['data:view-all', 'tasks:write']);

      render(
        <Layout>
          <p>conteúdo</p>
        </Layout>,
      );

      expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument();
    });

    it('não aparece para o vendedor', () => {
      mockSession(makeUser('vendedor', 'Marina Vendas'), ['tasks:write']);

      render(
        <Layout>
          <p>conteúdo</p>
        </Layout>,
      );

      expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument();
    });
  });
});
