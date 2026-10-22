import { useCallback, useEffect, useState } from 'react';

import { LeadFormModal } from '@/components/Pipeline/LeadFormModal';
import type { LeadFormValues } from '@/components/Pipeline/LeadFormModal';
import { PipelineKanban } from '@/components/Pipeline/PipelineKanban';
import { LEAD_STATUS_LABELS } from '@/components/Students/studentFormat';
import { useAuth } from '@/context/AuthContext';
import { createLead, listLeads, updateLead, updateLeadStatus } from '@/services/pipelineService';
import type { LeadResponse } from '@/types/pipeline';
import type { PipelineLeadStatus } from '@/types/students';

const LOAD_ERROR = 'Não foi possível carregar o pipeline agora. Tente novamente em instantes.';

type ModalState = { mode: 'create' } | { mode: 'edit'; lead: LeadResponse } | null;

/** Página `/pipeline` (TASK-022): Kanban com filtros por vendedor e período. */
export default function PipelinePage(): JSX.Element {
  const { can } = useAuth();
  // Cosmético: quem não tem `data:view-all` recebe só os próprios leads do backend de qualquer jeito.
  const canViewAll = can('data:view-all');

  const [leads, setLeads] = useState<LeadResponse[]>([]);
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const reload = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await listLeads({
        assignedTo: assignedTo || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setLeads(result.data);
      setError(null);
      // Opções do filtro de vendedor: quem aparece na carteira sem filtro de vendedor.
      if (!assignedTo) {
        const seen = new Map(result.data.map((lead) => [lead.assignedTo, lead.assignedToName]));
        setOwners([...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [assignedTo, from, to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Otimista: move na tela, grava, e volta para a coluna de origem se a API recusar. */
  async function move(lead: LeadResponse, status: PipelineLeadStatus): Promise<void> {
    setError(null);
    setLeads((current) => current.map((row) => (row.id === lead.id ? { ...row, status } : row)));
    try {
      const saved = await updateLeadStatus(lead.id, status);
      setLeads((current) => current.map((row) => (row.id === saved.id ? saved : row)));
    } catch {
      setLeads((current) => current.map((row) => (row.id === lead.id ? lead : row)));
      setError(
        `Não foi possível mover ${lead.studentName} para ${LEAD_STATUS_LABELS[status]}. O card voltou para a coluna anterior.`,
      );
    }
  }

  async function handleSubmit(values: LeadFormValues): Promise<void> {
    if (modal?.mode === 'edit') {
      const saved = await updateLead(modal.lead.id, {
        value: values.value,
        ...(modal.lead.status === 'lost' ? { lostReason: values.lostReason } : {}),
      });
      setLeads((current) => current.map((row) => (row.id === saved.id ? saved : row)));
    } else {
      const created = await createLead({ studentId: values.studentId, value: values.value });
      setLeads((current) => [created, ...current]);
    }
    setModal(null);
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline de vendas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Arraste os cards entre as colunas (ou use “Mover para”). Marcar como vendido não registra a compra.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: 'create' })}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Nova oportunidade
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {canViewAll ? (
          <label className="text-sm text-gray-700">
            <span className="block font-medium">Vendedor</span>
            <select
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-sm text-gray-700">
          <span className="block font-medium">Criadas de</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-700">
          <span className="block font-medium">até</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className={`mt-6 ${isLoading ? 'opacity-60' : ''}`}>
        {isLoading && leads.length === 0 ? (
          <p className="text-sm text-gray-500">Carregando pipeline…</p>
        ) : (
          <PipelineKanban
            leads={leads}
            showOwner={canViewAll}
            onMove={(lead, status) => {
              void move(lead, status);
            }}
            onOpen={(lead) => setModal({ mode: 'edit', lead })}
          />
        )}
      </div>

      {modal ? (
        <LeadFormModal
          lead={modal.mode === 'edit' ? modal.lead : null}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      ) : null}
    </section>
  );
}
