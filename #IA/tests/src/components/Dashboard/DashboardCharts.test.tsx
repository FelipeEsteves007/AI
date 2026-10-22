import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';

import { RevenueByMonthChart, StudentsByCourseChart } from '@/components/Dashboard/DashboardCharts';

// O ResponsiveContainer mede o pai (0×0 no jsdom); com tamanho fixo o gráfico chega a renderizar.
jest.mock('recharts', () => {
  const actual = jest.requireActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) => (
      <actual.ResponsiveContainer width={600} height={300}>
        {children}
      </actual.ResponsiveContainer>
    ),
  };
});

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe('gráficos do dashboard', () => {
  it('barras de alunos por curso renderizam sem erro', () => {
    const { container } = render(
      <StudentsByCourseChart data={[{ courseId: 'c-1', courseName: 'Delphi', count: 3 }]} />,
    );

    expect(screen.getByRole('region', { name: 'Alunos por curso' })).toBeInTheDocument();
    expect(container.querySelector('.recharts-wrapper')).not.toBeNull();
  });

  it('sem compras mostra mensagem em vez do gráfico', () => {
    render(<StudentsByCourseChart data={[]} />);

    expect(screen.getByText('Nenhuma compra registrada ainda.')).toBeInTheDocument();
  });

  it('linha de receita por mês renderiza sem erro', () => {
    const { container } = render(
      <RevenueByMonthChart
        data={[
          { month: '2026-08', revenue: 100 },
          { month: '2026-09', revenue: 250 },
        ]}
      />,
    );

    expect(container.querySelector('.recharts-wrapper')).not.toBeNull();
  });
});
