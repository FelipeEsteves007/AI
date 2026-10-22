import type { PublicUser, Repositories } from '@server/types/auth';
import type {
  DashboardMetricsResponse,
  DashboardQuery,
  DashboardScope,
  RevenueByMonth,
} from '@server/types/dashboard';
import { addDays, businessDayBounds, dateOnlyToDate, todayDateOnly } from '@server/utils/dates';
import { hasPermission } from '@server/utils/permissions';

const PERIOD_DAYS = { '7days': 7, '30days': 30, '90days': 90 } as const;
const MONTHS_IN_CHART = 12;

export interface DashboardService {
  getMetrics(query: DashboardQuery, actor: PublicUser): Promise<DashboardMetricsResponse>;
}

/** Intervalo efetivo: `custom` usa `from`/`to` (a rota garante os dois); os demais terminam hoje. */
export function resolvePeriod(query: DashboardQuery, today = todayDateOnly()): { from: string; to: string } {
  if (query.period === 'custom' && query.from && query.to) {
    return { from: query.from, to: query.to };
  }

  const days = query.period === 'custom' ? PERIOD_DAYS['30days'] : PERIOD_DAYS[query.period];

  return { from: addDays(today, -(days - 1)), to: today };
}

/** Os 12 meses (`YYYY-MM`) que terminam no mês de `to`, do mais antigo ao mais recente. */
export function lastMonths(to: string, count = MONTHS_IN_CHART): string[] {
  const [year, month] = to.split('-').map(Number) as [number, number];

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - index), 1));
    return date.toISOString().slice(0, 7);
  });
}

/**
 * Métricas do dashboard (TASK-019). Mesmo RBAC da listagem de alunos: admin e CEO veem a base
 * inteira; o vendedor, só os números dos próprios alunos.
 *
 * Taxa de atividade: o sistema não registra acesso nem contato (`lastContactDate` nunca é
 * preenchido), então a taxa é a fração de alunos com status `ativo` — decisão S8-3.
 */
export function createDashboardService({ dashboard }: Pick<Repositories, 'dashboard'>): DashboardService {
  return {
    async getMetrics(query, actor) {
      const scope: DashboardScope = hasPermission(actor.role, 'data:view-all')
        ? {}
        : { assignedTo: actor.id };
      const { from, to } = resolvePeriod(query);
      const months = lastMonths(to);
      const chartStart = `${months[0]}-01`;

      const [totalStudents, newStudents, activeStudents, totalRevenue, periodRevenue, byCourse, purchases] =
        await Promise.all([
          dashboard.countStudents(scope),
          dashboard.countStudents({
            ...scope,
            createdFrom: businessDayBounds(from).start,
            createdTo: businessDayBounds(to).end,
          }),
          dashboard.countStudents({ ...scope, status: 'ativo' }),
          dashboard.sumRevenue(scope),
          dashboard.sumRevenue({ ...scope, from: dateOnlyToDate(from), to: dateOnlyToDate(to) }),
          dashboard.studentsByCourse(scope),
          dashboard.purchasesInRange({
            ...scope,
            from: dateOnlyToDate(chartStart),
            to: dateOnlyToDate(to),
          }),
        ]);

      const revenueByMonth = new Map<string, number>(months.map((month) => [month, 0]));
      for (const purchase of purchases) {
        const month = purchase.purchaseDate.toISOString().slice(0, 7);
        if (revenueByMonth.has(month)) {
          revenueByMonth.set(month, (revenueByMonth.get(month) ?? 0) + Number(purchase.amount));
        }
      }

      return {
        period: { from, to },
        totalStudents,
        newStudents,
        activeStudents,
        activityRate:
          totalStudents === 0 ? 0 : Math.round((activeStudents / totalStudents) * 1000) / 10,
        totalRevenue: Number(totalRevenue),
        periodRevenue: Number(periodRevenue),
        studentsByCourse: [...byCourse].sort(
          (a, b) => b.count - a.count || a.courseName.localeCompare(b.courseName),
        ),
        revenueByMonth: months.map(
          (month): RevenueByMonth => ({
            month,
            revenue: Math.round((revenueByMonth.get(month) ?? 0) * 100) / 100,
          }),
        ),
      };
    },
  };
}
