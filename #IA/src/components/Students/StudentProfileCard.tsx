import { InlineEditField } from '@/components/Students/InlineEditField';
import { StudentDetailCard } from '@/components/Students/StudentDetailCard';
import type { StudentEditableField } from '@/components/Students/studentErrors';
import {
  formatCpf,
  formatDateTime,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from '@/components/Students/studentFormat';
import { StudentStatusBadge } from '@/components/Students/StudentStatusBadge';
import type { StudentResponse } from '@/types/students';

export type SaveStudentField = (field: StudentEditableField, value: string) => Promise<string | null>;

export interface StudentProfileCardProps {
  student: StudentResponse;
  onSaveField: SaveStudentField;
  /** Incrementado pelo botão "Editar" da página: abre o nome em edição. */
  editRequest?: number;
}

const STATUS_SELECT_OPTIONS = STATUS_OPTIONS.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

/** Dados pessoais com edição inline campo a campo. */
export function StudentProfileCard({
  student,
  onSaveField,
  editRequest = 0,
}: StudentProfileCardProps): JSX.Element {
  return (
    <StudentDetailCard title="Dados pessoais">
      <div className="divide-y divide-gray-100">
        <InlineEditField
          id="student-name"
          label="Nome"
          value={student.name}
          autoComplete="off"
          editRequest={editRequest}
          onSave={(value) => onSaveField('name', value)}
        />
        <InlineEditField
          id="student-email"
          label="E-mail"
          kind="email"
          inputMode="email"
          value={student.email}
          onSave={(value) => onSaveField('email', value)}
        />
        <InlineEditField
          id="student-phone"
          label="Telefone"
          kind="tel"
          inputMode="tel"
          value={student.phone ?? ''}
          onSave={(value) => onSaveField('phone', value)}
        />
        <InlineEditField
          id="student-cpf"
          label="CPF"
          inputMode="numeric"
          value={student.cpf ?? ''}
          display={formatCpf(student.cpf)}
          onSave={(value) => onSaveField('cpf', value)}
        />
        <InlineEditField
          id="student-status"
          label="Status"
          kind="select"
          value={student.status}
          options={STATUS_SELECT_OPTIONS}
          display={<StudentStatusBadge status={student.status} />}
          onSave={(value) => onSaveField('status', value)}
        />
        <div className="py-2">
          <span className="block text-xs font-medium uppercase text-gray-500">Responsável</span>
          <span className="mt-1 block text-sm text-gray-900">
            {student.assignedToName ?? <span className="text-gray-400">Sem responsável</span>}
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Atualizado em <time dateTime={student.updatedAt}>{formatDateTime(student.updatedAt)}</time>
      </p>
    </StudentDetailCard>
  );
}
