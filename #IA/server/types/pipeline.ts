import type { LeadStatus, Prisma } from '@prisma/client';

/* Tipos do pipeline de vendas (TASK-021) — Sprint 8. */

export type { LeadStatus };

export interface LeadResponse {
  id: string;
  studentId: string;
  studentName: string;
  status: LeadStatus;
  value: number | null;
  lostReason: string | null;
  assignedTo: string;
  assignedToName: string;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
}

export type PipelineSummary = Record<LeadStatus, { count: number; total: number }>;

export interface PipelineListResponse {
  data: LeadResponse[];
  summary: PipelineSummary;
}

/** Query de `GET /api/pipeline`, já validada. `from`/`to` filtram a data de criação. */
export interface PipelineListQuery {
  assignedTo?: string;
  /** `YYYY-MM-DD`. */
  from?: string;
  /** `YYYY-MM-DD`. */
  to?: string;
}

export interface CreateLeadRequest {
  studentId: string;
  status?: LeadStatus;
  /** String decimal com 2 casas. */
  value?: string | null;
  /** Ignorado para vendedor (vira o próprio id). */
  assignedTo?: string;
}

export interface UpdateLeadRequest {
  value?: string | null;
  lostReason?: string | null;
  /** Ignorado para vendedor. */
  assignedTo?: string;
}

export interface UpdateLeadStatusRequest {
  status: LeadStatus;
  lostReason?: string | null;
}

export type LeadRecord = Prisma.PipelineLeadGetPayload<{
  include: { student: { select: { name: true } }; user: { select: { name: true } } };
}>;

export interface LeadFilter {
  assignedTo?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface CreateLeadData {
  studentId: string;
  status: LeadStatus;
  value: string | null;
  assignedTo: string;
}

export interface UpdateLeadData {
  status?: LeadStatus;
  value?: string | null;
  lostReason?: string | null;
  assignedTo?: string;
}

/**
 * Acesso a dados de leads. `update` leva o escopo no `where` (vendedor só os próprios): fora do
 * escopo ou inexistente lança `P2025`, que o serviço traduz para 404.
 */
export interface PipelineLeadRepository {
  /** Do mais recente para o mais antigo. */
  list(filter: LeadFilter): Promise<LeadRecord[]>;
  findById(id: string, scope: Pick<LeadFilter, 'assignedTo'>): Promise<LeadRecord | null>;
  create(data: CreateLeadData): Promise<LeadRecord>;
  update(
    id: string,
    data: UpdateLeadData,
    scope: Pick<LeadFilter, 'assignedTo'>,
  ): Promise<LeadRecord>;
}
