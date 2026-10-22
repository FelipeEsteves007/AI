import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatCurrency } from '@/components/Students/studentFormat';
import type { DashboardMetricsResponse } from '@/types/dashboard';

/** Cores do design system (`ui/design.md`). */
export const CHART_COLORS = {
  primary: '#2563EB',
  success: '#10B981',
  warning: '#F59E0B',
} as const;

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** `2026-09` → `set/26`. */
export function formatMonth(month: string): string {
  const [year, index] = month.split('-');
  return `${MONTHS[Number(index) - 1] ?? index}/${(year ?? '').slice(2)}`;
}

function ChartCard({ title, children }: { title: string; children: JSX.Element }): JSX.Element {
  return (
    <section
      aria-label={title}
      className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="mt-4 h-64">{children}</div>
    </section>
  );
}

/** Gráfico de barras: alunos por curso (TASK-020). */
export function StudentsByCourseChart({
  data,
}: {
  data: DashboardMetricsResponse['studentsByCourse'];
}): JSX.Element {
  return (
    <ChartCard title="Alunos por curso">
      {data.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma compra registrada ainda.</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="courseName" tick={{ fontSize: 12 }} interval={0} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [value, 'Alunos']} />
            <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/** Gráfico de linhas: receita por mês nos últimos 12 meses (TASK-020). */
export function RevenueByMonthChart({
  data,
}: {
  data: DashboardMetricsResponse['revenueByMonth'];
}): JSX.Element {
  return (
    <ChartCard title="Receita por mês">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
          />
          <Tooltip
            labelFormatter={(label) => formatMonth(String(label))}
            formatter={(value) => [formatCurrency(Number(value)), 'Receita']}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke={CHART_COLORS.success}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
