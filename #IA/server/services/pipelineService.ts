import { LeadStatus } from '@prisma/client';

import type { PublicUser, Repositories } from '@server/types/auth';
import type {
  CreateLeadRequest,
  LeadRecord,
  LeadResponse,
  PipelineListQuery,
  PipelineListResponse,
  PipelineSummary,
  UpdateLeadData,
  UpdateLeadRequest,
  UpdateLeadStatusRequest,
} from '@server/types/pipeline';
import { businessDayBounds } from '@server/utils/dates';
import { HttpError } from '@server/utils/httpError';
import { hasPermission } from '@server/utils/permissions';
import { isRecordNotFound } from '@server/utils/prismaErrors';

export interface PipelineService {
  listLeads(query: PipelineListQuery, actor: PublicUser): Promise<PipelineListResponse>;
  createLead(input: CreateLeadRequest, actor: PublicUser): Promise<LeadResponse>;
  updateLead(id: string, input: UpdateLeadRequest, actor: PublicUser): Promise<LeadResponse>;
  updateStatus(id: string, input: UpdateLeadStatusRequest, actor: PublicUser): Promise<LeadResponse>;
}

export function toLeadResponse(lead: LeadRecord): LeadResponse {
  return {
    id: lead.id,
    studentId: lead.studentId,
    studentName: lead.student.name,
    status: lead.status,
    value: lead.value === null ? null : lead.value.toNumber(),
    lostReason: lead.lostReason,
    assignedTo: lead.assignedTo,
    assignedToName: lead.user.name,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

/** Totais por coluna do Kanban, com as quatro colunas sempre presentes. */
export function summarize(leads: LeadResponse[]): PipelineSummary {
  const summary = Object.fromEntries(
    Object.values(LeadStatus).map((status) => [status, { count: 0, total: 0 }]),
  ) as PipelineSummary;

  for (const lead of leads) {
    summary[lead.status].count += 1;
    summary[lead.status].total = Math.round((summary[lead.status].total + (lead.value ?? 0)) * 100) / 100;
  }

  return summary;
}

const leadNotFound = () => HttpError.notFound('Oportunidade não encontrada');

/**
 * Pipeline de vendas (TASK-021). RBAC na query: vendedor só lê e altera os próprios leads e só
 * cria lead para os próprios alunos; admin e CEO veem tudo e podem atribuir a outro usuário.
 * Lead "vendido" **não** gera compra: a compra é registrada à parte (decisão S8-1).
 */
export function createPipelineService({
  pipelineLeads,
  students,
  users,
}: Pick<Repositories, 'pipelineLeads' | 'students' | 'users'>): PipelineService {
  const canViewAll = (actor: PublicUser) => hasPermission(actor.role, 'data:view-all');
  const scopeOf = (actor: PublicUser) => (canViewAll(actor) ? {} : { assignedTo: actor.id });

  async function assertAssignable(userId: string): Promise<void> {
    const user = await users.findById(userId);

    if (!user) {
      throw HttpError.validation('Dados inválidos', { assignedTo: 'Responsável não encontrado' });
    }
    if (!user.isActive) {
      throw HttpError.validation('Dados inválidos', { assignedTo: 'Responsável desativado' });
    }
  }

  async function writeGuarded(write: () => Promise<LeadRecord>): Promise<LeadResponse> {
    try {
      return toLeadResponse(await write());
    } catch (error) {
      if (isRecordNotFound(error)) {
        throw leadNotFound();
      }
      throw error;
    }
  }

  return {
    async listLeads(query, actor) {
      const leads = await pipelineLeads.list({
        assignedTo: canViewAll(actor) ? query.assignedTo : actor.id,
        createdFrom: query.from ? businessDayBounds(query.from).start : undefined,
        createdTo: query.to ? businessDayBounds(query.to).end : undefined,
      });
      const data = leads.map(toLeadResponse);

      return { data, summary: summarize(data) };
    },

    async createLead(input, actor) {
      // Vendedor só abre oportunidade para aluno da própria carteira (404 fora, como no detalhe).
      const student = await students.findById(input.studentId, scopeOf(actor));
      if (!student) {
        throw HttpError.notFound('Aluno não encontrado');
      }

      const assignedTo = canViewAll(actor) && input.assignedTo ? input.assignedTo : actor.id;
      if (assignedTo !== actor.id) {
        await assertAssignable(assignedTo);
      }

      return toLeadResponse(
        await pipelineLeads.create({
          studentId: student.id,
          status: input.status ?? LeadStatus.prospecting,
          value: input.value ?? null,
          assignedTo,
        }),
      );
    },

    async updateLead(id, input, actor) {
      const changes: UpdateLeadData = { value: input.value, lostReason: input.lostReason };

      if (canViewAll(actor) && input.assignedTo) {
        await assertAssignable(input.assignedTo);
        changes.assignedTo = input.assignedTo;
      }

      return writeGuarded(() => pipelineLeads.update(id, changes, scopeOf(actor)));
    },

    async updateStatus(id, { status, lostReason }, actor) {
      // Motivo de perda só faz sentido em `lost`; sair de `lost` limpa o motivo.
      const changes: UpdateLeadData = {
        status,
        lostReason: status === LeadStatus.lost ? (lostReason ?? null) : null,
      };

      return writeGuarded(() => pipelineLeads.update(id, changes, scopeOf(actor)));
    },
  };
}
