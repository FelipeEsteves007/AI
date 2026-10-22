import { act, fireEvent, render, screen, within } from '@testing-library/react';

import PipelinePage from '@/pages/pipeline';
import { ApiError } from '@/services/apiClient';
import type { Permission } from '@/types/auth';
import type { LeadResponse } from '@/types/pipeline';

let permissions: Permission[] = ['data:view-all'];

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ can: (permission: Permission) => permissions.includes(permission) }),
}));

const listLeads = jest.fn();
const createLead = jest.fn();
const updateLead = jest.fn();
const updateLeadStatus = jest.fn();

jest.mock('@/services/pipelineService', () => ({
  listLeads: (...args: unknown[]) => listLeads(...args),
  createLead: (...args: unknown[]) => createLead(...args),
  updateLead: (...args: unknown[]) => updateLead(...args),
  updateLeadStatus: (...args: unknown[]) => updateLeadStatus(...args),
}));

jest.mock('@/services/studentsService', () => ({
  listStudents: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
}));

function lead(overrides: Partial<LeadResponse>): LeadResponse {
  return {
    id: 'l-1',
    studentId: 's-1',
    studentName: 'Ana Aluna',
    status: 'prospecting',
    value: 500,
    lostReason: null,
    assignedTo: 'u-ana',
    assignedToName: 'Ana',
    createdAt: '2026-09-10T15:00:00.000Z',
    updatedAt: '2026-09-10T15:00:00.000Z',
    ...overrides,
  };
}

const leads = [
  lead({}),
  lead({ id: 'l-2', studentName: 'Bia Aluna', value: 250.5 }),
  lead({ id: 'l-3', studentName: 'Caio Aluno', status: 'sold', value: 997, assignedTo: 'u-bruno', assignedToName: 'Bruno' }),
];

beforeEach(() => {
  permissions = ['data:view-all'];
  listLeads.mockReset().mockResolvedValue({ data: leads, summary: {} });
  updateLeadStatus.mockReset().mockImplementation(async (id: string, status: string) => ({
    ...leads.find((row) => row.id === id),
    status,
  }));
  createLead.mockReset();
  updateLead.mockReset();
});

const column = (label: string) => screen.getByRole('region', { name: `Coluna ${label}` });

describe('pipeline', () => {
  it('distribui os leads nas 4 colunas com o total no rodapé', async () => {
    render(<PipelinePage />);
    await screen.findByText('Ana Aluna');

    expect(within(column('Prospecção')).getAllByRole('listitem')).toHaveLength(2);
    expect(within(column('Vendido')).getByText('Caio Aluno')).toBeInTheDocument();
    expect(within(column('Negociação')).queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByTestId('total-prospecting')).toHaveTextContent(/R\$\s750,50/);
    expect(screen.getByTestId('total-sold')).toHaveTextContent(/R\$\s997,00/);
  });

  it('arrastar e soltar move o card e grava o novo status', async () => {
    render(<PipelinePage />);
    const card = (await screen.findByText('Ana Aluna')).closest('li') as HTMLElement;
    const data = new Map<string, string>();
    const dataTransfer = {
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? '',
    };

    fireEvent.dragStart(card, { dataTransfer });
    await act(async () => {
      fireEvent.drop(column('Negociação'), { dataTransfer });
    });

    expect(updateLeadStatus).toHaveBeenCalledWith('l-1', 'negotiation');
    expect(within(column('Negociação')).getByText('Ana Aluna')).toBeInTheDocument();
    expect(screen.getByTestId('total-negotiation')).toHaveTextContent(/R\$\s500,00/);
  });

  it('se a API recusar, o card volta para a coluna de origem', async () => {
    updateLeadStatus.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'x'));
    render(<PipelinePage />);
    await screen.findByText('Ana Aluna');

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Mover Ana Aluna para'), { target: { value: 'lost' } });
    });

    expect(within(column('Prospecção')).getByText('Ana Aluna')).toBeInTheDocument();
    expect(screen.getByText(/O card voltou para a coluna anterior/)).toBeInTheDocument();
  });

  it('filtro por vendedor (só com data:view-all) e por período recarregam', async () => {
    render(<PipelinePage />);
    await screen.findByText('Ana Aluna');

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Vendedor'), { target: { value: 'u-bruno' } });
    });
    expect(listLeads).toHaveBeenLastCalledWith({ assignedTo: 'u-bruno', from: undefined, to: undefined });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Criadas de'), { target: { value: '2026-09-01' } });
    });
    expect(listLeads).toHaveBeenLastCalledWith({ assignedTo: 'u-bruno', from: '2026-09-01', to: undefined });
  });

  it('vendedor não vê o filtro de vendedor', async () => {
    permissions = [];
    render(<PipelinePage />);
    await screen.findByText('Ana Aluna');

    expect(screen.queryByLabelText('Vendedor')).not.toBeInTheDocument();
  });

  it('clique no card abre a edição do valor', async () => {
    updateLead.mockResolvedValue(lead({ value: 800 }));
    render(<PipelinePage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ana Aluna' }));

    const dialog = screen.getByRole('dialog', { name: 'Oportunidade — Ana Aluna' });
    fireEvent.change(within(dialog).getByLabelText('Valor (R$)'), { target: { value: '800' } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    });

    expect(updateLead).toHaveBeenCalledWith('l-1', { value: '800.00' });
  });
});
