import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { dueDay, PRIORITY_LABELS } from '@/components/Tasks/taskGroups';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import type { CreateTaskRequest, TaskPriority, TaskResponse } from '@/types/tasks';
import { todayDateOnly } from '@/utils/dates';

export interface TaskFormModalProps {
  /** Ausente: nova tarefa. */
  task?: TaskResponse | null;
  /** Aluno já vinculado (ex.: aberto no detalhe do aluno). */
  student?: { id: string; name: string } | null;
  onSubmit: (values: CreateTaskRequest) => Promise<void>;
  /** Só na edição: exclui a tarefa. */
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

const PRIORITIES: readonly TaskPriority[] = ['low', 'normal', 'high'];

/** Modal de criar, ver e editar tarefa (TASK-024). */
export function TaskFormModal({
  task = null,
  student = null,
  onSubmit,
  onDelete,
  onClose,
}: TaskFormModalProps): JSX.Element {
  const isEdit = task !== null;
  const titleRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>({ initialFocusRef: titleRef, onEscape: onClose });

  const linkedStudent =
    student ?? (task?.studentId ? { id: task.studentId, name: task.studentName ?? '' } : null);

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [dueDate, setDueDate] = useState(task ? dueDay(task) : todayDateOnly());
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'normal');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function run(action: () => Promise<void>): Promise<void> {
    setIsSubmitting(true);
    try {
      await action();
    } catch {
      setError('Não foi possível salvar agora. Tente novamente em instantes.');
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting) return;
    if (!title.trim()) {
      setError('Informe o título.');
      return;
    }
    if (!dueDate) {
      setError('Informe o vencimento.');
      return;
    }
    setError(null);
    await run(() =>
      onSubmit({
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
        dueDate,
        priority,
        studentId: linkedStudent?.id ?? null,
      }),
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="task-form-title" className="text-lg font-semibold text-gray-900">
          {isEdit ? 'Editar tarefa' : 'Nova tarefa'}
        </h2>
        {linkedStudent ? (
          <p className="mt-1 text-sm text-gray-500">Aluno: {linkedStudent.name}</p>
        ) : null}

        <form noValidate onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="space-y-1">
            <label htmlFor="task-title" className="block text-sm font-medium text-gray-700">
              Título
            </label>
            <input
              id="task-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="task-description" className="block text-sm font-medium text-gray-700">
              Descrição
            </label>
            <textarea
              id="task-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="task-due" className="block text-sm font-medium text-gray-700">
                Vencimento
              </label>
              <input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700">
                Prioridade
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                className={inputClass}
              >
                {PRIORITIES.map((option) => (
                  <option key={option} value={option}>
                    {PRIORITY_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            {isEdit && onDelete ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  void run(onDelete);
                }}
                className="rounded-md px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Excluir tarefa
              </button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isSubmitting ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
