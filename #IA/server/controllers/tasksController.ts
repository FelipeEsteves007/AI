import type { RequestHandler } from 'express';

import type { TaskService } from '@server/services/taskService';
import type { CreateTaskRequest, TaskListQuery, UpdateTaskRequest } from '@server/types/tasks';
import { requireActor } from '@server/utils/requireActor';

export interface TasksController {
  list: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  complete: RequestHandler;
  remove: RequestHandler;
}

/** Handlers de `/api/tasks` (TASK-023). Camada fina: o dono da tarefa é resolvido no serviço. */
export function createTasksController(service: TaskService): TasksController {
  return {
    list: async (req, res) => {
      const query = req.query as unknown as TaskListQuery;

      res.status(200).json({ data: await service.listTasks(query, requireActor(req.user)) });
    },

    create: async (req, res) => {
      const input = req.body as CreateTaskRequest;

      res.status(201).json(await service.createTask(input, requireActor(req.user)));
    },

    update: async (req, res) => {
      const { id } = req.params as { id: string };
      const input = req.body as UpdateTaskRequest;

      res.status(200).json(await service.updateTask(id, input, requireActor(req.user)));
    },

    complete: async (req, res) => {
      const { id } = req.params as { id: string };
      const { completed } = req.body as { completed: boolean };

      res.status(200).json(await service.setCompleted(id, completed, requireActor(req.user)));
    },

    remove: async (req, res) => {
      const { id } = req.params as { id: string };

      await service.deleteTask(id, requireActor(req.user));

      res.status(204).end();
    },
  };
}
