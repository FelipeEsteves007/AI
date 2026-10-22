/** Tipos de tarefas (Sprint 8), espelhando `api/types/tasks.ts`. */

export type TaskPriority = 'low' | 'normal' | 'high';

export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueDate: string;
  completed: boolean;
  completedAt: string | null;
  studentId: string | null;
  studentName: string | null;
  createdAt: string;
}

export interface TaskListParams {
  completed?: boolean;
  priority?: TaskPriority;
}

export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  /** `YYYY-MM-DD`. */
  dueDate: string;
  priority?: TaskPriority;
  studentId?: string | null;
}

export type UpdateTaskRequest = Partial<CreateTaskRequest>;
