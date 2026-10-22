import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { formatDate } from '@/components/Students/studentFormat';
import { TaskFormModal } from '@/components/Tasks/TaskFormModal';
import { groupTasks, PRIORITY_LABELS, TASK_GROUPS } from '@/components/Tasks/taskGroups';
import type { TaskGroupKey } from '@/components/Tasks/taskGroups';
import {
  createTask,
  deleteTask,
  listTasks,
  setTaskCompleted,
  updateTask,
} from '@/services/tasksService';
import type { CreateTaskRequest, TaskPriority, TaskResponse } from '@/types/tasks';

const LOAD_ERROR = 'Não foi possível carregar as tarefas agora. Tente novamente em instantes.';

type StatusFilter = 'all' | 'open' | 'completed';
type ModalState = { mode: 'create' } | { mode: 'edit'; task: TaskResponse } | null;

const GROUP_STYLE: Readonly<Record<TaskGroupKey, { heading: string; card: string }>> = {
  overdue: { heading: 'text-red-700', card: 'border-red-200 bg-red-50' },
  today: { heading: 'text-blue-700', card: 'border-gray-200 bg-white' },
  upcoming: { heading: 'text-gray-900', card: 'border-gray-200 bg-white' },
  completed: { heading: 'text-gray-500', card: 'border-gray-200 bg-gray-50 text-gray-500' },
};

const PRIORITY_BADGE: Readonly<Record<TaskPriority, string>> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
};

/** Página `/tasks` (TASK-024): tarefas do usuário agrupadas por prazo. */
export default function TasksPage(): JSX.Element {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const reload = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      setTasks(
        await listTasks({
          completed: status === 'all' ? undefined : status === 'completed',
          priority: priority || undefined,
        }),
      );
      setError(null);
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [status, priority]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Otimista: o checkbox muda na hora; se a API recusar, a tarefa volta ao estado anterior. */
  async function toggle(task: TaskResponse): Promise<void> {
    setError(null);
    setTasks((current) =>
      current.map((row) => (row.id === task.id ? { ...row, completed: !task.completed } : row)),
    );
    try {
      const saved = await setTaskCompleted(task.id, !task.completed);
      setTasks((current) => current.map((row) => (row.id === saved.id ? saved : row)));
    } catch {
      setTasks((current) => current.map((row) => (row.id === task.id ? task : row)));
      setError(`Não foi possível atualizar "${task.title}". Tente novamente.`);
    }
  }

  async function handleSubmit(values: CreateTaskRequest): Promise<void> {
    if (modal?.mode === 'edit') {
      await updateTask(modal.task.id, values);
    } else {
      await createTask(values);
    }
    setModal(null);
    await reload();
  }

  async function handleDelete(task: TaskResponse): Promise<void> {
    await deleteTask(task.id);
    setModal(null);
    setTasks((current) => current.filter((row) => row.id !== task.id));
  }

  const groups = groupTasks(tasks);

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
          <p className="mt-1 text-sm text-gray-500">Seus follow-ups, agrupados por prazo.</p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: 'create' })}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Nova tarefa
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="text-sm text-gray-700">
          <span className="block font-medium">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">Todas</option>
            <option value="open">Abertas</option>
            <option value="completed">Concluídas</option>
          </select>
        </label>
        <label className="text-sm text-gray-700">
          <span className="block font-medium">Prioridade</span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority | '')}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            <option value="high">Alta</option>
            <option value="normal">Normal</option>
            <option value="low">Baixa</option>
          </select>
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {isLoading && tasks.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">Carregando tarefas…</p>
      ) : tasks.length === 0 ? (
        <p className="mt-6 rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
          Nenhuma tarefa por aqui.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {TASK_GROUPS.filter((group) => groups[group.key].length > 0).map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h2 className={`text-sm font-semibold uppercase ${GROUP_STYLE[group.key].heading}`}>
                {group.label} ({groups[group.key].length})
              </h2>
              <ul className="mt-2 space-y-2">
                {groups[group.key].map((task) => (
                  <li
                    key={task.id}
                    className={`flex items-start gap-3 rounded-md border p-3 ${GROUP_STYLE[group.key].card}`}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => {
                        void toggle(task);
                      }}
                      aria-label={`Concluir ${task.title}`}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setModal({ mode: 'edit', task })}
                        className={`text-left text-sm font-medium hover:underline ${
                          task.completed ? 'line-through' : 'text-gray-900'
                        }`}
                      >
                        {task.title}
                      </button>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>Vence em {formatDate(task.dueDate)}</span>
                        <span className={`rounded-full px-2 py-0.5 ${PRIORITY_BADGE[task.priority]}`}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        {task.studentId ? (
                          <Link href={`/students/${task.studentId}`} className="text-blue-700 hover:underline">
                            {task.studentName}
                          </Link>
                        ) : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {modal ? (
        <TaskFormModal
          task={modal.mode === 'edit' ? modal.task : null}
          onSubmit={handleSubmit}
          onDelete={modal.mode === 'edit' ? () => handleDelete(modal.task) : undefined}
          onClose={() => setModal(null)}
        />
      ) : null}
    </section>
  );
}
