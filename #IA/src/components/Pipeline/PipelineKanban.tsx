import { useState } from 'react';
import type { DragEvent } from 'react';

import { formatCurrency, formatDate, LEAD_STATUS_LABELS } from '@/components/Students/studentFormat';
import type { LeadResponse } from '@/types/pipeline';
import type { PipelineLeadStatus } from '@/types/students';

export const PIPELINE_COLUMNS: readonly PipelineLeadStatus[] = [
  'prospecting',
  'negotiation',
  'sold',
  'lost',
];

const COLUMN_ACCENT: Readonly<Record<PipelineLeadStatus, string>> = {
  prospecting: 'border-t-blue-600',
  negotiation: 'border-t-amber-500',
  sold: 'border-t-emerald-500',
  lost: 'border-t-gray-400',
};

export interface PipelineKanbanProps {
  leads: LeadResponse[];
  /** Mostra o nome do vendedor no card (admin e CEO). */
  showOwner: boolean;
  onMove: (lead: LeadResponse, status: PipelineLeadStatus) => void;
  onOpen: (lead: LeadResponse) => void;
}

const DRAG_TYPE = 'text/lead-id';

/**
 * Kanban do pipeline (TASK-022): arrastar e soltar nativo do HTML5 entre colunas e, para teclado
 * e toque, o seletor "Mover para" em cada card. Os totais do rodapé saem dos leads na tela, então
 * acompanham a mudança otimista.
 */
export function PipelineKanban({ leads, showOwner, onMove, onOpen }: PipelineKanbanProps): JSX.Element {
  const [dragOver, setDragOver] = useState<PipelineLeadStatus | null>(null);

  function handleDrop(event: DragEvent<HTMLElement>, status: PipelineLeadStatus): void {
    event.preventDefault();
    setDragOver(null);
    const lead = leads.find((candidate) => candidate.id === event.dataTransfer.getData(DRAG_TYPE));
    if (lead && lead.status !== status) {
      onMove(lead, status);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {PIPELINE_COLUMNS.map((status) => {
        const columnLeads = leads.filter((lead) => lead.status === status);
        const total = columnLeads.reduce((sum, lead) => sum + (lead.value ?? 0), 0);
        const label = LEAD_STATUS_LABELS[status];

        return (
          <section
            key={status}
            aria-label={`Coluna ${label}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(status);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(event) => handleDrop(event, status)}
            className={`flex min-h-[16rem] flex-col rounded-lg border border-t-4 bg-gray-100 ${COLUMN_ACCENT[status]} ${
              dragOver === status ? 'ring-2 ring-blue-400' : ''
            }`}
          >
            <header className="flex items-center justify-between px-3 py-2">
              <h2 className="text-sm font-semibold text-gray-900">{label}</h2>
              <span className="rounded-full bg-white px-2 text-xs font-medium text-gray-600">
                {columnLeads.length}
              </span>
            </header>

            <ul className="flex-1 space-y-2 px-3">
              {columnLeads.map((lead) => (
                <li
                  key={lead.id}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData(DRAG_TYPE, lead.id)}
                  className="cursor-grab rounded-md border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing"
                >
                  <button
                    type="button"
                    onClick={() => onOpen(lead)}
                    className="text-left text-sm font-medium text-gray-900 hover:underline"
                  >
                    {lead.studentName}
                  </button>
                  <p className="mt-1 text-sm text-gray-700">
                    {lead.value === null ? 'Sem valor' : formatCurrency(lead.value)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDate(lead.createdAt)}
                    {showOwner ? ` · ${lead.assignedToName}` : ''}
                  </p>
                  {lead.status === 'lost' && lead.lostReason ? (
                    <p className="mt-1 text-xs text-gray-500">Motivo: {lead.lostReason}</p>
                  ) : null}
                  <label className="mt-2 block text-xs text-gray-500">
                    <span className="sr-only">Mover {lead.studentName} para</span>
                    <select
                      value={lead.status}
                      onChange={(event) => onMove(lead, event.target.value as PipelineLeadStatus)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                    >
                      {PIPELINE_COLUMNS.map((option) => (
                        <option key={option} value={option}>
                          {LEAD_STATUS_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
            </ul>

            <footer className="mt-2 border-t border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900">
              Total: <span data-testid={`total-${status}`}>{formatCurrency(total)}</span>
            </footer>
          </section>
        );
      })}
    </div>
  );
}
