import { InlineEditField } from '@/components/Students/InlineEditField';
import { StudentDetailCard } from '@/components/Students/StudentDetailCard';

export interface StudentNotesCardProps {
  notes: string | null;
  /** Mesmo contrato do `InlineEditField`: `null` em sucesso, mensagem em erro. */
  onSave: (value: string) => Promise<string | null>;
}

/** Anotações livres sobre o aluno, editáveis e salvas ao sair do campo. */
export function StudentNotesCard({ notes, onSave }: StudentNotesCardProps): JSX.Element {
  return (
    <StudentDetailCard title="Anotações">
      <InlineEditField
        id="student-notes"
        label="Anotações"
        kind="textarea"
        hideLabel
        value={notes ?? ''}
        emptyText="Sem anotações."
        onSave={onSave}
      />
    </StudentDetailCard>
  );
}
