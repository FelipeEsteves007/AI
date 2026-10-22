import { TaskPriority } from '@prisma/client';

import type { PublicUser, Repositories } from '@server/types/auth';
import type {
  CreateTaskRequest,
  TaskListQuery,
  TaskRecord,
  TaskResponse,
  UpdateTaskData,
  UpdateTaskRequest,
} from '@server/types/tasks';
import { HttpError } from '@server/utils/httpError';
import { hasPermission } from '@server/utils/permissions';
import { isRecordNotFound } from '@server/utils/prismaErrors';

export interface TaskService {
  listTasks(query: TaskListQuery, actor: PublicUser): Promise<TaskResponse[]>;
  createTask(input: CreateTaskRequest, actor: PublicUser): Promise<TaskResponse>;
  updateTask(id: string, input: UpdateTaskRequest, actor: PublicUser): Promise<TaskResponse>;
  setCompleted(id: string, completed: boolean, actor: PublicUser): Promise<TaskResponse>;
  deleteTask(id: string, actor: PublicUser): Promise<void>;
}

export function toTaskResponse(task: TaskRecord): TaskResponse {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate.toISOString(),
    completed: task.completedAt !== null,
    completedAt: task.completedAt?.toISOString() ?? null,
    studentId: task.relatedTo,
    studentName: task.relatedStudent?.name ?? null,
    createdAt: task.createdAt.toISOString(),
  };
}

const taskNotFound = () => HttpError.notFound('Tarefa não encontrada');

/**
 * Tarefas (TASK-023). Cada usuário vê e altera **só as próprias** tarefas, inclusive admin e CEO:
 * o dono vai no `where` de toda leitura e escrita. Vincular a aluno respeita o escopo da carteira.
 */
export function createTaskService({
  tasks,
  students,
}: Pick<Repositories, 'tasks' | 'students'>): TaskService {
  async function assertStudentInScope(studentId: string | null | undefined, actor: PublicUser) {
    if (!studentId) return;

    const scope = hasPermission(actor.role, 'data:view-all') ? {} : { assignedTo: actor.id };
    if (!(await students.findById(studentId, scope))) {
      throw HttpError.notFound('Aluno não encontrado');
    }
  }

  async function guarded(write: () => Promise<TaskRecord>): Promise<TaskResponse> {
    try {
      return toTaskResponse(await write());
    } catch (error) {
      if (isRecordNotFound(error)) throw taskNotFound();
      throw error;
    }
  }

  return {
    async listTasks(query, actor) {
      return (await tasks.listByUser(actor.id, query)).map(toTaskResponse);
    },

    async createTask(input, actor) {
      await assertStudentInScope(input.studentId, actor);

      return toTaskResponse(
        await tasks.create({
          title: input.title,
          description: input.description ?? null,
          dueDate: new Date(input.dueDate),
          priority: input.priority ?? TaskPriority.normal,
          assignedTo: actor.id,
          relatedTo: input.studentId ?? null,
        }),
      );
    },

    async updateTask(id, input, actor) {
      await assertStudentInScope(input.studentId, actor);

      const changes: UpdateTaskData = {
        title: input.title,
        description: input.description,
        dueDate: input.dueDate === undefined ? undefined : new Date(input.dueDate),
        priority: input.priority,
        relatedTo: input.studentId,
      };

      return guarded(() => tasks.update(id, actor.id, changes));
    },

    async setCompleted(id, completed, actor) {
      return guarded(() =>
        tasks.update(id, actor.id, { completedAt: completed ? new Date() : null }),
      );
    },

    async deleteTask(id, actor) {
      try {
        await tasks.delete(id, actor.id);
      } catch (error) {
        if (isRecordNotFound(error)) throw taskNotFound();
        throw error;
      }
    },
  };
}
