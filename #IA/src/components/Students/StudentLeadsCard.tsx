import { StudentDetailCard, StudentEmptyText } from '@/components/Students/StudentDetailCard';
import { formatCurrency, LEAD_STATUS_LABELS } from '@/components/Students/studentFormat';
import type { PipelineLeadStatus, StudentPipelineLeadSummary } from '@/types/students';

const LEAD_STATUS_STYLES: Readonly<Record<PipelineLeadStatus, string>> = {
  prospecting: 'bg-blue-50 text-blue-700 ring-blue-200',
  negotiation: 'bg-amber-50 text-amber-700 ring-amber-200',
  sold: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  lost: 'bg-gray-100 text-gray-600 ring-gray-300',
};

/** Oportunidades do pipeline ligadas ao aluno, da mais recente à mais antiga. */
export function StudentLeadsCard({ leads }: { leads: StudentPipelineLeadSummary[] }): JSX.Element {
  return (
    <StudentDetailCard title="Oportunidades">
      {leads.length === 0 ? (
        <StudentEmptyText>Nenhuma oportunidade para este aluno.</StudentEmptyText>
      ) : (
        <ul className="divide-y divide-gray-100">
          {leads.map((lead) => (
            <li key={lead.id} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${LEAD_STATUS_STYLES[lead.status]}`}
              >
                {LEAD_STATUS_LABELS[lead.status]}
              </span>
              <span className={lead.value === null ? 'text-gray-400' : 'text-gray-900'}>
                {lead.value === null ? 'Sem valor' : formatCurrency(lead.value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </StudentDetailCard>
  );
}
