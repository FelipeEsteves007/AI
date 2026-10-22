import type { RequestHandler } from 'express';

import type { StudentImportService } from '@server/services/studentImportService';
import type { StudentService } from '@server/services/studentService';
import type { PublicUser } from '@server/types/auth';
import type {
  CreateStudentRequest,
  StudentListQuery,
  UpdateStudentRequest,
} from '@server/types/students';
import { HttpError } from '@server/utils/httpError';

export interface StudentsController {
  list: RequestHandler;
  show: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  import: RequestHandler;
}

/** Parâmetro de caminho já validado pela rota (`z.uuid()`). */
interface StudentIdParams {
  id: string;
}

/**
 * Handlers de `/api/students`. Camada fina: o RBAC por escopo fica no `studentService`;
 * aqui só entra o que é HTTP. O ator é sempre o `req.user` posto pelo `requireAuth`.
 */
export function createStudentsController(
  service: StudentService,
  importService?: StudentImportService,
): StudentsController {
  function requireActor(user: PublicUser | undefined): PublicUser {
    if (!user) {
      throw HttpError.unauthorized();
    }

    return user;
  }

  return {
    list: async (req, res) => {
      const query = req.query as unknown as StudentListQuery;

      res.status(200).json(await service.listStudents(query, requireActor(req.user)));
    },

    show: async (req, res) => {
      const { id } = req.params as unknown as StudentIdParams;

      res.status(200).json(await service.getStudent(id, requireActor(req.user)));
    },

    create: async (req, res) => {
      const input = req.body as CreateStudentRequest;

      res.status(201).json(await service.createStudent(input, requireActor(req.user)));
    },

    update: async (req, res) => {
      const { id } = req.params as unknown as StudentIdParams;
      const input = req.body as UpdateStudentRequest;

      res.status(200).json(await service.updateStudent(id, input, requireActor(req.user)));
    },

    import: async (req, res) => {
      // `express.text()` só preenche o corpo com `Content-Type: text/csv` (ou `text/plain`).
      if (typeof req.body !== 'string') {
        throw HttpError.validation('Dados inválidos', {
          file: 'Envie o arquivo CSV com Content-Type text/csv',
        });
      }

      if (!importService) {
        throw new Error('Serviço de importação não configurado');
      }

      res.status(200).json(await importService.importStudents(req.body, requireActor(req.user)));
    },

    remove: async (req, res) => {
      const { id } = req.params as unknown as StudentIdParams;

      await service.deleteStudent(id, requireActor(req.user));

      res.status(204).end();
    },
  };
}
