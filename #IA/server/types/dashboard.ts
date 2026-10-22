/* Tipos do dashboard (TASK-019) — Sprint 8. */

export const DASHBOARD_PERIODS = ['7days', '30days', '90days', 'custom'] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

/** Query de `GET /api/dashboard/metrics`, já validada. `from`/`to` só no `custom`. */
export interface DashboardQuery {
  period: DashboardPeriod;
  /** `YYYY-MM-DD`. */
  from?: string;
  /** `YYYY-MM-DD`. */
  to?: string;
}

export interface StudentsByCourse {
  courseId: string;
  courseName: string;
  count: number;
}

export interface RevenueByMonth {
  /** `YYYY-MM`. */
  month: string;
  revenue: number;
}

export interface DashboardMetricsResponse {
  /** Intervalo efetivo, `YYYY-MM-DD`, inclusivo. */
  period: { from: string; to: string };
  totalStudents: number;
  /** Alunos cadastrados dentro do período. */
  newStudents: number;
  /** Alunos com status `ativo`. */
  activeStudents: number;
  /** `activeStudents / totalStudents` em %, com 1 casa. */
  activityRate: number;
  /** Soma de todas as compras. */
  totalRevenue: number;
  /** Soma das compras dentro do período. */
  periodRevenue: number;
  /** Alunos com compra, por curso, do maior para o menor. */
  studentsByCourse: StudentsByCourse[];
  /** Últimos 12 meses até o fim do período, incluindo os meses sem venda. */
  revenueByMonth: RevenueByMonth[];
}

/** Escopo já resolvido pelo serviço: `assignedTo` presente prende ao vendedor. */
export interface DashboardScope {
  assignedTo?: string;
}

export interface StudentCountFilter extends DashboardScope {
  createdFrom?: Date;
  createdTo?: Date;
  status?: 'ativo';
}

export interface PurchaseRangeFilter extends DashboardScope {
  /** Datas de `@db.Date` (meia-noite UTC), inclusivas. */
  from?: Date;
  to?: Date;
}

/** Agregações de que o dashboard precisa. Em produção, Prisma; nos testes, fake em memória. */
export interface DashboardRepository {
  countStudents(filter: StudentCountFilter): Promise<number>;
  /** Soma como string decimal (`"1234.50"`). */
  sumRevenue(filter: PurchaseRangeFilter): Promise<string>;
  studentsByCourse(scope: DashboardScope): Promise<StudentsByCourse[]>;
  /** Compras no intervalo, só data e valor (string decimal). */
  purchasesInRange(filter: PurchaseRangeFilter): Promise<{ purchaseDate: Date; amount: string }[]>;
}
