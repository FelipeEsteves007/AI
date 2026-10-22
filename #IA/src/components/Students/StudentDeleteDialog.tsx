import { useRef } from 'react';
import type { RefObject } from 'react';

import { useDialogFocus } from '@/hooks/useDialogFocus';
import type { StudentResponse } from '@/types/students';

export interface StudentDeleteDialogProps {
  student: StudentResponse;
  isDeleting: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  /** Foco ao fechar quando o botão que abriu já saiu do DOM (ex.: a linha excluída). */
  returnFocusFallbackRef?: RefObject<HTMLElement>;
}

/** Confirmação de exclusão. A exclusão apaga também as tarefas do aluno (S6-4). */
export function StudentDeleteDialog({
  student,
  isDeleting,
  error = null,
  onConfirm,
  onCancel,
  returnFocusFallbackRef,
}: StudentDeleteDialogProps): JSX.Element {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>({
    initialFocusRef: cancelRef,
    returnFocusFallbackRef,
    onEscape: () => {
      if (!isDeleting) onCancel();
    },
  });

  // Durante a exclusão os botões ficam `aria-disabled` (não `disabled`): um botão desabilitado
  // perde o foco para o `body` e o teclado fica sem lugar dentro do dialog.
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-delete-title"
        aria-describedby="student-delete-description"
        aria-busy={isDeleting}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="student-delete-title" className="text-lg font-semibold text-gray-900">
          Excluir aluno
        </h2>
        <p id="student-delete-description" className="mt-2 text-sm text-gray-600">
          Tem certeza que deseja excluir <strong className="text-gray-900">{student.name}</strong>?
          As tarefas ligadas a este aluno também serão apagadas. Esta ação não pode ser desfeita.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
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
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isDeleting) onConfirm();
            }}
            aria-disabled={isDeleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          >
            {isDeleting ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}
