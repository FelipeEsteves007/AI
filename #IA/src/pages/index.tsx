import { useEffect, useState } from 'react';

import { RevenueByMonthChart, StudentsByCourseChart } from '@/components/Dashboard/DashboardCharts';
import { formatCount, formatCurrency, formatDateOnly } from '@/components/Students/studentFormat';
import { getDashboardMetrics } from '@/services/dashboardService';
import type { DashboardMetricsResponse, DashboardPeriod } from '@/types/dashboard';

const PERIOD_OPTIONS: readonly { value: DashboardPeriod; label: string }[] = [
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: '90days', label: 'Últimos 90 dias' },
  { value: 'custom', label: 'Personalizado' },
];

const LOAD_ERROR = 'Não foi possível carregar o dashboard agora. Tente novamente em instantes.';

interface KpiCardProps {
  label: string;
  value: string;
  hint: string;
  accent: string;
}

function KpiCard({ label, value, hint, accent }: KpiCardProps): JSX.Element {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`h-1 w-10 rounded-full ${accent}`} aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

function DashboardSkeleton(): JSX.Element {
  return (
    <div aria-busy="true" aria-label="Carregando dashboard" className="mt-6 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-32 rounded-lg bg-gray-200" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-lg bg-gray-200" />
        <div className="h-80 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

/** Dashboard (TASK-020): KPIs, alunos por curso e receita por mês, com filtro de período. */
export default function DashboardPage(): JSX.Element {
  const [period, setPeriod] = useState<DashboardPeriod>('30days');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Personalizado só busca com as duas datas preenchidas e em ordem.
  const customReady = period !== 'custom' || (from !== '' && to !== '' && from <= to);

  useEffect(() => {
    if (!customReady) return;
    let active = true;
    setIsLoading(true);
    getDashboardMetrics(period === 'custom' ? { period, from, to } : { period })
      .then((result) => {
        if (!active) return;
        setMetrics(result);
        setError(null);
      })
      .catch(() => {
        if (active) setError(LOAD_ERROR);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, from, to, customReady]);

  return (
    <section className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {metrics ? (
            <p className="mt-1 text-sm text-gray-500">
              De {formatDateOnly(metrics.period.from)} a {formatDateOnly(metrics.period.to)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-gray-700">
            <span className="block font-medium">Período</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {period === 'custom' ? (
            <>
              <label className="text-sm text-gray-700">
                <span className="block font-medium">De</span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-gray-700">
                <span className="block font-medium">Até</span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </>
          ) : null}
        </div>
      </div>

      {period === 'custom' && !customReady ? (
        <p className="mt-4 text-sm text-amber-700">
          Escolha a data inicial e a final (a inicial não pode ser depois da final).
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {isLoading && !metrics ? (
        <DashboardSkeleton />
      ) : metrics ? (
        <div className={isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total de alunos"
              value={formatCount(metrics.totalStudents)}
              hint={`${formatCount(metrics.activeStudents)} ativos`}
              accent="bg-blue-600"
            />
            <KpiCard
              label="Alunos novos"
              value={formatCount(metrics.newStudents)}
              hint="Cadastrados no período"
              accent="bg-emerald-500"
            />
            <KpiCard
              label="Receita no período"
              value={formatCurrency(metrics.periodRevenue)}
              hint={`Total geral: ${formatCurrency(metrics.totalRevenue)}`}
              accent="bg-emerald-500"
            />
            <KpiCard
              label="Taxa de atividade"
              value={`${metrics.activityRate.toLocaleString('pt-BR')}%`}
              hint="Alunos com status ativo"
              accent="bg-amber-500"
            />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <StudentsByCourseChart data={metrics.studentsByCourse} />
            <RevenueByMonthChart data={metrics.revenueByMonth} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
