import { StudentDetailCard, StudentEmptyText } from '@/components/Students/StudentDetailCard';
import { formatDate } from '@/components/Students/studentFormat';
import type { StudentTaskSummary } from '@/types/students';

export interface StudentTasksCardProps {
  tasks: StudentTaskSummary[];
  /** Referência para marcar "Vencida"; injetável nos testes. */
  now?: Date;
}

function isOverdue(task: StudentTaskSummary, now: Date): boolean {
  const due = new Date(task.dueDate).getTime();
  return !Number.isNaN(due) && due < now.getTime();
}

/**
 * Tarefas do aluno: pendentes em destaque primeiro, concluídas depois e esmaecidas. A ordem dentro
 * de cada grupo é a do backend (vencimento mais próximo primeiro).
 */
export function StudentTasksCard({ tasks, now = new Date() }: StudentTasksCardProps): JSX.Element {
  if (tasks.length === 0) {
    return (
      <StudentDetailCard title="Tarefas">
        <StudentEmptyText>Nenhuma tarefa para este aluno.</StudentEmptyText>
      </StudentDetailCard>
    );
  }

  const pending = tasks.filter((task) => !task.completed);
  const done = tasks.filter((task) => task.completed);

  return (
    <StudentDetailCard title="Tarefas">
      <h3 className="text-xs font-medium uppercase text-gray-500">Pendentes</h3>
      {pending.length === 0 ? (
        <div className="mt-1">
          <StudentEmptyText>Nenhuma tarefa pendente.</StudentEmptyText>
        </div>
      ) : (
        <ul aria-label="Tarefas pendentes" className="mt-1 divide-y divide-gray-100">
          {pending.map((task) => {
            const overdue = isOverdue(task, now);
            return (
              <li key={task.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span className="font-medium text-gray-900">{task.title}</span>
                <span className="flex items-center gap-2">
                  {overdue ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                      Vencida
                    </span>
                  ) : null}
                  <span className={overdue ? 'text-red-700' : 'text-gray-600'}>
                    {formatDate(task.dueDate)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 ? (
        <>
          <h3 className="mt-4 text-xs font-medium uppercase text-gray-500">Concluídas</h3>
          <ul aria-label="Tarefas concluídas" className="mt-1 divide-y divide-gray-100">
            {done.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-4 py-2 text-sm text-gray-400"
              >
                <span className="line-through">{task.title}</span>
                <span>{formatDate(task.dueDate)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </StudentDetailCard>
  );
}
