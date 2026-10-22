import type { Prisma, TaskPriority } from '@prisma/client';

/*
 * Tipos de tarefas (TASK-023) — Sprint 8. Dívida da Sprint 6 resolvida pela opção (a): a tarefa
 * se relaciona só com aluno. A API fala `studentId`; no banco é `relatedTo` (FK para `Students`)
 * com `relatedType = 'student'`.
 */

export type { TaskPriority };

export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  /** ISO 8601. */
  dueDate: string;
  completed: boolean;
  /** ISO 8601. */
  completedAt: string | null;
  studentId: string | null;
  studentName: string | null;
  /** ISO 8601. */
  createdAt: string;
}

/** Query de `GET /api/tasks`, já validada. */
export interface TaskListQuery {
  completed?: boolean;
  priority?: TaskPriority;
}

export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  /** ISO 8601 já convertido pela rota. */
  dueDate: string;
  priority?: TaskPriority;
  studentId?: string | null;
}

export type UpdateTaskRequest = Partial<CreateTaskRequest>;

export type TaskRecord = Prisma.TaskGetPayload<{
  include: { relatedStudent: { select: { name: true } } };
}>;

export interface CreateTaskData {
  title: string;
  description: string | null;
  dueDate: Date;
  priority: TaskPriority;
  assignedTo: string;
  relatedTo: string | null;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  dueDate?: Date;
  priority?: TaskPriority;
  relatedTo?: string | null;
  completedAt?: Date | null;
}

/**
 * Tarefas sempre do próprio usuário (`assignedTo`): `update` e `delete` levam o dono no `where` e
 * lançam `P2025` para tarefa de outro usuário ou inexistente.
 */
export interface TaskRepository {
  /** Pelo vencimento mais próximo. */
  listByUser(userId: string, filter: TaskListQuery): Promise<TaskRecord[]>;
  create(data: CreateTaskData): Promise<TaskRecord>;
  update(id: string, userId: string, data: UpdateTaskData): Promise<TaskRecord>;
  delete(id: string, userId: string): Promise<void>;
}
