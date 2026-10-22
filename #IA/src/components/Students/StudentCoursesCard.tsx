import { StudentDetailCard, StudentEmptyText } from '@/components/Students/StudentDetailCard';
import { formatCurrency, formatDateOnly } from '@/components/Students/studentFormat';
import type { StudentCourseSummary } from '@/types/students';

export interface StudentCoursesCardProps {
  courses: StudentCourseSummary[];
  /** Ausente: sem o botão "+ Adicionar curso". */
  onAdd?: () => void;
}

/** Cursos comprados, do mais recente ao mais antigo (ordem do backend). */
export function StudentCoursesCard({ courses, onAdd }: StudentCoursesCardProps): JSX.Element {
  return (
    <StudentDetailCard
      title="Cursos comprados"
      action={
        onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="rounded-md px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            + Adicionar curso
          </button>
        ) : null
      }
    >
      {courses.length === 0 ? (
        <StudentEmptyText>Nenhum curso comprado ainda.</StudentEmptyText>
      ) : (
        <ul className="divide-y divide-gray-100">
          {courses.map((course) => (
            <li
              key={course.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 py-2 text-sm"
            >
              <span className="font-medium text-gray-900">{course.name}</span>
              <span className="flex gap-4 text-gray-600">
                <span>{formatCurrency(course.amount)}</span>
                <span>{formatDateOnly(course.purchaseDate)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </StudentDetailCard>
  );
}
