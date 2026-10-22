import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { groupOf } from '@/components/Tasks/taskGroups';
import TasksPage from '@/pages/tasks';
import type { TaskResponse } from '@/types/tasks';
import { todayDateOnly } from '@/utils/dates';

const listTasks = jest.fn();
const createTask = jest.fn();
const updateTask = jest.fn();
const setTaskCompleted = jest.fn();
const deleteTask = jest.fn();

jest.mock('@/services/tasksService', () => ({
  listTasks: (...args: unknown[]) => listTasks(...args),
  createTask: (...args: unknown[]) => createTask(...args),
  updateTask: (...args: unknown[]) => updateTask(...args),
  setTaskCompleted: (...args: unknown[]) => setTaskCompleted(...args),
  deleteTask: (...args: unknown[]) => deleteTask(...args),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

/** Meio-dia no Brasil do dia `today + offset`. */
function dueIn(offset: number): string {
  const date = new Date(`${todayDateOnly()}T15:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString();
}

function task(overrides: Partial<TaskResponse>): TaskResponse {
  return {
    id: 't-1',
    title: 'Tarefa',
    description: null,
    priority: 'normal',
    dueDate: dueIn(0),
    completed: false,
    completedAt: null,
    studentId: null,
    studentName: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

const tasks = [
  task({ id: 't-overdue', title: 'Atrasada', dueDate: dueIn(-2), priority: 'high' }),
  task({ id: 't-today', title: 'Para hoje', studentId: 's-1', studentName: 'Ana Aluna' }),
  task({ id: 't-next', title: 'Semana que vem', dueDate: dueIn(5) }),
  task({ id: 't-done', title: 'Feita', dueDate: dueIn(-5), completed: true, completedAt: dueIn(-4) }),
];

beforeEach(() => {
  listTasks.mockReset().mockResolvedValue(tasks);
  setTaskCompleted.mockReset().mockImplementation(async (id: string, completed: boolean) => ({
    ...tasks.find((row) => row.id === id),
    completed,
  }));
  createTask.mockReset().mockResolvedValue(task({}));
  updateTask.mockReset();
  deleteTask.mockReset().mockResolvedValue(undefined);
});

describe('tarefas', () => {
  it('agrupa em vencidas, hoje, próximos dias e concluídas', async () => {
    render(<TasksPage />);
    await screen.findByText('Atrasada');

    expect(within(screen.getByRole('region', { name: 'Vencidas' })).getByText('Atrasada')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Hoje' })).getByText('Para hoje')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Próximos dias' })).getByText('Semana que vem'),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Concluídas' })).getByText('Feita')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ana Aluna' })).toHaveAttribute('href', '/students/s-1');
  });

  it('vencidas ficam em vermelho', async () => {
    render(<TasksPage />);
    const item = (await screen.findByText('Atrasada')).closest('li') as HTMLElement;

    expect(item.className).toContain('bg-red-50');
  });

  it('checkbox conclui e move para Concluídas', async () => {
    render(<TasksPage />);
    await screen.findByText('Para hoje');

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: 'Concluir Para hoje' }));
    });

    expect(setTaskCompleted).toHaveBeenCalledWith('t-today', true);
    expect(within(screen.getByRole('region', { name: 'Concluídas' })).getByText('Para hoje')).toBeInTheDocument();
  });

  it('se a API recusar, o checkbox volta e aparece o erro', async () => {
    setTaskCompleted.mockRejectedValue(new Error('rede'));
    render(<TasksPage />);
    await screen.findByText('Para hoje');

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: 'Concluir Para hoje' }));
    });

    expect(screen.getByRole('checkbox', { name: 'Concluir Para hoje' })).not.toBeChecked();
    expect(within(screen.getByRole('region', { name: 'Hoje' })).getByText('Para hoje')).toBeInTheDocument();
    expect(screen.getByText(/Não foi possível atualizar "Para hoje"/)).toBeInTheDocument();
  });

  it('filtros de status e prioridade recarregam', async () => {
    render(<TasksPage />);
    await screen.findByText('Atrasada');

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'open' } });
    });
    expect(listTasks).toHaveBeenLastCalledWith({ completed: false, priority: undefined });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Prioridade'), { target: { value: 'high' } });
    });
    expect(listTasks).toHaveBeenLastCalledWith({ completed: false, priority: 'high' });
  });

  it('nova tarefa pelo modal', async () => {
    render(<TasksPage />);
    await screen.findByText('Atrasada');

    fireEvent.click(screen.getByRole('button', { name: '+ Nova tarefa' }));
    const dialog = screen.getByRole('dialog', { name: 'Nova tarefa' });
    fireEvent.change(within(dialog).getByLabelText('Título'), { target: { value: 'Ligar' } });
    fireEvent.change(within(dialog).getByLabelText('Vencimento'), { target: { value: '2026-10-01' } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    });

    expect(createTask).toHaveBeenCalledWith({
      title: 'Ligar',
      description: null,
      dueDate: '2026-10-01',
      priority: 'normal',
      studentId: null,
    });
  });

  it('clique na tarefa abre o detalhe/edição, que permite excluir', async () => {
    render(<TasksPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Semana que vem' }));

    const dialog = screen.getByRole('dialog', { name: 'Editar tarefa' });
    expect(within(dialog).getByLabelText('Título')).toHaveValue('Semana que vem');
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir tarefa' }));
    });

    expect(deleteTask).toHaveBeenCalledWith('t-next');
    expect(screen.queryByText('Semana que vem')).not.toBeInTheDocument();
  });

  it('groupOf usa o dia no Brasil', () => {
    expect(groupOf(task({ dueDate: '2026-09-14T02:00:00.000Z' }), '2026-09-13')).toBe('today');
  });
});
