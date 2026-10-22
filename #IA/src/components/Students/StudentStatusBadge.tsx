import { STATUS_LABELS } from '@/components/Students/studentFormat';
import type { StudentStatus } from '@/types/students';

const STATUS_STYLES: Readonly<Record<StudentStatus, string>> = {
  ativo: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  inativo: 'bg-gray-100 text-gray-600 ring-gray-300',
  pausado: 'bg-amber-50 text-amber-700 ring-amber-200',
};

export function StudentStatusBadge({ status }: { status: StudentStatus }): JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
