import { AuditAction, StudentStatus } from '@prisma/client';

import type { PublicUser, Repositories } from '@server/types/auth';
import type {
  CreateStudentRequest,
  StudentDetailResponse,
  StudentListQuery,
  StudentListResponse,
  StudentResponse,
  UpdateStudentData,
  UpdateStudentRequest,
} from '@server/types/students';
import { normalizeCpf } from '@server/utils/cpf';
import { HttpError } from '@server/utils/httpError';
import { hasPermission } from '@server/utils/permissions';
import { isRecordNotFound, uniqueViolationTarget } from '@server/utils/prismaErrors';
import { toStudentDetailResponse, toStudentResponse } from '@server/utils/studentMapper';
import { normalizeEmail } from '@server/utils/userMapper';

/** Alunos (TASK-007, TASK-008 e TASK-009). Não conhece `req`/`res` nem o Prisma Client. */
export interface StudentService {
  listStudents(query: StudentListQuery, actor: PublicUser): Promise<StudentListResponse>;
  getStudent(id: string, actor: PublicUser): Promise<StudentDetailResponse>;
  createStudent(input: CreateStudentRequest, actor: PublicUser): Promise<StudentResponse>;
  updateStudent(
    id: string,
    input: UpdateStudentRequest,
    actor: PublicUser,
  ): Promise<StudentResponse>;
  deleteStudent(id: string, actor: PublicUser): Promise<void>;
}

/** Mesma resposta para inexistente e fora do escopo: não revela que o aluno existe. */
function studentNotFound(): HttpError {
  return HttpError.notFound('Aluno não encontrado');
}

export function createStudentService({
  students,
  users,
}: Pick<Repositories, 'students' | 'users'>): StudentService {
  /**
   * RBAC como escopo da query: quem tem `data:view-all` (admin, CEO) usa o `assignedTo`
   * pedido (ou nenhum); o vendedor fica sempre preso ao próprio id, ignorando o pedido.
   * O escopo entra no `where` da contagem e da página — nunca como filtro da resposta.
   */
  function scopedAssignedTo(actor: PublicUser, requested: string | undefined): string | undefined {
    return hasPermission(actor.role, 'data:view-all') ? requested : actor.id;
  }

  /**
   * S6-10: atribuição **nova** (POST com valor, ou PUT que troca o responsável) exige usuário
   * existente e ativo — senão o aluno some da carteira de todo vendedor ativo. Manter o
   * responsável atual (`current`), mesmo que já esteja inativo, não passa por aqui.
   */
  async function assertAssignable(
    assignedTo: string | null | undefined,
    current?: string | null,
  ): Promise<void> {
    if (!assignedTo || assignedTo === current) {
      return;
    }

    const user = await users.findById(assignedTo);

    if (!user) {
      throw HttpError.validation('Dados inválidos', { assignedTo: 'Responsável não encontrado' });
    }

    if (!user.isActive) {
      throw HttpError.validation('Dados inválidos', { assignedTo: 'Responsável desativado' });
    }
  }

  /**
   * Checagem prévia de unicidade, para a mensagem clara. `selfId` é o próprio aluno no PUT:
   * manter o e-mail ou o CPF que já são dele não é conflito.
   */
  async function assertUnique(
    { email, cpf }: { email?: string; cpf?: string | null },
    selfId?: string,
  ): Promise<void> {
    if (email !== undefined) {
      const owner = await students.findByEmail(email);

      if (owner && owner.id !== selfId) {
        throw HttpError.emailInUse();
      }
    }

    if (cpf) {
      const owner = await students.findByCpf(cpf);

      if (owner && owner.id !== selfId) {
        throw HttpError.cpfInUse();
      }
    }
  }

  /**
   * A checagem prévia perde a corrida entre duas gravações simultâneas (importação); o índice
   * único do banco é quem garante. `P2002` vira o mesmo 409, pelo campo em `meta.target`, e
   * `P2025` (sumiu ou saiu do escopo entre a leitura e a gravação, S6-11) vira 404.
   */
  async function writeGuarded<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isRecordNotFound(error)) {
        throw studentNotFound();
      }

      const target = uniqueViolationTarget(error);

      if (target?.some((field) => field.includes('email'))) {
        throw HttpError.emailInUse();
      }

      if (target?.some((field) => field.includes('cpf'))) {
        throw HttpError.cpfInUse();
      }

      throw error;
    }
  }

  /** `cpf` só com dígitos; `null` e ausente passam como estão. */
  function cleanCpf(cpf: string | null | undefined): string | null | undefined {
    return typeof cpf === 'string' ? normalizeCpf(cpf) : cpf;
  }

  return {
    async listStudents(query, actor) {
      const { page, limit, status, search, sortBy, order } = query;
      const { rows, total } = await students.list({
        filter: { status, search, assignedTo: scopedAssignedTo(actor, query.assignedTo) },
        sortBy,
        order,
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        data: rows.map(toStudentResponse),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    },

    async getStudent(id, actor) {
      const student = await students.findDetail(id, {
        assignedTo: scopedAssignedTo(actor, undefined),
      });

      // Aluno de outro vendedor responde igual a inexistente: 404, sem revelar que existe.
      if (!student) {
        throw studentNotFound();
      }

      return toStudentDetailResponse(student);
    },

    async createStudent(input, actor) {
      const canAssign = hasPermission(actor.role, 'data:view-all');
      // S6-6: o vendedor é sempre o responsável pelo aluno que cria; o corpo é ignorado.
      const assignedTo = canAssign ? (input.assignedTo ?? null) : actor.id;
      const email = normalizeEmail(input.email);
      const cpf = cleanCpf(input.cpf) ?? null;

      if (canAssign) {
        await assertAssignable(assignedTo);
      }

      await assertUnique({ email, cpf });

      const created = await writeGuarded(() =>
        students.create({
          name: input.name.trim(),
          email,
          phone: input.phone ?? null,
          cpf,
          status: input.status ?? StudentStatus.ativo,
          notes: input.notes ?? null,
          assignedTo,
        }),
      );

      return toStudentResponse(created);
    },

    async updateStudent(id, input, actor) {
      const canAssign = hasPermission(actor.role, 'data:view-all');
      const scope = { assignedTo: scopedAssignedTo(actor, undefined) };
      const current = await students.findById(id, scope);

      // Aluno de outro vendedor: 404, igual ao detalhe.
      if (!current) {
        throw studentNotFound();
      }

      const changes: UpdateStudentData = {
        name: input.name?.trim(),
        email: input.email === undefined ? undefined : normalizeEmail(input.email),
        phone: input.phone,
        cpf: cleanCpf(input.cpf),
        status: input.status,
        notes: input.notes,
        // S6-6: vendedor não reatribui; o `assignedTo` do corpo é ignorado.
        assignedTo: canAssign ? input.assignedTo : undefined,
      };

      // Só campos ignorados (vendedor mandando `assignedTo`): nada a gravar, `updatedAt` intacto.
      if (Object.values(changes).every((value) => value === undefined)) {
        return toStudentResponse(current);
      }

      if (canAssign) {
        await assertAssignable(changes.assignedTo, current.assignedTo);
      }

      await assertUnique({ email: changes.email, cpf: changes.cpf }, current.id);

      // S6-11: a leitura acima serve à mensagem e às regras; quem garante o escopo é o `where`
      // da gravação. Sumiu ou foi reatribuído no meio: `P2025` → 404.
      const updated = await writeGuarded(() => students.update(current.id, changes, scope));

      return toStudentResponse(updated);
    },

    async deleteStudent(id, actor) {
      // A rota já exige `students:delete`; repetir aqui mantém a regra se o serviço for chamado
      // por outro caminho (ex.: importação, scripts).
      if (!hasPermission(actor.role, 'students:delete')) {
        throw HttpError.forbidden();
      }

      // Leitura prévia no escopo do ator: inexistente (ou fora do escopo) → 404 sem apagar nem
      // auditar. Hoje só o admin chega aqui, então o escopo é vazio; a regra fica se mudar.
      const current = await students.findById(id, {
        assignedTo: scopedAssignedTo(actor, undefined),
      });

      if (!current) {
        throw studentNotFound();
      }

      // Compras, leads e tarefas vão junto pelo `onDelete: Cascade` do banco — o serviço não
      // apaga filhos à mão. Constituição: exclusão é auditada, e a auditoria entra na MESMA
      // transação do `delete` (se o log falhar, nada é apagado). O serviço decide o conteúdo:
      // sem e-mail/alvo nas colunas (são de usuário, RN-07); o aluno fica todo no `metadata`.
      // Sumiu entre a leitura e a exclusão → `P2025` → 404, sem log.
      await writeGuarded(() =>
        students.delete(current.id, (deleted) => ({
          action: AuditAction.STUDENT_DELETED,
          actorId: actor.id,
          metadata: {
            student: { id: deleted.id, name: deleted.name, email: deleted.email },
            cascade: deleted.cascade,
          },
        })),
      );
    },
  };
}
