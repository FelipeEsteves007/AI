import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EmailFormModal } from '@/components/Students/EmailFormModal';
import { PurchaseFormModal } from '@/components/Students/PurchaseFormModal';
import { StudentCoursesCard } from '@/components/Students/StudentCoursesCard';
import { StudentDeleteDialog } from '@/components/Students/StudentDeleteDialog';
import { StudentDetailSkeleton } from '@/components/Students/StudentDetailSkeleton';
import { studentFieldErrorMessage } from '@/components/Students/studentErrors';
import type { StudentEditableField } from '@/components/Students/studentErrors';
import { isStudentStatus } from '@/components/Students/studentFormat';
import { StudentLeadsCard } from '@/components/Students/StudentLeadsCard';
import { StudentNotesCard } from '@/components/Students/StudentNotesCard';
import { StudentProfileCard } from '@/components/Students/StudentProfileCard';
import { StudentTasksCard } from '@/components/Students/StudentTasksCard';
import { TaskFormModal } from '@/components/Tasks/TaskFormModal';
import { useAuth } from '@/context/AuthContext';
import { isApiError } from '@/services/apiClient';
import { createPurchase } from '@/services/coursesService';
import { sendEmail } from '@/services/emailService';
import { deleteStudent, getStudent, updateStudent } from '@/services/studentsService';
import { createTask } from '@/services/tasksService';
import type { CreatePurchaseRequest } from '@/types/courses';
import type { CreateTaskRequest } from '@/types/tasks';
import type { StudentDetailResponse, UpdateStudentRequest } from '@/types/students';
import { todayDateOnly } from '@/utils/dates';
import { isUuid } from '@/utils/uuid';

const LOAD_ERROR = 'Não foi possível carregar o aluno agora. Tente novamente em instantes.';
const DELETE_FORBIDDEN = 'Você não tem permissão para excluir alunos.';
const DELETE_NOT_FOUND = 'Este aluno não foi encontrado — talvez já tenha sido excluído.';
const DELETE_GENERIC = 'Não foi possível excluir o aluno agora. Tente novamente em instantes.';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

/** Campos opcionais: vazio vai como `null` para limpar o valor no banco. */
const NULLABLE_FIELDS: readonly StudentEditableField[] = ['phone', 'cpf', 'notes'];

function payloadFor(field: StudentEditableField, value: string): UpdateStudentRequest | null {
  if (field === 'status') {
    return isStudentStatus(value) ? { status: value } : null;
  }
  if (NULLABLE_FIELDS.includes(field)) {
    return { [field]: value === '' ? null : value };
  }
  return { [field]: value };
}

function isNotFound(error: unknown): boolean {
  // 400 no detalhe só acontece com id malformado; para quem usa, é o mesmo "não existe".
  return isApiError(error) && (error.status === 404 || error.status === 400);
}

/** O `updatedAt` mais recente entre o da tela e o da resposta: uma resposta velha não o faz voltar. */
function laterTimestamp(current: string, incoming: string): string {
  return Date.parse(incoming) >= Date.parse(current) ? incoming : current;
}

function deleteErrorFor(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 403 || error.code === 'FORBIDDEN') return DELETE_FORBIDDEN;
    if (error.status === 404 || error.code === 'NOT_FOUND') return DELETE_NOT_FOUND;
  }
  return DELETE_GENERIC;
}

const ACTION_CLASS =
  'inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600';

export default function StudentDetailPage(): JSX.Element {
  const router = useRouter();
  const { can } = useAuth();
  // Cosmético: o backend responde 403 no DELETE sem `students:delete`.
  const canDelete = can('students:delete');

  const rawId = router.query.id;
  const id = typeof rawId === 'string' ? rawId : '';

  const [student, setStudent] = useState<StudentDetailResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [reloadToken, setReloadToken] = useState(0);
  const [editRequest, setEditRequest] = useState(0);

  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    // Não chama a API com lixo: o backend responderia 400 e a tela seria a mesma.
    if (!isUuid(id)) {
      setStudent(null);
      setLoadState('not-found');
      return;
    }

    let active = true;
    setLoadState('loading');
    getStudent(id)
      .then((result) => {
        if (!active) return;
        setStudent(result);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStudent(null);
        setLoadState(isNotFound(error) ? 'not-found' : 'error');
      });
    return () => {
      active = false;
    };
  }, [router.isReady, id, reloadToken]);

  const saveField = useCallback(
    async (field: StudentEditableField, value: string): Promise<string | null> => {
      const payload = payloadFor(field, value);
      if (!payload) {
        return 'Valor inválido.';
      }
      try {
        const updated = await updateStudent(id, payload);
        // Aplica só o campo salvo: com PUTs simultâneos, a resposta que chega por último pode
        // trazer os outros campos com o valor de antes (ex.: status 'ativo' depois de pausar).
        // Cursos, leads e tarefas não vêm no PUT e continuam os já carregados.
        setStudent((current) =>
          current
            ? {
                ...current,
                [field]: updated[field],
                updatedAt: laterTimestamp(current.updatedAt, updated.updatedAt),
              }
            : current,
        );
        return null;
      } catch (error) {
        if (isApiError(error) && (error.status === 404 || error.code === 'NOT_FOUND')) {
          // Excluído ou reatribuído por outra pessoa no meio da edição: não há mais o que editar.
          setStudent(null);
          setLoadState('not-found');
        }
        return studentFieldErrorMessage(error, field);
      }
    },
    [id],
  );

  const ownedCourseIds = useMemo(
    () => student?.courses.map((course) => course.id) ?? [],
    [student?.courses],
  );

  /** Registra a compra e a coloca no card, na ordem do backend (mais recente primeiro). */
  async function addPurchase(values: CreatePurchaseRequest): Promise<void> {
    const created = await createPurchase(id, values);
    setIsPurchaseOpen(false);
    setStudent((current) =>
      current
        ? {
            ...current,
            courses: [
              {
                id: created.courseId,
                name: created.courseName,
                purchaseDate: created.purchaseDate,
                amount: created.amount,
              },
              ...current.courses,
            ].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)),
          }
        : current,
    );
  }

  /** Cria a tarefa já vinculada ao aluno e a coloca no card, pelo vencimento. */
  async function addTask(values: CreateTaskRequest): Promise<void> {
    const created = await createTask(values);
    setIsTaskOpen(false);
    setStudent((current) =>
      current
        ? {
            ...current,
            tasks: [
              ...current.tasks,
              {
                id: created.id,
                title: created.title,
                dueDate: created.dueDate,
                completed: created.completed,
              },
            ].sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate)),
          }
        : current,
    );
  }

  async function confirmDelete(): Promise<void> {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteStudent(id);
      setIsDeleteOpen(false);
      void router.push('/students');
    } catch (error) {
      setDeleteError(deleteErrorFor(error));
    } finally {
      setIsDeleting(false);
    }
  }

  if (loadState === 'not-found') {
    return (
      <section className="mx-auto max-w-xl rounded-lg border border-gray-200 bg-white px-6 py-10 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Aluno não encontrado</h1>
        <p className="mt-2 text-sm text-gray-500">
          O aluno não existe, foi excluído ou não está entre os seus alunos.
        </p>
        <Link
          href="/students"
          className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          Voltar para alunos
        </Link>
      </section>
    );
  }

  if (loadState === 'error') {
    return (
      <section className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center">
        <p role="alert" className="text-sm text-red-700">
          {LOAD_ERROR}
        </p>
        <button
          type="button"
          onClick={() => setReloadToken((token) => token + 1)}
          className="mt-3 rounded-md bg-white px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        >
          Tentar novamente
        </button>
      </section>
    );
  }

  if (loadState === 'loading' || !student) {
    return (
      <section className="mx-auto max-w-7xl">
        <StudentDetailSkeleton />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <nav aria-label="Trilha" className="text-sm text-gray-500">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/students" className="hover:text-gray-900 hover:underline">
              Alunos
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="truncate text-gray-900">
            {student.name}
          </li>
        </ol>
      </nav>

      <h1 className="mt-2 text-2xl font-bold text-gray-900">{student.name}</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setEditRequest((n) => n + 1)} className={ACTION_CLASS}>
          Editar
        </button>
        <button
          type="button"
          onClick={() => {
            setEmailNotice(null);
            setIsEmailOpen(true);
          }}
          className={ACTION_CLASS}
        >
          Enviar e-mail
        </button>
        <button type="button" onClick={() => setIsTaskOpen(true)} className={ACTION_CLASS}>
          Nova tarefa
        </button>
        {canDelete ? (
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setIsDeleteOpen(true);
            }}
            className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            Excluir
          </button>
        ) : null}
      </div>

      {emailNotice ? (
        <p
          role="status"
          className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {emailNotice}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StudentProfileCard student={student} onSaveField={saveField} editRequest={editRequest} />
        <StudentNotesCard notes={student.notes} onSave={(value) => saveField('notes', value)} />
        <StudentCoursesCard courses={student.courses} onAdd={() => setIsPurchaseOpen(true)} />
        <StudentLeadsCard leads={student.pipelineLeads} />
        <StudentTasksCard tasks={student.tasks} />
      </div>

      {isEmailOpen ? (
        <EmailFormModal
          recipients={`${student.name} <${student.email}>`}
          onSubmit={async (payload) => {
            const result = await sendEmail(student.id, payload);
            setIsEmailOpen(false);
            setEmailNotice(`E-mail enviado para ${result.to}.`);
          }}
          onClose={() => setIsEmailOpen(false)}
        />
      ) : null}

      {isTaskOpen ? (
        <TaskFormModal
          student={{ id: student.id, name: student.name }}
          onSubmit={addTask}
          onClose={() => setIsTaskOpen(false)}
        />
      ) : null}

      {isPurchaseOpen ? (
        <PurchaseFormModal
          ownedCourseIds={ownedCourseIds}
          today={todayDateOnly()}
          onSubmit={addPurchase}
          onClose={() => setIsPurchaseOpen(false)}
        />
      ) : null}

      {isDeleteOpen ? (
        <StudentDeleteDialog
          student={student}
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={() => {
            void confirmDelete();
          }}
          onCancel={() => setIsDeleteOpen(false)}
        />
      ) : null}
    </section>
  );
}
