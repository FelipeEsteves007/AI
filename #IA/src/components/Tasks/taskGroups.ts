import type { TaskPriority, TaskResponse } from '@/types/tasks';
import { todayDateOnly } from '@/utils/dates';

export type TaskGroupKey = 'overdue' | 'today' | 'upcoming' | 'completed';

export const TASK_GROUPS: readonly { key: TaskGroupKey; label: string }[] = [
  { key: 'overdue', label: 'Vencidas' },
  { key: 'today', label: 'Hoje' },
  { key: 'upcoming', label: 'Próximos dias' },
  { key: 'completed', label: 'Concluídas' },
];

export const PRIORITY_LABELS: Readonly<Record<TaskPriority, string>> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
};

/** Dia de vencimento no fuso do negócio (`YYYY-MM-DD`). */
export function dueDay(task: Pick<TaskResponse, 'dueDate'>): string {
  return todayDateOnly(new Date(task.dueDate));
}

/** Grupo da tarefa em relação a `today` (padrão: hoje no Brasil). */
export function groupOf(task: TaskResponse, today = todayDateOnly()): TaskGroupKey {
  if (task.completed) return 'completed';
  const day = dueDay(task);
  if (day < today) return 'overdue';
  return day === today ? 'today' : 'upcoming';
}

/** Tarefas separadas por grupo, mantendo a ordem de vencimento que veio do backend. */
export function groupTasks(
  tasks: readonly TaskResponse[],
  today = todayDateOnly(),
): Record<TaskGroupKey, TaskResponse[]> {
  const groups: Record<TaskGroupKey, TaskResponse[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    completed: [],
  };
  for (const task of tasks) {
    groups[groupOf(task, today)].push(task);
  }
  return groups;
}
