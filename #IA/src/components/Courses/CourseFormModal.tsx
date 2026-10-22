import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { formatMoneyInput, parseMoneyInput } from '@/components/Courses/courseForm';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { isApiError } from '@/services/apiClient';
import type { CourseResponse, CreateCourseRequest } from '@/types/courses';

export interface CourseFormModalProps {
  /** Ausente: criação. */
  course?: CourseResponse | null;
  onSubmit: (values: CreateCourseRequest) => Promise<void>;
  onClose: () => void;
}

interface FieldErrors {
  name?: string;
  price?: string;
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

/** Modal de criar e editar curso (TASK-015). Preço com até 2 casas decimais. */
export function CourseFormModal({ course = null, onSubmit, onClose }: CourseFormModalProps): JSX.Element {
  const isEdit = course !== null;
  const nameRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>({ initialFocusRef: nameRef, onEscape: onClose });

  const [name, setName] = useState(course?.name ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [price, setPrice] = useState(course ? formatMoneyInput(course.price) : '');
  const [isActive, setIsActive] = useState(course?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting) return;

    const parsedPrice = parseMoneyInput(price);
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Informe o nome.';
    if (parsedPrice === null) errors.price = 'Preço inválido: use até 2 casas decimais.';
    setFieldErrors(errors);
    setFormError(null);
    if (errors.name || errors.price || parsedPrice === null) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() === '' ? null : description.trim(),
        price: parsedPrice,
        isActive,
      });
    } catch (error) {
      setFormError(
        isApiError(error) && error.code === 'VALIDATION_ERROR'
          ? 'Revise os dados informados: a API recusou o formulário.'
          : 'Não foi possível salvar agora. Tente novamente em instantes.',
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-form-title"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="course-form-title" className="text-lg font-semibold text-gray-900">
          {isEdit ? 'Editar curso' : 'Novo curso'}
        </h2>

        <form noValidate onSubmit={handleSubmit} className="mt-4 space-y-4">
          {formError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          ) : null}

          <div className="space-y-1">
            <label htmlFor="course-name" className="block text-sm font-medium text-gray-700">
              Nome
            </label>
            <input
              id="course-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? 'course-name-error' : undefined}
              className={inputClass}
            />
            {fieldErrors.name ? (
              <p id="course-name-error" className="text-xs text-red-600">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label htmlFor="course-description" className="block text-sm font-medium text-gray-700">
              Descrição
            </label>
            <textarea
              id="course-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="course-price" className="block text-sm font-medium text-gray-700">
              Preço (R$)
            </label>
            <input
              id="course-price"
              type="text"
              inputMode="decimal"
              placeholder="997,00"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              aria-invalid={fieldErrors.price ? true : undefined}
              aria-describedby={fieldErrors.price ? 'course-price-error' : undefined}
              className={inputClass}
            />
            {fieldErrors.price ? (
              <p id="course-price-error" className="text-xs text-red-600">
                {fieldErrors.price}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="course-active"
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
            />
            <label htmlFor="course-active" className="text-sm text-gray-700">
              Curso ativo
            </label>
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
