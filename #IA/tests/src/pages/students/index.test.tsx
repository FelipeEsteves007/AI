import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import StudentsPage from '@/pages/students';
import { ApiError } from '@/services/apiClient';
import type { AuthUser, Permission } from '@/types/auth';
import type { StudentListResponse, StudentResponse } from '@/types/students';

import { makeStudent } from '../../components/Students/studentFixtures';

let permissions: Permission[] = [];

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-1' },
    permissions,
    can: (permission: Permission) => permissions.includes(permission),
  }),
}));

const push = jest.fn();
const replace = jest.fn();
let query: Record<string, string> = {};

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/students', query, isReady: true, push, replace }),
}));

const listStudents = jest.fn();
const deleteStudent = jest.fn();

jest.mock('@/services/studentsService', () => ({
  listStudents: (...args: unknown[]) => listStudents(...args),
  deleteStudent: (...args: unknown[]) => deleteStudent(...args),
}));

const listUsers = jest.fn();

jest.mock('@/services/usersService', () => ({
  listUsers: (...args: unknown[]) => listUsers(...args),
}));

const sendBulkEmail = jest.fn();

jest.mock('@/services/emailService', () => ({
  sendBulkEmail: (...args: unknown[]) => sendBulkEmail(...args),
}));

const downloadStudentsCsv = jest.fn();

jest.mock('@/services/reportsService', () => ({
  downloadStudentsCsv: (...args: unknown[]) => downloadStudentsCsv(...args),
}));

const ADMIN: Permission[] = [
  'users:manage',
  'students:import',
  'settings:manage',
  'courses:manage',
  'students:delete',
  'data:view-all',
  'tasks:write',
];
const CEO: Permission[] = ['data:view-all', 'tasks:write'];
const VENDEDOR: Permission[] = ['tasks:write'];

const joao = makeStudent();
const ana = makeStudent({ id: 's-2', name: 'Ana Lima', email: 'ana@email.com', status: 'pausado' });

function page(
  data: StudentResponse[],
  pagination: Partial<StudentListResponse['pagination']> = {},
): StudentListResponse {
  return {
    data,
    pagination: { page: 1, limit: 50, total: data.length, totalPages: 1, ...pagination },
  };
}

function user(id: string, name: string): AuthUser {
  return {
    id,
    name,
    email: `${id}@crm.dev`,
    role: 'vendedor',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function lastParams(): Record<string, unknown> {
  const calls = listStudents.mock.calls;
  return calls[calls.length - 1][0] as Record<string, unknown>;
}

const table = (): HTMLElement => screen.getByRole('table');

/**
 * Espera a listagem terminar de carregar (sem skeleton nem `aria-busy="true"`). Todo teste que
 * dispara uma nova busca termina aqui, para a promise do `listStudents` não resolver depois do
 * fim do teste, fora do `act(...)`.
 */
async function waitForListIdle(): Promise<void> {
  await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull());
}

beforeEach(() => {
  permissions = VENDEDOR;
  query = {};
  push.mockReset();
  replace.mockReset();
  listStudents.mockReset().mockResolvedValue(page([joao, ana]));
  deleteStudent.mockReset().mockResolvedValue(undefined);
  listUsers.mockReset().mockResolvedValue([user('u-2', 'Bob Vendedor'), user('u-3', 'Carol Vendas')]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('página de alunos', () => {
  it('pede a primeira página com a ordenação padrão e mostra os alunos', async () => {
    render(<StudentsPage />);

    expect(await within(await screen.findByRole('table')).findByRole('row', { name: /joão silva/i }))
      .toBeInTheDocument();
    expect(within(table()).getByRole('row', { name: /ana lima/i })).toBeInTheDocument();
    expect(listStudents).toHaveBeenCalledTimes(1);
    expect(lastParams()).toEqual({ page: 1, limit: 50, sortBy: 'createdAt', order: 'desc' });
  });

  it('mostra o skeleton enquanto carrega', async () => {
    let resolve: (value: StudentListResponse) => void = () => undefined;
    listStudents.mockReturnValue(
      new Promise<StudentListResponse>((done) => {
        resolve = done;
      }),
    );

    render(<StudentsPage />);

    expect(screen.getByRole('status')).toHaveTextContent(/carregando alunos/i);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await act(async () => resolve(page([joao])));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('mostra mensagem de erro quando a listagem falha e permite tentar de novo', async () => {
    listStudents.mockRejectedValueOnce(new ApiError(500, 'UNKNOWN_ERROR', 'boom'));

    render(<StudentsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar os alunos/i);

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(await within(await screen.findByRole('table')).findByRole('row', { name: /joão silva/i }))
      .toBeInTheDocument();
    expect(listStudents).toHaveBeenCalledTimes(2);
  });

  it('mostra estado vazio sem alunos', async () => {
    listStudents.mockResolvedValue(page([]));

    render(<StudentsPage />);

    expect(await screen.findByText(/nenhum aluno cadastrado/i)).toBeInTheDocument();
  });

  it('busca com debounce de 300 ms e volta para a página 1', async () => {
    listStudents.mockResolvedValue(page([joao], { page: 1, total: 120, totalPages: 3 }));
    render(<StudentsPage />);
    await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    await waitFor(() => expect(lastParams()).toMatchObject({ page: 2 }));
    const callsBefore = listStudents.mock.calls.length;

    jest.useFakeTimers();
    fireEvent.change(screen.getByRole('searchbox', { name: /buscar/i }), {
      target: { value: 'ana' },
    });
    act(() => jest.advanceTimersByTime(299));
    expect(listStudents).toHaveBeenCalledTimes(callsBefore);

    act(() => jest.advanceTimersByTime(1));
    await waitFor(() => expect(listStudents).toHaveBeenCalledTimes(callsBefore + 1));
    expect(lastParams()).toMatchObject({ search: 'ana', page: 1 });
    await waitForListIdle();
    expect(within(table()).getByRole('row', { name: /joão silva/i })).toBeInTheDocument();
  });

  it('combina busca, status e ordenação nos parâmetros enviados', async () => {
    render(<StudentsPage />);
    await screen.findByRole('table');

    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'inativo' } });
    await waitFor(() => expect(lastParams()).toMatchObject({ status: 'inativo' }));

    fireEvent.click(within(table()).getByRole('button', { name: /nome/i }));
    await waitFor(() => expect(lastParams()).toMatchObject({ sortBy: 'name', order: 'asc' }));

    fireEvent.click(within(table()).getByRole('button', { name: /nome/i }));
    await waitFor(() => expect(lastParams()).toMatchObject({ sortBy: 'name', order: 'desc' }));

    jest.useFakeTimers();
    fireEvent.change(screen.getByRole('searchbox', { name: /buscar/i }), {
      target: { value: 'lima' },
    });
    act(() => jest.advanceTimersByTime(300));
    await waitFor(() =>
      expect(lastParams()).toEqual({
        page: 1,
        limit: 50,
        status: 'inativo',
        search: 'lima',
        sortBy: 'name',
        order: 'desc',
      }),
    );
    await waitForListIdle();
    expect(within(table()).getByRole('row', { name: /ana lima/i })).toBeInTheDocument();
  });

  it('mostra estado vazio de filtro e limpa os filtros', async () => {
    render(<StudentsPage />);
    await screen.findByRole('table');

    listStudents.mockResolvedValue(page([]));
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'pausado' } });

    expect(await screen.findByText(/nenhum aluno encontrado/i)).toBeInTheDocument();

    listStudents.mockResolvedValue(page([joao]));
    fireEvent.click(screen.getAllByRole('button', { name: /limpar filtros/i })[0]);

    await waitFor(() =>
      expect(lastParams()).toEqual({ page: 1, limit: 50, sortBy: 'createdAt', order: 'desc' }),
    );
    expect(await within(await screen.findByRole('table')).findByRole('row', { name: /joão silva/i }))
      .toBeInTheDocument();
    await waitForListIdle();
  });

  it('paginação muda a página pedida', async () => {
    listStudents.mockResolvedValue(page([joao], { total: 150, totalPages: 3 }));
    render(<StudentsPage />);
    await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: 'Página 3' }));
    await waitFor(() => expect(lastParams()).toMatchObject({ page: 3 }));

    listStudents.mockResolvedValue(page([joao], { page: 3, total: 150, totalPages: 3 }));
    fireEvent.click(screen.getByRole('button', { name: /anterior/i }));
    await waitFor(() => expect(lastParams()).toMatchObject({ page: 2 }));
    await waitForListIdle();
  });

  it('clique na linha navega para /students/[id]', async () => {
    render(<StudentsPage />);

    fireEvent.click(await within(await screen.findByRole('table')).findByRole('row', { name: /ana lima/i }));

    expect(push).toHaveBeenCalledWith('/students/s-2');
  });

  it('Editar navega para o detalhe do aluno', async () => {
    render(<StudentsPage />);
    const row = await within(await screen.findByRole('table')).findByRole('row', { name: /joão silva/i });

    fireEvent.click(within(row).getByRole('button', { name: /editar/i }));

    expect(push).toHaveBeenCalledWith('/students/s-1');
  });

  it('reflete filtros e página na URL sem recarregar', async () => {
    render(<StudentsPage />);
    await screen.findByRole('table');

    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'ativo' } });

    await waitFor(() =>
      expect(replace).toHaveBeenLastCalledWith(
        { pathname: '/students', query: { status: 'ativo' } },
        undefined,
        { shallow: true },
      ),
    );
    await waitForListIdle();
  });

  it('lê o estado inicial da URL', async () => {
    query = { page: '2', status: 'pausado', search: 'ana', sortBy: 'name', order: 'asc' };

    render(<StudentsPage />);
    await screen.findByRole('table');

    expect(listStudents).toHaveBeenCalledTimes(1);
    expect(lastParams()).toEqual({
      page: 2,
      limit: 50,
      status: 'pausado',
      search: 'ana',
      sortBy: 'name',
      order: 'asc',
    });
    expect(screen.getByRole('searchbox', { name: /buscar/i })).toHaveValue('ana');
  });

  it('ignora valores inválidos na URL', async () => {
    query = { page: 'abc', status: 'banido', sortBy: 'cpf', order: 'up' };

    render(<StudentsPage />);
    await screen.findByRole('table');

    expect(lastParams()).toEqual({ page: 1, limit: 50, sortBy: 'createdAt', order: 'desc' });
  });

  it('descarta assignedTo que não é uuid e corta a busca em 255 caracteres', async () => {
    query = { assignedTo: 'abc', search: 'x'.repeat(300) };

    render(<StudentsPage />);
    await screen.findByRole('table');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const params = lastParams();
    expect(params.assignedTo).toBeUndefined();
    expect(params.search).toBe('x'.repeat(255));
  });

  it('/students?assignedTo=abc carrega a lista sem erro', async () => {
    query = { assignedTo: 'abc' };

    render(<StudentsPage />);

    expect(await within(await screen.findByRole('table')).findByRole('row', { name: /joão silva/i }))
      .toBeInTheDocument();
    expect(lastParams()).toEqual({ page: 1, limit: 50, sortBy: 'createdAt', order: 'desc' });
  });

  it('aceita assignedTo uuid vindo da URL', async () => {
    const uuid = '0b7f5a1e-3c2d-4e5f-8a9b-1c2d3e4f5a6b';
    query = { assignedTo: uuid };

    render(<StudentsPage />);
    await screen.findByRole('table');

    expect(lastParams()).toMatchObject({ assignedTo: uuid });
  });

  it('400 VALIDATION_ERROR volta os filtros ao padrão em vez de repetir a query', async () => {
    query = { status: 'pausado', search: 'ana' };
    listStudents
      .mockRejectedValueOnce(new ApiError(400, 'VALIDATION_ERROR', 'Parâmetros inválidos'))
      .mockResolvedValue(page([joao]));

    render(<StudentsPage />);

    expect(await within(await screen.findByRole('table')).findByRole('row', { name: /joão silva/i }))
      .toBeInTheDocument();
    expect(listStudents).toHaveBeenCalledTimes(2);
    expect(lastParams()).toEqual({ page: 1, limit: 50, sortBy: 'createdAt', order: 'desc' });
  });

  it('400 com filtros já no padrão mostra o erro sem repetir a query', async () => {
    listStudents.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'Parâmetros inválidos'));

    render(<StudentsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar/i);
    expect(listStudents).toHaveBeenCalledTimes(1);
  });

  describe('RBAC cosmético', () => {
    it('vendedor não vê Excluir nem o filtro de vendedor', async () => {
      permissions = VENDEDOR;
      render(<StudentsPage />);
      await screen.findByRole('table');

      expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/vendedor/i)).not.toBeInTheDocument();
      expect(listUsers).not.toHaveBeenCalled();
    });

    it('CEO não vê Excluir nem o filtro de vendedor (S6-8)', async () => {
      permissions = CEO;
      render(<StudentsPage />);
      await screen.findByRole('table');

      expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/vendedor/i)).not.toBeInTheDocument();
      expect(listUsers).not.toHaveBeenCalled();
    });

    it('admin filtra por vendedor', async () => {
      permissions = ADMIN;
      render(<StudentsPage />);

      const select = await screen.findByLabelText(/vendedor/i);
      expect(within(select).getByRole('option', { name: 'Carol Vendas' })).toBeInTheDocument();

      fireEvent.change(select, { target: { value: 'u-3' } });

      await waitFor(() => expect(lastParams()).toMatchObject({ assignedTo: 'u-3', page: 1 }));
      await waitForListIdle();
    });

    it('admin sem lista de usuários segue sem o filtro de vendedor', async () => {
      permissions = ADMIN;
      listUsers.mockRejectedValue(new ApiError(500, 'UNKNOWN_ERROR', 'boom'));

      render(<StudentsPage />);
      await screen.findByRole('table');
      await waitFor(() => expect(listUsers).toHaveBeenCalled());

      expect(screen.queryByLabelText(/vendedor/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('admin exclui só depois de confirmar', async () => {
      permissions = ADMIN;
      render(<StudentsPage />);
      const row = await within(await screen.findByRole('table')).findByRole('row', { name: /ana lima/i });

      fireEvent.click(within(row).getByRole('button', { name: /excluir/i }));

      const dialog = screen.getByRole('dialog', { name: /excluir aluno/i });
      expect(deleteStudent).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();

      listStudents.mockResolvedValue(page([joao]));
      fireEvent.click(within(dialog).getByRole('button', { name: /^excluir$/i }));

      await waitFor(() => expect(deleteStudent).toHaveBeenCalledWith('s-2'));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(await screen.findByText(/ana lima foi excluído/i)).toBeInTheDocument();
      await waitFor(() =>
        expect(within(table()).queryByRole('row', { name: /ana lima/i })).not.toBeInTheDocument(),
      );
    });

    it('depois de excluir, o foco vai para o título da página (a linha de quem abriu sumiu)', async () => {
      permissions = ADMIN;
      render(<StudentsPage />);
      const row = await within(await screen.findByRole('table')).findByRole('row', { name: /ana lima/i });
      const opener = within(row).getByRole('button', { name: /excluir/i });
      opener.focus();
      fireEvent.click(opener);

      listStudents.mockResolvedValue(page([joao]));
      await act(async () => {
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^excluir$/i }));
      });

      await waitForListIdle();
      expect(within(table()).queryByRole('row', { name: /ana lima/i })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Alunos' })).toHaveFocus();
    });

    it('404 ao excluir também leva o foco ao título, não ao body', async () => {
      permissions = ADMIN;
      deleteStudent.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Não encontrado'));
      render(<StudentsPage />);
      const row = await within(await screen.findByRole('table')).findByRole('row', { name: /ana lima/i });
      const opener = within(row).getByRole('button', { name: /excluir/i });
      opener.focus();
      fireEvent.click(opener);

      listStudents.mockResolvedValue(page([joao]));
      await act(async () => {
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^excluir$/i }));
      });

      await waitForListIdle();
      expect(within(table()).queryByRole('row', { name: /ana lima/i })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Alunos' })).toHaveFocus();
    });

    it('cancelar a confirmação não exclui', async () => {
      permissions = ADMIN;
      render(<StudentsPage />);
      const row = await within(await screen.findByRole('table')).findByRole('row', { name: /ana lima/i });

      fireEvent.click(within(row).getByRole('button', { name: /excluir/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(deleteStudent).not.toHaveBeenCalled();
    });

    it('excluir o último aluno da página volta uma página', async () => {
      permissions = ADMIN;
      query = { page: '3' };
      listStudents.mockResolvedValue(page([ana], { page: 3, total: 101, totalPages: 3 }));
      render(<StudentsPage />);
      const row = await within(await screen.findByRole('table')).findByRole('row', { name: /ana lima/i });

      fireEvent.click(within(row).getByRole('button', { name: /excluir/i }));
      listStudents.mockResolvedValue(page([], { page: 3, total: 100, totalPages: 2 }));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^excluir$/i }));

      await waitFor(() => expect(lastParams()).toMatchObject({ page: 2 }));
      await waitForListIdle();
    });

    it('explica o 403 na exclusão', async () => {
      permissions = ADMIN;
      deleteStudent.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Proibido'));
      render(<StudentsPage />);
      const row = await within(await screen.findByRole('table')).findByRole('row', { name: /ana lima/i });

      fireEvent.click(within(row).getByRole('button', { name: /excluir/i }));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^excluir$/i }));

      const alert = await within(screen.getByRole('dialog')).findByRole('alert');
      expect(alert).toHaveTextContent(/não tem permissão para excluir/i);
    });

    it('explica o 404 na exclusão e atualiza a lista', async () => {
      permissions = ADMIN;
      deleteStudent.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Não encontrado'));
      render(<StudentsPage />);
      const row = await within(await screen.findByRole('table')).findByRole('row', { name: /ana lima/i });

      fireEvent.click(within(row).getByRole('button', { name: /excluir/i }));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^excluir$/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/não foi encontrado/i);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => expect(listStudents).toHaveBeenCalledTimes(2));
      await waitForListIdle();
    });

    it('mensagem genérica para outras falhas na exclusão', async () => {
      permissions = ADMIN;
      deleteStudent.mockRejectedValue(new Error('rede'));
      render(<StudentsPage />);
      const row = await within(await screen.findByRole('table')).findByRole('row', { name: /ana lima/i });

      fireEvent.click(within(row).getByRole('button', { name: /excluir/i }));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^excluir$/i }));

      expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
        /não foi possível excluir/i,
      );
    });
  });
});

describe('seleção para e-mail e exportação (Sprint 9)', () => {
  it('seleciona alunos, envia o e-mail para a seleção e mostra o resultado', async () => {
    listStudents.mockResolvedValue(page([joao, ana]));
    sendBulkEmail.mockResolvedValue({ sent: 1, failed: 1, results: [] });
    render(<StudentsPage />);
    await screen.findByRole('table');

    expect(screen.getByRole('button', { name: 'Enviar e-mail (0)' })).toBeDisabled();
    fireEvent.click(within(table()).getByRole('checkbox', { name: 'Selecionar todos desta página' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar e-mail (2)' }));

    const dialog = screen.getByRole('dialog', { name: 'Enviar e-mail' });
    expect(dialog).toHaveTextContent('2 alunos selecionados');
    fireEvent.change(within(dialog).getByLabelText('Assunto'), { target: { value: 'Aviso' } });
    fireEvent.change(within(dialog).getByLabelText('Mensagem'), { target: { value: 'Olá {{name}}' } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar' }));
    });

    expect(sendBulkEmail).toHaveBeenCalledWith([joao.id, ana.id], { subject: 'Aviso', body: 'Olá {{name}}' });
    expect(screen.getByRole('status')).toHaveTextContent('E-mail enviado para 1; 1 não recebeu.');
    expect(screen.getByRole('button', { name: 'Enviar e-mail (0)' })).toBeInTheDocument();
    await waitForListIdle();
  });

  it('Exportar CSV só para quem vê tudo, com os filtros da tela', async () => {
    permissions = CEO;
    query = { status: 'pausado', search: 'ana' };
    listStudents.mockResolvedValue(page([ana]));
    downloadStudentsCsv.mockResolvedValue(undefined);
    render(<StudentsPage />);
    await screen.findByRole('table');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    });

    expect(downloadStudentsCsv).toHaveBeenCalledWith({ status: 'pausado', search: 'ana', assignedTo: undefined });
    await waitForListIdle();
  });

  it('vendedor não vê Exportar CSV', async () => {
    permissions = VENDEDOR;
    listStudents.mockResolvedValue(page([joao]));
    render(<StudentsPage />);
    await screen.findByRole('table');

    expect(screen.queryByRole('button', { name: 'Exportar CSV' })).not.toBeInTheDocument();
    await waitForListIdle();
  });
});