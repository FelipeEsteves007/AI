import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { formatMoneyInput, parseMoneyInput } from '@/components/Courses/courseForm';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { isApiError } from '@/services/apiClient';
import { listCourses } from '@/services/coursesService';
import type { CourseResponse, CreatePurchaseRequest } from '@/types/courses';

export interface PurchaseFormModalProps {
  /** Cursos que o aluno já comprou: não aparecem no dropdown. */
  ownedCourseIds: readonly string[];
  /** `YYYY-MM-DD` de hoje — valor inicial e limite máximo da data. */
  today: string;
  onSubmit: (values: CreatePurchaseRequest) => Promise<void>;
  onClose: () => void;
}

interface FieldErrors {
  courseId?: string;
  purchaseDate?: string;
  amount?: string;
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

function errorFor(error: unknown): { field?: FieldErrors; form?: string } {
  if (isApiError(error)) {
    if (error.code === 'PURCHASE_DUPLICATE') {
      return { field: { courseId: 'O aluno já comprou este curso.' } };
    }
    const details = error.details as Record<string, string> | undefined;
    if (error.code === 'VALIDATION_ERROR' && typeof details?.purchaseDate === 'string') {
      return { field: { purchaseDate: details.purchaseDate } };
    }
    if (error.status === 404) {
      return { form: 'Curso ou aluno não encontrado. Atualize a página e tente de novo.' };
    }
  }
  return { form: 'Não foi possível registrar a compra agora. Tente novamente em instantes.' };
}

/** Modal "Adicionar curso" do detalhe do aluno (TASK-018). */
export function PurchaseFormModal({
  ownedCourseIds,
  today,
  onSubmit,
  onClose,
}: PurchaseFormModalProps): JSX.Element {
  const selectRef = useRef<HTMLSelectElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>({ initialFocusRef: selectRef, onEscape: onClose });

  const [courses, setCourses] = useState<CourseResponse[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    listCourses({ isActive: true, limit: 500 })
      .then((result) => {
        if (active) setCourses(result.data.filter((course) => !ownedCourseIds.includes(course.id)));
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [ownedCourseIds]);

  function selectCourse(id: string): void {
    setCourseId(id);
    const course = courses?.find((candidate) => candidate.id === id);
    // Valor padrão: o preço do curso escolhido.
    setAmount(course ? formatMoneyInput(course.price) : '');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting) return;

    const parsedAmount = parseMoneyInput(amount);
    const errors: FieldErrors = {};
    if (!courseId) errors.courseId = 'Escolha o curso.';
    if (!purchaseDate) errors.purchaseDate = 'Informe a data da compra.';
    else if (purchaseDate > today) errors.purchaseDate = 'A data da compra não pode ser futura.';
    if (parsedAmount === null) errors.amount = 'Valor inválido: use até 2 casas decimais.';
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0 || parsedAmount === null) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        courseId,
        purchaseDate,
        amount: parsedAmount,
        notes: notes.trim() === '' ? null : notes.trim(),
      });
    } catch (error) {
      const { field, form } = errorFor(error);
      if (field) setFieldErrors(field);
      if (form) setFormError(form);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-form-title"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="purchase-form-title" className="text-lg font-semibold text-gray-900">
          Adicionar curso
        </h2>

        <form noValidate onSubmit={handleSubmit} className="mt-4 space-y-4">
          {formError || loadError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError ?? 'Não foi possível carregar os cursos.'}
            </p>
          ) : null}

          <div className="space-y-1">
            <label htmlFor="purchase-course" className="block text-sm font-medium text-gray-700">
              Curso
            </label>
            <select
              id="purchase-course"
              ref={selectRef}
              value={courseId}
              onChange={(event) => selectCourse(event.target.value)}
              disabled={courses === null}
              aria-invalid={fieldErrors.courseId ? true : undefined}
              aria-describedby={fieldErrors.courseId ? 'purchase-course-error' : undefined}
              className={inputClass}
            >
              <option value="">
                {courses === null
                  ? 'Carregando cursos…'
                  : courses.length === 0
                    ? 'Nenhum curso disponível'
                    : 'Selecione um curso'}
              </option>
              {courses?.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            {fieldErrors.courseId ? (
              <p id="purchase-course-error" className="text-xs text-red-600">
                {fieldErrors.courseId}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="purchase-date" className="block text-sm font-medium text-gray-700">
                Data da compra
              </label>
              <input
                id="purchase-date"
                type="date"
                max={today}
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                aria-invalid={fieldErrors.purchaseDate ? true : undefined}
                aria-describedby={fieldErrors.purchaseDate ? 'purchase-date-error' : undefined}
                className={inputClass}
              />
              {fieldErrors.purchaseDate ? (
                <p id="purchase-date-error" className="text-xs text-red-600">
                  {fieldErrors.purchaseDate}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label htmlFor="purchase-amount" className="block text-sm font-medium text-gray-700">
                Valor (R$)
              </label>
              <input
                id="purchase-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={fieldErrors.amount ? true : undefined}
                aria-describedby={fieldErrors.amount ? 'purchase-amount-error' : undefined}
                className={inputClass}
              />
              {fieldErrors.amount ? (
                <p id="purchase-amount-error" className="text-xs text-red-600">
                  {fieldErrors.amount}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="purchase-notes" className="block text-sm font-medium text-gray-700">
              Notas
            </label>
            <textarea
              id="purchase-notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
