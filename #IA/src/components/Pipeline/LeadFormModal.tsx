import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { formatMoneyInput, parseMoneyInput } from '@/components/Courses/courseForm';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { isApiError } from '@/services/apiClient';
import { listStudents } from '@/services/studentsService';
import type { LeadResponse } from '@/types/pipeline';
import type { StudentResponse } from '@/types/students';

export interface LeadFormValues {
  studentId: string;
  value: string | null;
  lostReason: string | null;
}

export interface LeadFormModalProps {
  /** Ausente: nova oportunidade (com busca de aluno). */
  lead?: LeadResponse | null;
  onSubmit: (values: LeadFormValues) => Promise<void>;
  onClose: () => void;
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

/** Modal de nova oportunidade e de edição (valor e motivo de perda) — TASK-022. */
export function LeadFormModal({ lead = null, onSubmit, onClose }: LeadFormModalProps): JSX.Element {
  const isEdit = lead !== null;
  const firstRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>({ initialFocusRef: firstRef, onEscape: onClose });

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<StudentResponse[]>([]);
  const [student, setStudent] = useState<StudentResponse | null>(null);
  const [value, setValue] = useState(lead?.value == null ? '' : formatMoneyInput(lead.value));
  const [lostReason, setLostReason] = useState(lead?.lostReason ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Busca de aluno com debounce curto (só na criação). O backend já limita à carteira do vendedor.
  useEffect(() => {
    if (isEdit || search.trim().length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      listStudents({ search: search.trim(), limit: 8 })
        .then((page) => {
          if (active) setResults(page.data);
        })
        .catch(() => {
          if (active) setResults([]);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, isEdit]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting) return;

    const parsed = value.trim() === '' ? null : parseMoneyInput(value);
    if (!isEdit && !student) {
      setError('Escolha o aluno.');
      return;
    }
    if (value.trim() !== '' && parsed === null) {
      setError('Valor inválido: use até 2 casas decimais.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        studentId: lead?.studentId ?? student?.id ?? '',
        value: parsed,
        lostReason: lostReason.trim() === '' ? null : lostReason.trim(),
      });
    } catch (caught) {
      setError(
        isApiError(caught) && caught.status === 404
          ? 'Aluno ou oportunidade não encontrado.'
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
        aria-labelledby="lead-form-title"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="lead-form-title" className="text-lg font-semibold text-gray-900">
          {isEdit ? `Oportunidade — ${lead.studentName}` : 'Nova oportunidade'}
        </h2>

        <form noValidate onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {isEdit ? null : (
            <div className="space-y-1">
              <label htmlFor="lead-student" className="block text-sm font-medium text-gray-700">
                Aluno
              </label>
              {student ? (
                <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                  <span>
                    {student.name} <span className="text-gray-500">({student.email})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setStudent(null)}
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    id="lead-student"
                    ref={firstRef}
                    type="search"
                    placeholder="Digite nome ou e-mail"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className={inputClass}
                  />
                  {results.length > 0 ? (
                    <ul className="max-h-48 overflow-y-auto rounded-md border border-gray-200">
                      {results.map((candidate) => (
                        <li key={candidate.id}>
                          <button
                            type="button"
                            onClick={() => setStudent(candidate)}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            {candidate.name}{' '}
                            <span className="text-gray-500">({candidate.email})</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="lead-value" className="block text-sm font-medium text-gray-700">
              Valor (R$)
            </label>
            <input
              id="lead-value"
              ref={isEdit ? firstRef : undefined}
              type="text"
              inputMode="decimal"
              placeholder="Opcional"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className={inputClass}
            />
          </div>

          {isEdit && lead.status === 'lost' ? (
            <div className="space-y-1">
              <label htmlFor="lead-lost-reason" className="block text-sm font-medium text-gray-700">
                Motivo da perda
              </label>
              <textarea
                id="lead-lost-reason"
                rows={2}
                value={lostReason}
                onChange={(event) => setLostReason(event.target.value)}
                className={inputClass}
              />
            </div>
          ) : null}

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
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
