/** Tipos do dashboard (Sprint 8), espelhando `api/types/dashboard.ts`. */

export type DashboardPeriod = '7days' | '30days' | '90days' | 'custom';

export interface DashboardQuery {
  period: DashboardPeriod;
  from?: string;
  to?: string;
}

export interface DashboardMetricsResponse {
  period: { from: string; to: string };
  totalStudents: number;
  newStudents: number;
  activeStudents: number;
  activityRate: number;
  totalRevenue: number;
  periodRevenue: number;
  studentsByCourse: { courseId: string; courseName: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}
