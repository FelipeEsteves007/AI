import type { KeyboardEvent, MouseEvent } from 'react';

import { StudentStatusBadge } from '@/components/Students/StudentStatusBadge';
import { formatCpf, formatDate } from '@/components/Students/studentFormat';
import type { SortOrder, StudentResponse, StudentSortBy } from '@/types/students';

export interface StudentTableProps {
  students: StudentResponse[];
  sortBy: StudentSortBy;
  order: SortOrder;
  onSortChange: (sortBy: StudentSortBy) => void;
  onOpen: (student: StudentResponse) => void;
  onEdit: (student: StudentResponse) => void;
  /**
   * Sem callback, a ação Excluir não aparece. A página só o passa com `students:delete` —
   * cosmético; quem barra de verdade é o backend (403).
   */
  onDelete?: (student: StudentResponse) => void;
  /** Com `selectedIds` e `onToggleSelect`, aparece a coluna de seleção (envio de e-mail). */
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (student: StudentResponse) => void;
  onToggleSelectAll?: (select: boolean) => void;
}

const headerClass =
  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500';
const cellClass = 'px-4 py-3 text-sm text-gray-700';
const actionClass =
  'rounded-md border border-gray-300 bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1';
const dangerActionClass =
  'rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1';

type AriaSort = 'ascending' | 'descending' | 'none';

interface SortableHeaderProps {
  label: string;
  column: StudentSortBy;
  sortBy: StudentSortBy;
  order: SortOrder;
  onSortChange: (sortBy: StudentSortBy) => void;
}

function SortableHeader({
  label,
  column,
  sortBy,
  order,
  onSortChange,
}: SortableHeaderProps): JSX.Element {
  const active = sortBy === column;
  const ariaSort: AriaSort = active ? (order === 'asc' ? 'ascending' : 'descending') : 'none';
  const arrow = active ? (order === 'asc' ? '▲' : '▼') : '↕';

  return (
    <th scope="col" aria-sort={ariaSort} className={headerClass}>
      <button
        type="button"
        onClick={() => onSortChange(column)}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        {label}
        <span aria-hidden="true" className={active ? 'text-blue-600' : 'text-gray-300'}>
          {arrow}
        </span>
      </button>
    </th>
  );
}

interface RowActionsProps {
  student: StudentResponse;
  onOpen: (student: StudentResponse) => void;
  onEdit: (student: StudentResponse) => void;
  onDelete?: (student: StudentResponse) => void;
}

/** Ações da linha. Param a propagação para não disparar também o clique da linha. */
function RowActions({ student, onOpen, onEdit, onDelete }: RowActionsProps): JSX.Element {
  function run(action: (student: StudentResponse) => void) {
    return (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      action(student);
    };
  }

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        className={actionClass}
        aria-label={`Ver ${student.name}`}
        onClick={run(onOpen)}
      >
        Ver
      </button>
      <button
        type="button"
        className={actionClass}
        aria-label={`Editar ${student.name}`}
        onClick={run(onEdit)}
      >
        Editar
      </button>
      {onDelete ? (
        <button
          type="button"
          className={dangerActionClass}
          aria-label={`Excluir ${student.name}`}
          onClick={run(onDelete)}
        >
          Excluir
        </button>
      ) : null}
    </div>
  );
}

/**
 * Lista de alunos: tabela a partir de `md` e cards abaixo disso. Os dois ficam no DOM e o
 * Tailwind escolhe qual aparece; todo o estado (ordenação, página, filtros) fica na página.
 */
export function StudentTable({
  students,
  sortBy,
  order,
  onSortChange,
  onOpen,
  onEdit,
  onDelete,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: StudentTableProps): JSX.Element {
  const sortProps = { sortBy, order, onSortChange };
  const selectable = Boolean(selectedIds && onToggleSelect);
  const allSelected =
    selectable && students.length > 0 && students.every((student) => selectedIds?.has(student.id));

  function selectBox(student: StudentResponse): JSX.Element | null {
    if (!selectable) return null;
    return (
      <input
        type="checkbox"
        checked={selectedIds?.has(student.id) ?? false}
        onClick={(event) => event.stopPropagation()}
        onChange={() => onToggleSelect?.(student)}
        aria-label={`Selecionar ${student.name}`}
        className="h-4 w-4 rounded border-gray-300 text-blue-600"
      />
    );
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, student: StudentResponse) {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(student);
    }
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <caption className="sr-only">Alunos</caption>
          <thead className="bg-gray-50">
            <tr>
              {selectable ? (
                <th scope="col" className={`${headerClass} w-10`}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(event) => onToggleSelectAll?.(event.target.checked)}
                    aria-label="Selecionar todos desta página"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                </th>
              ) : null}
              <SortableHeader label="Nome" column="name" {...sortProps} />
              <th scope="col" className={headerClass}>
                E-mail
              </th>
              <th scope="col" className={headerClass}>
                Telefone
              </th>
              <th scope="col" className={headerClass}>
                CPF
              </th>
              <SortableHeader label="Status" column="status" {...sortProps} />
              <th scope="col" className={headerClass}>
                Vendedor
              </th>
              <SortableHeader label="Cadastro" column="createdAt" {...sortProps} />
              <th scope="col" className={`${headerClass} text-right`}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {students.map((student) => (
              <tr
                key={student.id}
                tabIndex={0}
                onClick={() => onOpen(student)}
                onKeyDown={(event) => handleRowKeyDown(event, student)}
                className="cursor-pointer bg-white hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
              >
                {selectable ? <td className={cellClass}>{selectBox(student)}</td> : null}
                <th scope="row" className={`${cellClass} text-left font-medium text-gray-900`}>
                  {student.name}
                </th>
                <td className={cellClass}>{student.email}</td>
                <td className={`${cellClass} whitespace-nowrap`}>{student.phone ?? '—'}</td>
                <td className={`${cellClass} whitespace-nowrap`}>{formatCpf(student.cpf)}</td>
                <td className={cellClass}>
                  <StudentStatusBadge status={student.status} />
                </td>
                <td className={cellClass}>{student.assignedToName ?? '—'}</td>
                <td className={`${cellClass} whitespace-nowrap`}>{formatDate(student.createdAt)}</td>
                <td className={`${cellClass} text-right`}>
                  <RowActions student={student} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label="Alunos" className="space-y-3 md:hidden">
        {students.map((student) => (
          <li key={student.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              aria-label={`Abrir ${student.name}`}
              onClick={() => onOpen(student)}
              className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="font-medium text-gray-900">{student.name}</span>
                <StudentStatusBadge status={student.status} />
              </span>
              <span className="mt-1 block break-all text-sm text-gray-600">{student.email}</span>
              <span className="mt-2 block text-xs text-gray-500">
                {student.phone ?? 'Sem telefone'} · CPF {formatCpf(student.cpf)}
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                {student.assignedToName ?? 'Sem vendedor'} · desde {formatDate(student.createdAt)}
              </span>
            </button>
            <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
              {selectBox(student)}
              <div className="flex-1" />
              <RowActions student={student} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
