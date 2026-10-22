import { act, fireEvent, render, screen } from '@testing-library/react';

import { formatMonth } from '@/components/Dashboard/DashboardCharts';
import DashboardPage from '@/pages/index';
import type { DashboardMetricsResponse } from '@/types/dashboard';

const getDashboardMetrics = jest.fn();

jest.mock('@/services/dashboardService', () => ({
  getDashboardMetrics: (...args: unknown[]) => getDashboardMetrics(...args),
}));

// Os gráficos do Recharts precisam de medidas reais de layout, que o jsdom não tem.
jest.mock('@/components/Dashboard/DashboardCharts', () => ({
  ...jest.requireActual('@/components/Dashboard/DashboardCharts'),
  StudentsByCourseChart: ({ data }: { data: { courseName: string; count: number }[] }) => (
    <section aria-label="Alunos por curso">
      {data.map((row) => `${row.courseName}:${row.count}`).join(',')}
    </section>
  ),
  RevenueByMonthChart: ({ data }: { data: unknown[] }) => (
    <section aria-label="Receita por mês">{data.length} meses</section>
  ),
}));

const metrics: DashboardMetricsResponse = {
  period: { from: '2026-08-16', to: '2026-09-14' },
  totalStudents: 3000,
  newStudents: 120,
  activeStudents: 2130,
  activityRate: 71,
  totalRevenue: 1452727,
  periodRevenue: 38974.5,
  studentsByCourse: [{ courseId: 'c-1', courseName: 'Delphi', count: 387 }],
  revenueByMonth: Array.from({ length: 12 }, (_, i) => ({ month: `2026-${i + 1}`, revenue: i })),
};

beforeEach(() => {
  getDashboardMetrics.mockReset().mockResolvedValue(metrics);
});

describe('dashboard', () => {
  it('mostra skeleton e depois os 4 KPIs e os 2 gráficos', async () => {
    render(<DashboardPage />);

    expect(screen.getByLabelText('Carregando dashboard')).toBeInTheDocument();
    expect(await screen.findByText('3.000')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s38\.974,50/)).toBeInTheDocument();
    expect(screen.getByText('71%')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Alunos por curso' })).toHaveTextContent('Delphi:387');
    expect(screen.getByRole('region', { name: 'Receita por mês' })).toHaveTextContent('12 meses');
    expect(getDashboardMetrics).toHaveBeenCalledWith({ period: '30days' });
  });

  it('trocar o período busca de novo; personalizado espera as duas datas', async () => {
    render(<DashboardPage />);
    await screen.findByText('3.000');

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Período'), { target: { value: '7days' } });
    });
    expect(getDashboardMetrics).toHaveBeenLastCalledWith({ period: '7days' });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'custom' } });
    });
    expect(getDashboardMetrics).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Escolha a data inicial e a final/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-01-01' } });
      fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-03-31' } });
    });
    expect(getDashboardMetrics).toHaveBeenLastCalledWith({
      period: 'custom',
      from: '2026-01-01',
      to: '2026-03-31',
    });
  });

  it('erro ao carregar', async () => {
    getDashboardMetrics.mockRejectedValue(new Error('rede'));
    render(<DashboardPage />);

    expect(await screen.findByText(/Não foi possível carregar o dashboard/)).toBeInTheDocument();
  });

  it('formatMonth', () => {
    expect(formatMonth('2026-09')).toBe('set/26');
  });
});
