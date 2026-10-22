import { render, screen, within } from '@testing-library/react';

import { StudentTasksCard } from '@/components/Students/StudentTasksCard';

import { makeStudentDetail } from './studentFixtures';

const detail = makeStudentDetail();

describe('StudentTasksCard', () => {
  it('destaca as pendentes antes das concluídas', () => {
    render(<StudentTasksCard tasks={detail.tasks} now={new Date('2026-09-16T00:00:00.000Z')} />);

    const pending = screen.getByRole('list', { name: 'Tarefas pendentes' });
    const pendingItems = within(pending).getAllByRole('listitem');
    expect(pendingItems).toHaveLength(2);
    expect(pendingItems[0]).toHaveTextContent('Ligar para João');
    expect(pendingItems[0]).toHaveTextContent('Vencida');
    expect(pendingItems[1]).toHaveTextContent('Enviar material');
    expect(pendingItems[1]).not.toHaveTextContent('Vencida');

    const done = screen.getByRole('list', { name: 'Tarefas concluídas' });
    expect(within(done).getByRole('listitem')).toHaveTextContent('Enviar boas-vindas');
  });

  it('sem pendentes avisa, mas mostra as concluídas', () => {
    render(<StudentTasksCard tasks={detail.tasks.filter((task) => task.completed)} />);

    expect(screen.getByText('Nenhuma tarefa pendente.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Tarefas concluídas' })).toBeInTheDocument();
  });

  it('estado vazio', () => {
    render(<StudentTasksCard tasks={[]} />);
    expect(screen.getByText('Nenhuma tarefa para este aluno.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
