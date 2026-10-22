import { randomUUID } from 'node:crypto';

import {
  Prisma,
  type Course,
  type PipelineLead,
  type Purchase,
  type Student,
  type Task,
  type User,
} from '@prisma/client';

import type { Mailer, MailMessage } from '@server/types/email';
import type {
  DashboardRepository,
  DashboardScope,
  PurchaseRangeFilter,
  StudentCountFilter,
} from '@server/types/dashboard';
import type {
  CreateLeadData,
  LeadFilter,
  LeadRecord,
  PipelineLeadRepository,
  UpdateLeadData,
} from '@server/types/pipeline';
import type {
  CreateTaskData,
  TaskListQuery,
  TaskRecord,
  TaskRepository,
  UpdateTaskData,
} from '@server/types/tasks';

/** Mailer que só guarda as mensagens. `failFor` faz o envio para esses e-mails falhar. */
export class InMemoryMailer implements Mailer {
  readonly sent: MailMessage[] = [];
  readonly failFor = new Set<string>();

  async send(message: MailMessage): Promise<{ messageId: string }> {
    if (this.failFor.has(message.to)) {
      throw new Error(`SMTP recusou ${message.to}`);
    }
    this.sent.push(message);
    return { messageId: `msg-${this.sent.length}` };
  }
}

/** De onde os fakes leem as tabelas que não são deles (o "mesmo banco" dos outros fakes). */
export interface BusinessSources {
  students: () => Student[];
  users: () => User[];
  courses: () => Course[];
  purchases: () => Purchase[];
}

const emptySources: BusinessSources = {
  students: () => [],
  users: () => [],
  courses: () => [],
  purchases: () => [],
};

function notFound(modelName: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Record to update not found.', {
    code: 'P2025',
    clientVersion: 'in-memory',
    meta: { modelName },
  });
}

function inScope(assignedTo: string | null, scope: DashboardScope): boolean {
  return scope.assignedTo === undefined || assignedTo === scope.assignedTo;
}

/** Dashboard em memória, com as mesmas agregações do `dashboardModel`. */
export class InMemoryDashboardRepository implements DashboardRepository {
  constructor(private readonly sources: BusinessSources = emptySources) {}

  async countStudents({ assignedTo, createdFrom, createdTo, status }: StudentCountFilter) {
    return this.sources.students().filter(
      (student) =>
        inScope(student.assignedTo, { assignedTo }) &&
        (!status || student.status === status) &&
        (!createdFrom || student.createdAt >= createdFrom) &&
        (!createdTo || student.createdAt <= createdTo),
    ).length;
  }

  async sumRevenue(filter: PurchaseRangeFilter) {
    return this.purchases(filter)
      .reduce((sum, purchase) => sum.plus(purchase.amount), new Prisma.Decimal(0))
      .toFixed(2);
  }

  async studentsByCourse(scope: DashboardScope) {
    const counts = new Map<string, number>();
    for (const purchase of this.purchases(scope)) {
      counts.set(purchase.courseId, (counts.get(purchase.courseId) ?? 0) + 1);
    }
    const courses = this.sources.courses();

    return [...counts].map(([courseId, count]) => ({
      courseId,
      courseName: courses.find((course) => course.id === courseId)?.name ?? '',
      count,
    }));
  }

  async purchasesInRange(filter: PurchaseRangeFilter) {
    return this.purchases(filter).map((purchase) => ({
      purchaseDate: purchase.purchaseDate,
      amount: purchase.amount.toFixed(2),
    }));
  }

  private purchases({ assignedTo, from, to }: PurchaseRangeFilter): Purchase[] {
    const students = this.sources.students();

    return this.sources.purchases().filter((purchase) => {
      const owner = students.find((student) => student.id === purchase.studentId);
      return (
        inScope(owner?.assignedTo ?? null, { assignedTo }) &&
        (!from || purchase.purchaseDate >= from) &&
        (!to || purchase.purchaseDate <= to)
      );
    });
  }
}

/** Leads em memória, com escopo no `where` do `update` (`P2025` fora dele). */
export class InMemoryPipelineLeadRepository implements PipelineLeadRepository {
  readonly rows: PipelineLead[];

  constructor(
    seed: PipelineLead[] = [],
    private readonly sources: BusinessSources = emptySources,
  ) {
    this.rows = [...seed];
  }

  async list({ assignedTo, createdFrom, createdTo }: LeadFilter) {
    return this.rows
      .filter(
        (lead) =>
          inScope(lead.assignedTo, { assignedTo }) &&
          (!createdFrom || lead.createdAt >= createdFrom) &&
          (!createdTo || lead.createdAt <= createdTo),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id))
      .map((lead) => this.withNames(lead));
  }

  async findById(id: string, scope: Pick<LeadFilter, 'assignedTo'>) {
    const lead = this.rows.find((row) => row.id === id && inScope(row.assignedTo, scope));
    return lead ? this.withNames(lead) : null;
  }

  async create(data: CreateLeadData) {
    const now = new Date();
    const lead: PipelineLead = {
      id: randomUUID(),
      studentId: data.studentId,
      status: data.status,
      value: data.value === null ? null : new Prisma.Decimal(data.value),
      lostReason: null,
      assignedTo: data.assignedTo,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(lead);
    return this.withNames(lead);
  }

  async update(id: string, data: UpdateLeadData, scope: Pick<LeadFilter, 'assignedTo'>) {
    const index = this.rows.findIndex((row) => row.id === id && inScope(row.assignedTo, scope));
    const current = this.rows[index];
    if (!current) throw notFound('PipelineLead');

    const updated: PipelineLead = {
      ...current,
      ...(data.status === undefined ? {} : { status: data.status }),
      ...(data.lostReason === undefined ? {} : { lostReason: data.lostReason }),
      ...(data.assignedTo === undefined ? {} : { assignedTo: data.assignedTo }),
      ...(data.value === undefined
        ? {}
        : { value: data.value === null ? null : new Prisma.Decimal(data.value) }),
      updatedAt: new Date(),
    };
    this.rows[index] = updated;
    return this.withNames(updated);
  }

  private withNames(lead: PipelineLead): LeadRecord {
    const student = this.sources.students().find((row) => row.id === lead.studentId);
    const user = this.sources.users().find((row) => row.id === lead.assignedTo);
    return { ...lead, student: { name: student?.name ?? '' }, user: { name: user?.name ?? '' } };
  }
}

/** Tarefas em memória, sempre filtradas pelo dono. */
export class InMemoryTaskRepository implements TaskRepository {
  readonly rows: Task[];

  constructor(
    seed: Task[] = [],
    private readonly sources: BusinessSources = emptySources,
  ) {
    this.rows = [...seed];
  }

  async listByUser(userId: string, { completed, priority }: TaskListQuery) {
    return this.rows
      .filter(
        (task) =>
          task.assignedTo === userId &&
          (!priority || task.priority === priority) &&
          (completed === undefined || (task.completedAt !== null) === completed),
      )
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime() || a.id.localeCompare(b.id))
      .map((task) => this.withStudent(task));
  }

  async create({ relatedTo, ...data }: CreateTaskData) {
    const now = new Date();
    const task: Task = {
      id: randomUUID(),
      ...data,
      relatedTo,
      relatedType: relatedTo ? 'student' : null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(task);
    return this.withStudent(task);
  }

  async update(id: string, userId: string, data: UpdateTaskData) {
    const index = this.rows.findIndex((row) => row.id === id && row.assignedTo === userId);
    const current = this.rows[index];
    if (!current) throw notFound('Task');

    const changes = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as UpdateTaskData;
    const updated: Task = {
      ...current,
      ...changes,
      ...(data.relatedTo === undefined ? {} : { relatedType: data.relatedTo ? 'student' : null }),
      updatedAt: new Date(),
    };
    this.rows[index] = updated;
    return this.withStudent(updated);
  }

  async delete(id: string, userId: string) {
    const index = this.rows.findIndex((row) => row.id === id && row.assignedTo === userId);
    if (index === -1) throw notFound('Task');
    this.rows.splice(index, 1);
  }

  private withStudent(task: Task): TaskRecord {
    const student = task.relatedTo
      ? this.sources.students().find((row) => row.id === task.relatedTo)
      : undefined;
    return { ...task, relatedStudent: student ? { name: student.name } : null };
  }
}
