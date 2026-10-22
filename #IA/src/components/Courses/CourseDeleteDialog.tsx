import { useRef } from 'react';

import { useDialogFocus } from '@/hooks/useDialogFocus';
import type { CourseResponse } from '@/types/courses';

export interface CourseDeleteDialogProps {
  course: CourseResponse;
  isDeleting: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmação de exclusão de curso. Curso com compras é recusado pelo backend (409). */
export function CourseDeleteDialog({
  course,
  isDeleting,
  error = null,
  onConfirm,
  onCancel,
}: CourseDeleteDialogProps): JSX.Element {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>({
    initialFocusRef: cancelRef,
    onEscape: () => {
      if (!isDeleting) onCancel();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-delete-title"
        aria-describedby="course-delete-description"
        aria-busy={isDeleting}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="course-delete-title" className="text-lg font-semibold text-gray-900">
          Excluir curso
        </h2>
        <p id="course-delete-description" className="mt-2 text-sm text-gray-600">
          Tem certeza que deseja excluir <strong className="text-gray-900">{course.name}</strong>?
          Cursos que já têm compras não podem ser excluídos — desative-os.
        </p>

        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => {
              if (!isDeleting) onCancel();
            }}
            aria-disabled={isDeleting}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 aria-disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isDeleting) onConfirm();
            }}
            aria-disabled={isDeleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 aria-disabled:opacity-50"
          >
            {isDeleting ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}
