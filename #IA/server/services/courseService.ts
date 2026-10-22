import type { PublicUser, Repositories } from '@server/types/auth';
import type {
  CourseListQuery,
  CourseListResponse,
  CourseResponse,
  CreateCourseRequest,
  CreatePurchaseRequest,
  PurchaseResponse,
  UpdateCourseRequest,
} from '@server/types/courses';
import { toCourseResponse, toPurchaseResponse } from '@server/utils/courseMapper';
import { todayDateOnly } from '@server/utils/dates';
import { HttpError } from '@server/utils/httpError';
import { hasPermission } from '@server/utils/permissions';
import {
  isForeignKeyViolation,
  isRecordNotFound,
  uniqueViolationTarget,
} from '@server/utils/prismaErrors';

/** Cursos (TASK-014) e compras (TASK-016 e TASK-017). Não conhece `req`/`res` nem o Prisma. */
export interface CourseService {
  listCourses(query: CourseListQuery): Promise<CourseListResponse>;
  createCourse(input: CreateCourseRequest, actor: PublicUser): Promise<CourseResponse>;
  updateCourse(id: string, input: UpdateCourseRequest, actor: PublicUser): Promise<CourseResponse>;
  deleteCourse(id: string, actor: PublicUser): Promise<void>;
  listPurchases(studentId: string, actor: PublicUser): Promise<PurchaseResponse[]>;
  createPurchase(
    studentId: string,
    input: CreatePurchaseRequest,
    actor: PublicUser,
  ): Promise<PurchaseResponse>;
}

const courseNotFound = () => HttpError.notFound('Curso não encontrado');

export function createCourseService({
  courses,
  purchases,
  students,
}: Pick<Repositories, 'courses' | 'purchases' | 'students'>): CourseService {
  /** Defesa em profundidade: a rota já exige `courses:manage`. */
  function assertCanManage(actor: PublicUser): void {
    if (!hasPermission(actor.role, 'courses:manage')) {
      throw HttpError.forbidden();
    }
  }

  /** Aluno no escopo do ator (vendedor: só os próprios) ou 404, como em `/api/students`. */
  async function findScopedStudent(studentId: string, actor: PublicUser) {
    const scope = hasPermission(actor.role, 'data:view-all') ? {} : { assignedTo: actor.id };
    const student = await students.findById(studentId, scope);

    if (!student) {
      throw HttpError.notFound('Aluno não encontrado');
    }

    return student;
  }

  return {
    async listCourses({ page, limit, isActive }) {
      const { rows, total } = await courses.list({
        isActive,
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        data: rows.map(toCourseResponse),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    },

    async createCourse(input, actor) {
      assertCanManage(actor);

      const created = await courses.create({
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        isActive: input.isActive ?? true,
      });

      return toCourseResponse(created);
    },

    async updateCourse(id, input, actor) {
      assertCanManage(actor);

      try {
        return toCourseResponse(await courses.update(id, input));
      } catch (error) {
        if (isRecordNotFound(error)) {
          throw courseNotFound();
        }

        throw error;
      }
    },

    async deleteCourse(id, actor) {
      assertCanManage(actor);

      // Decisão da Sprint 7: curso com compras não é excluído (bloquear, não cascata). A
      // contagem dá a mensagem clara; a FK sem cascata do banco (`P2003`) cobre a corrida.
      if ((await purchases.countByCourse(id)) > 0) {
        throw HttpError.courseHasPurchases();
      }

      try {
        await courses.delete(id);
      } catch (error) {
        if (isRecordNotFound(error)) {
          throw courseNotFound();
        }

        if (isForeignKeyViolation(error)) {
          throw HttpError.courseHasPurchases();
        }

        throw error;
      }
    },

    async listPurchases(studentId, actor) {
      const student = await findScopedStudent(studentId, actor);

      return (await purchases.listByStudent(student.id)).map(toPurchaseResponse);
    },

    async createPurchase(studentId, input, actor) {
      const student = await findScopedStudent(studentId, actor);

      // A rota já recusa data futura; repetir aqui mantém a regra para outros chamadores.
      if (input.purchaseDate > todayDateOnly()) {
        throw HttpError.validation('Dados inválidos', {
          purchaseDate: 'A data da compra não pode ser futura',
        });
      }

      const course = await courses.findById(input.courseId);

      if (!course) {
        throw courseNotFound();
      }

      try {
        const created = await purchases.create({
          studentId: student.id,
          courseId: course.id,
          purchaseDate: input.purchaseDate,
          amount: input.amount ?? course.price.toFixed(2),
          notes: input.notes ?? null,
        });

        return toPurchaseResponse(created);
      } catch (error) {
        // Índice único `(studentId, courseId)`: o aluno não compra o mesmo curso duas vezes.
        if (uniqueViolationTarget(error) !== null) {
          throw HttpError.purchaseDuplicate();
        }

        throw error;
      }
    },
  };
}
