/** Tipos do pipeline (Sprint 8), espelhando `api/types/pipeline.ts`. */

import type { PipelineLeadStatus } from '@/types/students';

export interface LeadResponse {
  id: string;
  studentId: string;
  studentName: string;
  status: PipelineLeadStatus;
  value: number | null;
  lostReason: string | null;
  assignedTo: string;
  assignedToName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineListResponse {
  data: LeadResponse[];
  summary: Record<PipelineLeadStatus, { count: number; total: number }>;
}

export interface PipelineListParams {
  assignedTo?: string;
  from?: string;
  to?: string;
}

export interface CreateLeadRequest {
  studentId: string;
  status?: PipelineLeadStatus;
  value?: string | null;
  assignedTo?: string;
}

export interface UpdateLeadRequest {
  value?: string | null;
  lostReason?: string | null;
}
