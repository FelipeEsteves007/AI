import type { RequestHandler } from 'express';

import type { CourseService } from '@server/services/courseService';
import type { PublicUser } from '@server/types/auth';
import type {
  CourseListQuery,
  CreateCourseRequest,
  CreatePurchaseRequest,
  UpdateCourseRequest,
} from '@server/types/courses';
import { HttpError } from '@server/utils/httpError';

export interface CoursesController {
  list: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  listPurchases: RequestHandler;
  createPurchase: RequestHandler;
}

/** Parâmetro de caminho já validado pela rota (`z.uuid()`). */
interface IdParams {
  id: string;
}

/** Handlers de `/api/courses` e `/api/students/:id/purchases`. Camada fina: só HTTP. */
export function createCoursesController(service: CourseService): CoursesController {
  function requireActor(user: PublicUser | undefined): PublicUser {
    if (!user) {
      throw HttpError.unauthorized();
    }

    return user;
  }

  return {
    list: async (req, res) => {
      res.status(200).json(await service.listCourses(req.query as unknown as CourseListQuery));
    },

    create: async (req, res) => {
      const input = req.body as CreateCourseRequest;

      res.status(201).json(await service.createCourse(input, requireActor(req.user)));
    },

    update: async (req, res) => {
      const { id } = req.params as unknown as IdParams;
      const input = req.body as UpdateCourseRequest;

      res.status(200).json(await service.updateCourse(id, input, requireActor(req.user)));
    },

    remove: async (req, res) => {
      const { id } = req.params as unknown as IdParams;

      await service.deleteCourse(id, requireActor(req.user));

      res.status(204).end();
    },

    listPurchases: async (req, res) => {
      const { id } = req.params as unknown as IdParams;

      res.status(200).json({ data: await service.listPurchases(id, requireActor(req.user)) });
    },

    createPurchase: async (req, res) => {
      const { id } = req.params as unknown as IdParams;
      const input = req.body as CreatePurchaseRequest;

      res.status(201).json(await service.createPurchase(id, input, requireActor(req.user)));
    },
  };
}
