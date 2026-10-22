import { STATUS_LABELS, STATUS_OPTIONS, isStudentStatus } from '@/components/Students/studentFormat';
import type { StudentStatus } from '@/types/students';

export interface SellerOption {
  id: string;
  name: string;
}

export interface StudentFiltersProps {
  status: StudentStatus | '';
  assignedTo: string;
  /**
   * Opções do filtro de vendedor. `null` esconde o dropdown — hoje só o admin recebe a lista
   * (S6-8). Cosmético: o backend ignora `assignedTo` para vendedor de qualquer jeito.
   */
  sellers: SellerOption[] | null;
  hasActiveFilters: boolean;
  onStatusChange: (status: StudentStatus | '') => void;
  onAssignedToChange: (assignedTo: string) => void;
  onClear: () => void;
}

const selectClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:w-44';
const labelClass = 'mb-1 block text-xs font-medium text-gray-500';

/** Filtros da listagem. Sem filtro de curso nesta sprint (S6-7). */
export function StudentFilters({
  status,
  assignedTo,
  sellers,
  hasActiveFilters,
  onStatusChange,
  onAssignedToChange,
  onClear,
}: StudentFiltersProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div>
        <label htmlFor="student-filter-status" className={labelClass}>
          Status
        </label>
        <select
          id="student-filter-status"
          value={status}
          onChange={(event) => {
            const next = event.target.value;
            onStatusChange(isStudentStatus(next) ? next : '');
          }}
          className={selectClass}
        >
          <option value="">Todos</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {STATUS_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      {sellers ? (
        <div>
          <label htmlFor="student-filter-seller" className={labelClass}>
            Vendedor
          </label>
          <select
            id="student-filter-seller"
            value={assignedTo}
            onChange={(event) => onAssignedToChange(event.target.value)}
            className={selectClass}
          >
            <option value="">Todos</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="self-start rounded-md px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:self-auto"
        >
          Limpar filtros
        </button>
      ) : null}
    </div>
  );
}
