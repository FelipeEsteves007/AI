import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import CoursesPage from '@/pages/courses';
import { ApiError } from '@/services/apiClient';
import type { CourseResponse } from '@/types/courses';

const can = jest.fn();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ can, user: { id: 'u-1' } }),
}));

const listCourses = jest.fn();
const createCourse = jest.fn();
const updateCourse = jest.fn();
const deleteCourse = jest.fn();

jest.mock('@/services/coursesService', () => ({
  listCourses: (...args: unknown[]) => listCourses(...args),
  createCourse: (...args: unknown[]) => createCourse(...args),
  updateCourse: (...args: unknown[]) => updateCourse(...args),
  deleteCourse: (...args: unknown[]) => deleteCourse(...args),
}));

function makeCourse(overrides: Partial<CourseResponse> = {}): CourseResponse {
  return {
    id: 'c-1',
    name: 'Delphi Avançado',
    description: 'Do zero ao avançado',
    price: 997.5,
    isActive: true,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

const delphi = makeCourse();
const react = makeCourse({ id: 'c-2', name: 'React', description: null, isActive: false });

function pageOf(courses: CourseResponse[]) {
  return { data: courses, pagination: { page: 1, limit: 500, total: courses.length, totalPages: 1 } };
}

beforeEach(() => {
  can.mockReset().mockReturnValue(true);
  listCourses.mockReset().mockResolvedValue(pageOf([delphi, react]));
  createCourse.mockReset().mockResolvedValue(delphi);
  updateCourse.mockReset().mockResolvedValue(delphi);
  deleteCourse.mockReset().mockResolvedValue(undefined);
});

describe('página de cursos', () => {
  it('lista nome, descrição, preço em reais e status', async () => {
    render(<CoursesPage />);

    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('Delphi Avançado');
    expect(rows[1]).toHaveTextContent(/R\$\s997,50/);
    expect(rows[1]).toHaveTextContent('Ativo');
    expect(rows[2]).toHaveTextContent('Inativo');
  });

  it('sem courses:manage não mostra criar, editar nem excluir', async () => {
    can.mockReturnValue(false);
    render(<CoursesPage />);

    await screen.findByText('Delphi Avançado');
    expect(screen.queryByRole('button', { name: '+ Novo curso' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Excluir/ })).not.toBeInTheDocument();
  });

  it('cria curso pelo modal, com preço normalizado, e recarrega', async () => {
    render(<CoursesPage />);
    await screen.findByText('Delphi Avançado');

    fireEvent.click(screen.getByRole('button', { name: '+ Novo curso' }));
    const dialog = screen.getByRole('dialog', { name: 'Novo curso' });
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Claude Code' } });
    fireEvent.change(within(dialog).getByLabelText('Preço (R$)'), { target: { value: '1997,5' } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    });

    expect(createCourse).toHaveBeenCalledWith({
      name: 'Claude Code',
      description: null,
      price: '1997.50',
      isActive: true,
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(listCourses).toHaveBeenCalledTimes(2);
  });

  it('valida nome e preço antes de chamar a API', async () => {
    render(<CoursesPage />);
    await screen.findByText('Delphi Avançado');

    fireEvent.click(screen.getByRole('button', { name: '+ Novo curso' }));
    const dialog = screen.getByRole('dialog', { name: 'Novo curso' });
    fireEvent.change(within(dialog).getByLabelText('Preço (R$)'), { target: { value: '10,999' } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    });

    expect(within(dialog).getByText('Informe o nome.')).toBeInTheDocument();
    expect(within(dialog).getByText('Preço inválido: use até 2 casas decimais.')).toBeInTheDocument();
    expect(createCourse).not.toHaveBeenCalled();
  });

  it('edita com os valores atuais preenchidos', async () => {
    render(<CoursesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Delphi Avançado' }));

    const dialog = screen.getByRole('dialog', { name: 'Editar curso' });
    expect(within(dialog).getByLabelText('Preço (R$)')).toHaveValue('997,50');
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Delphi' } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    });

    expect(updateCourse).toHaveBeenCalledWith('c-1', expect.objectContaining({ name: 'Delphi' }));
  });

  it('excluir pede confirmação e só então chama a API', async () => {
    render(<CoursesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir Delphi Avançado' }));

    const dialog = screen.getByRole('dialog', { name: 'Excluir curso' });
    expect(deleteCourse).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    });

    expect(deleteCourse).toHaveBeenCalledWith('c-1');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('curso com compras: mostra o motivo e mantém o dialog aberto', async () => {
    deleteCourse.mockRejectedValue(new ApiError(409, 'COURSE_HAS_PURCHASES', 'x'));
    render(<CoursesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir Delphi Avançado' }));

    const dialog = screen.getByRole('dialog', { name: 'Excluir curso' });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    });

    expect(within(dialog).getByText(/já tem compras e não pode ser excluído/)).toBeInTheDocument();
  });

  it('falha ao carregar mostra o erro', async () => {
    listCourses.mockRejectedValue(new Error('rede'));
    render(<CoursesPage />);

    expect(await screen.findByText(/Não foi possível carregar os cursos/)).toBeInTheDocument();
  });
});
