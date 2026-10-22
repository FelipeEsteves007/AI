import { useCallback, useEffect, useState } from 'react';

import { CourseDeleteDialog } from '@/components/Courses/CourseDeleteDialog';
import { CourseFormModal } from '@/components/Courses/CourseFormModal';
import { formatCurrency } from '@/components/Students/studentFormat';
import { useAuth } from '@/context/AuthContext';
import { isApiError } from '@/services/apiClient';
import { createCourse, deleteCourse, listCourses, updateCourse } from '@/services/coursesService';
import type { CourseResponse, CreateCourseRequest } from '@/types/courses';

const LOAD_ERROR = 'Não foi possível carregar os cursos agora. Tente novamente em instantes.';
const HAS_PURCHASES_ERROR =
  'Este curso já tem compras e não pode ser excluído. Desative-o para tirá-lo das vendas.';
const DELETE_GENERIC = 'Não foi possível excluir o curso agora. Tente novamente em instantes.';

type FormState = { mode: 'create' } | { mode: 'edit'; course: CourseResponse } | null;

/** Página `/courses` (TASK-015): todos veem; só quem tem `courses:manage` cria, edita e exclui. */
export default function CoursesPage(): JSX.Element {
  const { can } = useAuth();
  // Cosmético: o backend responde 403 nas escritas sem `courses:manage`.
  const canManage = can('courses:manage');

  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [toDelete, setToDelete] = useState<CourseResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      setCourses((await listCourses({ limit: 500 })).data);
      setLoadError(null);
    } catch {
      setLoadError(LOAD_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleSubmit(values: CreateCourseRequest): Promise<void> {
    if (form?.mode === 'edit') {
      await updateCourse(form.course.id, values);
    } else {
      await createCourse(values);
    }
    setForm(null);
    await reload();
  }

  async function confirmDelete(): Promise<void> {
    if (!toDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteCourse(toDelete.id);
      setToDelete(null);
      await reload();
    } catch (error) {
      setDeleteError(
        isApiError(error) && error.code === 'COURSE_HAS_PURCHASES'
          ? HAS_PURCHASES_ERROR
          : DELETE_GENERIC,
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cursos</h1>
          <p className="mt-1 text-sm text-gray-500">Catálogo de cursos vendidos aos alunos.</p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => setForm({ mode: 'create' })}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            + Novo curso
          </button>
        ) : null}
      </div>

      {loadError ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {isLoading && courses.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Carregando cursos…</p>
        ) : courses.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Nenhum curso cadastrado ainda.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-3">Nome</th>
                <th scope="col" className="px-4 py-3">Descrição</th>
                <th scope="col" className="px-4 py-3 text-right">Preço</th>
                <th scope="col" className="px-4 py-3">Status</th>
                {canManage ? (
                  <th scope="col" className="px-4 py-3 text-right">
                    <span className="sr-only">Ações</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map((course) => (
                <tr key={course.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{course.name}</td>
                  <td className="px-4 py-3 text-gray-600">{course.description ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-gray-900">
                    {formatCurrency(course.price)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        course.isActive
                          ? 'rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700'
                          : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600'
                      }
                    >
                      {course.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {canManage ? (
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setForm({ mode: 'edit', course })}
                        aria-label={`Editar ${course.name}`}
                        className="rounded-md px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setToDelete(course);
                        }}
                        aria-label={`Excluir ${course.name}`}
                        className="ml-1 rounded-md px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        Excluir
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form ? (
        <CourseFormModal
          course={form.mode === 'edit' ? form.course : null}
          onSubmit={handleSubmit}
          onClose={() => setForm(null)}
        />
      ) : null}

      {toDelete ? (
        <CourseDeleteDialog
          course={toDelete}
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={() => {
            void confirmDelete();
          }}
          onCancel={() => setToDelete(null)}
        />
      ) : null}
    </section>
  );
}
