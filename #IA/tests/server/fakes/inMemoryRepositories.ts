import { randomUUID } from 'node:crypto';

import {
  AuditAction,
  Prisma,
  StudentStatus,
  UserRole,
  type Course,
  type PipelineLead,
  type Purchase,
  type Student,
  type Task,
  type User,
} from '@prisma/client';

import type {
  AuditLogEntry,
  AuditLogRepository,
  Repositories,
  CreateUserData,
  UpdateUserData,
  UserRepository,
} from '@server/types/auth';
import type {
  CourseListParams,
  CoursePage,
  CourseRepository,
  CreateCourseData,
  CreatePurchaseData,
  PurchaseRecord,
  PurchaseRepository,
  UpdateCourseData,
} from '@server/types/courses';
import type {
  CreateStudentData,
  StudentDeletionAuditBuilder,
  StudentDeletionSnapshot,
  StudentDetailRecord,
  StudentExportRecord,
  StudentFilter,
  StudentListParams,
  StudentPage,
  StudentRecord,
  StudentRepository,
  StudentScope,
  UpdateStudentData,
} from '@server/types/students';
import { normalizeEmail } from '@server/utils/userMapper';

import {
  InMemoryDashboardRepository,
  InMemoryMailer,
  InMemoryPipelineLeadRepository,
  InMemoryTaskRepository,
} from './inMemoryBusiness';

/** Entrada de auditoria já gravada, com os campos que o banco preencheria. */
export type RecordedAuditEntry = Required<Pick<AuditLogEntry, 'action' | 'createdAt'>> &
  Omit<AuditLogEntry, 'action' | 'createdAt'> & { id: string };

/**
 * Repositório de usuários em memória, com o mesmo comportamento observável do Prisma:
 * e-mail normalizado na escrita e na busca (RN-01) e os padrões do schema na criação.
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  constructor(seed: User[] = []) {
    seed.forEach((user) => this.users.set(user.id, { ...user, email: normalizeEmail(user.email) }));
  }

  async findById(id: string): Promise<User | null> {
    return this.clone(this.users.get(id));
  }

  async findByEmail(email: string): Promise<User | null> {
    const target = normalizeEmail(email);

    return this.clone([...this.users.values()].find((user) => user.email === target));
  }

  async create(data: CreateUserData): Promise<User> {
    const now = new Date();
    const user: User = {
      id: randomUUID(),
      name: data.name,
      email: normalizeEmail(data.email),
      passwordHash: data.passwordHash,
      role: data.role,
      isActive: data.isActive ?? true,
      mustChangePassword: data.mustChangePassword ?? true,
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.id, user);

    return { ...user };
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const current = this.users.get(id);

    if (!current) {
      throw new Error(`Usuário não encontrado: ${id}`);
    }

    const updated: User = {
      ...current,
      ...stripUndefined(data),
      updatedAt: new Date(),
    };

    this.users.set(id, updated);

    return { ...updated };
  }

  async list(): Promise<User[]> {
    return [...this.users.values()]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((user) => ({ ...user }));
  }

  async countActiveAdmins(): Promise<number> {
    return [...this.users.values()].filter((user) => user.role === UserRole.admin && user.isActive)
      .length;
  }

  private clone(user: User | undefined): User | null {
    return user ? { ...user } : null;
  }
}

/** Repositório de auditoria em memória (RN-07 e RN-14). As entradas ficam expostas para asserção. */
export class InMemoryAuditLogRepository implements AuditLogRepository {
  readonly entries: RecordedAuditEntry[] = [];

  async record(entry: AuditLogEntry): Promise<void> {
    this.entries.push({
      ...entry,
      id: randomUUID(),
      email: entry.email ? normalizeEmail(entry.email) : entry.email,
      createdAt: entry.createdAt ?? new Date(),
    });
  }

  async countFailedLoginsSince(email: string, since: Date): Promise<number> {
    return this.byEmail(email, AuditAction.LOGIN_FAILURE).filter(
      (entry) => entry.createdAt.getTime() > since.getTime(),
    ).length;
  }

  async findLastSuccessfulLoginAt(email: string): Promise<Date | null> {
    const times = this.byEmail(email, AuditAction.LOGIN_SUCCESS).map((entry) =>
      entry.createdAt.getTime(),
    );

    return times.length > 0 ? new Date(Math.max(...times)) : null;
  }

  private byEmail(email: string, action: AuditAction): RecordedAuditEntry[] {
    const target = normalizeEmail(email);

    return this.entries.filter((entry) => entry.email === target && entry.action === action);
  }
}

/** Dados iniciais do fake de alunos: as tabelas de que a listagem e o detalhe dependem. */
export interface InMemoryStudentSeed {
  students: Student[];
  /** Para resolver `assignedToUser.name`, como o `include` do Prisma. */
  users: User[];
  courses: Course[];
  purchases: Purchase[];
  pipelineLeads: PipelineLead[];
  tasks: Task[];
}

/** Postgres ordena enum pela ordem de declaração no schema, não alfabeticamente. */
const STUDENT_STATUS_ORDER: readonly StudentStatus[] = [
  StudentStatus.ativo,
  StudentStatus.inativo,
  StudentStatus.pausado,
];

/**
 * Repositório de alunos em memória, com o comportamento observável do `studentModel`:
 * mesmo `where` para página e total, busca `contains` sem diferenciar maiúsculas em nome OU
 * e-mail, ordenação com `id` como desempate, `skip`/`take`, e o detalhe devolvendo `null`
 * fora do escopo. Diferença conhecida: `name` é comparado com `localeCompare`, enquanto o
 * Postgres usa a collation do banco.
 */
export class InMemoryStudentRepository implements StudentRepository {
  private readonly seed: InMemoryStudentSeed;

  /**
   * Onde o `delete` grava a auditoria — o "mesmo banco" do fake. Nas rotas, passar o mesmo
   * repositório injetado em `Repositories.auditLogs`.
   */
  readonly auditLogs: AuditLogRepository;

  constructor(
    seed: Partial<InMemoryStudentSeed> = {},
    auditLogs: AuditLogRepository = new InMemoryAuditLogRepository(),
  ) {
    this.auditLogs = auditLogs;
    this.seed = {
      students: [...(seed.students ?? [])],
      users: [...(seed.users ?? [])],
      courses: [...(seed.courses ?? [])],
      purchases: [...(seed.purchases ?? [])],
      pipelineLeads: [...(seed.pipelineLeads ?? [])],
      tasks: [...(seed.tasks ?? [])],
    };
  }

  async list({ filter, sortBy, order, skip, take }: StudentListParams): Promise<StudentPage> {
    const direction = order === 'asc' ? 1 : -1;
    const matching = this.seed.students.filter((student) => matchesFilter(student, filter));
    const sorted = [...matching].sort(
      (a, b) => direction * compareBy(a, b, sortBy) || a.id.localeCompare(b.id),
    );

    return {
      rows: sorted.slice(skip, skip + take).map((student) => this.withAssignee(student)),
      total: matching.length,
    };
  }

  async findDetail(
    id: string,
    scope: Pick<StudentFilter, 'assignedTo'>,
  ): Promise<StudentDetailRecord | null> {
    const student = this.seed.students.find(
      (candidate) => candidate.id === id && matchesFilter(candidate, scope),
    );

    if (!student) {
      return null;
    }

    return {
      ...this.withAssignee(student),
      purchases: this.seed.purchases
        .filter((purchase) => purchase.studentId === id)
        .sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime())
        .map((purchase) => {
          const course = this.seed.courses.find((candidate) => candidate.id === purchase.courseId);

          if (!course) {
            throw new Error(`Curso não encontrado: ${purchase.courseId}`);
          }

          return { ...purchase, course: { id: course.id, name: course.name } };
        }),
      pipelineLeads: this.seed.pipelineLeads
        .filter((lead) => lead.studentId === id && ownedBy(lead.assignedTo, scope))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((lead) => ({ ...lead })),
      tasks: this.seed.tasks
        .filter((task) => task.relatedTo === id && ownedBy(task.assignedTo, scope))
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .map((task) => ({ ...task })),
    };
  }

  async findById(
    id: string,
    scope: Pick<StudentFilter, 'assignedTo'>,
  ): Promise<StudentRecord | null> {
    const student = this.seed.students.find(
      (candidate) => candidate.id === id && matchesFilter(candidate, scope),
    );

    return student ? this.withAssignee(student) : null;
  }

  async findByEmail(email: string): Promise<Student | null> {
    const target = normalizeEmail(email);
    const student = this.seed.students.find((candidate) => candidate.email === target);

    return student ? { ...student } : null;
  }

  async findByCpf(cpf: string): Promise<Student | null> {
    const student = this.seed.students.find((candidate) => candidate.cpf === cpf);

    return student ? { ...student } : null;
  }

  async create(data: CreateStudentData): Promise<StudentRecord> {
    const now = new Date();
    const student: Student = {
      id: randomUUID(),
      ...data,
      email: normalizeEmail(data.email),
      lastContactDate: null,
      createdAt: now,
      updatedAt: now,
    };

    this.assertUnique(student);
    this.seed.students.push(student);

    return this.withAssignee(student);
  }

  async update(id: string, data: UpdateStudentData, scope: StudentScope): Promise<StudentRecord> {
    const index = this.seed.students.findIndex(
      (candidate) => candidate.id === id && matchesFilter(candidate, scope),
    );
    const current = this.seed.students[index];

    // S6-11: inexistente ou fora do escopo, como o `where` do Prisma.
    if (!current) {
      throw recordNotFound('update');
    }

    const changes = stripUndefined(data);
    const updated: Student = {
      ...current,
      ...changes,
      email: changes.email === undefined ? current.email : normalizeEmail(changes.email),
      // `@updatedAt`: sempre depois do valor anterior, mesmo no mesmo milissegundo.
      updatedAt: new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1)),
    };

    this.assertUnique(updated);
    this.seed.students[index] = updated;

    return this.withAssignee(updated);
  }

  /**
   * Reproduz o `onDelete: Cascade` de `Purchase.student`, `PipelineLead.student` e
   * `Task.relatedStudent`: é o banco quem apaga os filhos, não o serviço.
   */
  async delete(id: string, audit: StudentDeletionAuditBuilder): Promise<StudentDeletionSnapshot> {
    const student = this.seed.students.find((candidate) => candidate.id === id);

    if (!student) {
      throw recordNotFound('delete');
    }

    const snapshot: StudentDeletionSnapshot = {
      id: student.id,
      name: student.name,
      email: student.email,
      cascade: {
        purchases: this.seed.purchases.filter((purchase) => purchase.studentId === id).length,
        pipelineLeads: this.seed.pipelineLeads.filter((lead) => lead.studentId === id).length,
        tasks: this.seed.tasks.filter((task) => task.relatedTo === id).length,
      },
    };

    // Transação simulada: a auditoria vai antes de mexer nas tabelas; se falhar, nada muda
    // (no Prisma a ordem é DELETE → INSERT, e o rollback dá o mesmo resultado observável).
    await this.auditLogs.record(audit(snapshot));

    this.seed.students = this.seed.students.filter((student) => student.id !== id);
    this.seed.purchases = this.seed.purchases.filter((purchase) => purchase.studentId !== id);
    this.seed.pipelineLeads = this.seed.pipelineLeads.filter((lead) => lead.studentId !== id);
    this.seed.tasks = this.seed.tasks.filter((task) => task.relatedTo !== id);

    return snapshot;
  }

  async findExistingKeys(
    emails: string[],
    cpfs: string[],
  ): Promise<{ emails: string[]; cpfs: string[] }> {
    const emailSet = new Set(emails.map(normalizeEmail));
    const cpfSet = new Set(cpfs);

    return {
      emails: this.seed.students.filter((s) => emailSet.has(s.email)).map((s) => s.email),
      cpfs: this.seed.students.flatMap((s) => (s.cpf !== null && cpfSet.has(s.cpf) ? [s.cpf] : [])),
    };
  }

  async listForExport(filter: StudentFilter): Promise<StudentExportRecord[]> {
    return this.seed.students
      .filter((student) => matchesFilter(student, filter))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
      .map((student) => ({
        ...this.withAssignee(student),
        purchases: this.seed.purchases
          .filter((purchase) => purchase.studentId === student.id)
          .sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime())
          .map((purchase) => ({
            course: {
              name: this.seed.courses.find((course) => course.id === purchase.courseId)?.name ?? '',
            },
          })),
      }));
  }

  /** Como o `createMany({ skipDuplicates: true })`: quem colidir no índice único fica de fora. */
  async createMany(data: CreateStudentData[]): Promise<number> {
    let count = 0;

    for (const item of data) {
      try {
        await this.create(item);
        count += 1;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
          throw error;
        }
      }
    }

    return count;
  }

  /** Cópia das tabelas, para os testes conferirem a cascata. */
  snapshot(): InMemoryStudentSeed {
    return {
      students: this.seed.students.map((student) => ({ ...student })),
      users: this.seed.users.map((user) => ({ ...user })),
      courses: this.seed.courses.map((course) => ({ ...course })),
      purchases: this.seed.purchases.map((purchase) => ({ ...purchase })),
      pipelineLeads: this.seed.pipelineLeads.map((lead) => ({ ...lead })),
      tasks: this.seed.tasks.map((task) => ({ ...task })),
    };
  }

  /** Índices únicos de `email` e `cpf`: recusa como o Postgres, com o `P2002` do Prisma. */
  private assertUnique(student: Student): void {
    const others = this.seed.students.filter((candidate) => candidate.id !== student.id);

    if (others.some((other) => other.email === student.email)) {
      throw uniqueViolation('email');
    }

    if (student.cpf !== null && others.some((other) => other.cpf === student.cpf)) {
      throw uniqueViolation('cpf');
    }
  }

  private withAssignee(student: Student): StudentRecord {
    const user = this.seed.users.find((candidate) => candidate.id === student.assignedTo);

    return { ...student, assignedToUser: user ? { name: user.name } : null };
  }
}

/**
 * Cursos e compras em memória, sobre as mesmas tabelas — é o que permite reproduzir a FK sem
 * cascata de `Purchase.course` (excluir curso com compras → `P2003`) e o índice único
 * `(studentId, courseId)` (→ `P2002`).
 */
export class InMemoryCatalog {
  readonly courses: CourseRepository;
  readonly purchases: PurchaseRepository;

  private readonly courseRows: Course[];
  private readonly purchaseRows: Purchase[];

  constructor(seed: { courses?: Course[]; purchases?: Purchase[] } = {}) {
    this.courseRows = [...(seed.courses ?? [])];
    this.purchaseRows = [...(seed.purchases ?? [])];

    const courseRows = this.courseRows;
    const purchaseRows = this.purchaseRows;

    const withCourseName = (purchase: Purchase): PurchaseRecord => {
      const course = courseRows.find((candidate) => candidate.id === purchase.courseId);

      return { ...purchase, course: { name: course?.name ?? '' } };
    };

    this.courses = {
      async list({ isActive, skip, take }: CourseListParams): Promise<CoursePage> {
        const matching = courseRows
          .filter((course) => isActive === undefined || course.isActive === isActive)
          .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

        return {
          rows: matching.slice(skip, skip + take).map((course) => ({ ...course })),
          total: matching.length,
        };
      },

      async findById(id) {
        const course = courseRows.find((candidate) => candidate.id === id);

        return course ? { ...course } : null;
      },

      async create(data: CreateCourseData) {
        const now = new Date();
        const course: Course = {
          id: randomUUID(),
          ...data,
          price: new Prisma.Decimal(data.price),
          createdAt: now,
          updatedAt: now,
        };

        courseRows.push(course);

        return { ...course };
      },

      async update(id, data: UpdateCourseData) {
        const index = courseRows.findIndex((candidate) => candidate.id === id);
        const current = courseRows[index];

        if (!current) {
          throw recordNotFound('update', 'Course');
        }

        const { price, ...rest } = stripUndefined(data);
        const updated: Course = {
          ...current,
          ...rest,
          ...(price === undefined ? {} : { price: new Prisma.Decimal(price) }),
          updatedAt: new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1)),
        };

        courseRows[index] = updated;

        return { ...updated };
      },

      async delete(id) {
        const index = courseRows.findIndex((candidate) => candidate.id === id);

        if (index === -1) {
          throw recordNotFound('delete', 'Course');
        }

        if (purchaseRows.some((purchase) => purchase.courseId === id)) {
          throw foreignKeyViolation('Purchases_courseId_fkey');
        }

        courseRows.splice(index, 1);
      },
    };

    this.purchases = {
      async listByStudent(studentId) {
        return purchaseRows
          .filter((purchase) => purchase.studentId === studentId)
          .sort(
            (a, b) =>
              b.purchaseDate.getTime() - a.purchaseDate.getTime() ||
              b.createdAt.getTime() - a.createdAt.getTime(),
          )
          .map(withCourseName);
      },

      async create(data: CreatePurchaseData) {
        if (
          purchaseRows.some(
            (purchase) =>
              purchase.studentId === data.studentId && purchase.courseId === data.courseId,
          )
        ) {
          throw uniqueViolation('studentId', 'courseId');
        }

        const now = new Date();
        const purchase: Purchase = {
          id: randomUUID(),
          studentId: data.studentId,
          courseId: data.courseId,
          purchaseDate: new Date(`${data.purchaseDate}T00:00:00.000Z`),
          amount: new Prisma.Decimal(data.amount),
          notes: data.notes,
          createdAt: now,
          updatedAt: now,
        };

        purchaseRows.push(purchase);

        return withCourseName(purchase);
      },

      async countByCourse(courseId) {
        return purchaseRows.filter((purchase) => purchase.courseId === courseId).length;
      },
    };
  }

  /** Cópia das tabelas, para asserção. */
  snapshot(): { courses: Course[]; purchases: Purchase[] } {
    return {
      courses: this.courseRows.map((course) => ({ ...course })),
      purchases: this.purchaseRows.map((purchase) => ({ ...purchase })),
    };
  }
}

/**
 * Os repositórios além de usuários, auditoria e alunos — cursos, compras, dashboard, leads e
 * tarefas —, vazios (ou com cursos/compras), para espalhar num `Repositories` de teste.
 */
export function catalogRepositories(seed: { courses?: Course[]; purchases?: Purchase[] } = {}): Pick<
  Repositories,
  'courses' | 'purchases' | 'dashboard' | 'pipelineLeads' | 'tasks' | 'mailer'
> {
  const catalog = new InMemoryCatalog(seed);

  return {
    courses: catalog.courses,
    purchases: catalog.purchases,
    dashboard: new InMemoryDashboardRepository(),
    pipelineLeads: new InMemoryPipelineLeadRepository(),
    tasks: new InMemoryTaskRepository(),
    mailer: new InMemoryMailer(),
  };
}

function matchesFilter(student: Student, { status, search, assignedTo }: StudentFilter): boolean {
  if (status !== undefined && student.status !== status) {
    return false;
  }

  if (assignedTo !== undefined && student.assignedTo !== assignedTo) {
    return false;
  }

  if (search !== undefined) {
    const term = search.toLowerCase();

    return student.name.toLowerCase().includes(term) || student.email.toLowerCase().includes(term);
  }

  return true;
}

/** S6-9: com escopo, leads e tarefas do detalhe só do próprio responsável, como o `studentModel`. */
function ownedBy(
  assignedTo: string,
  { assignedTo: scoped }: Pick<StudentFilter, 'assignedTo'>,
): boolean {
  return scoped === undefined || assignedTo === scoped;
}

function compareBy(a: Student, b: Student, sortBy: StudentListParams['sortBy']): number {
  switch (sortBy) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'status':
      return STUDENT_STATUS_ORDER.indexOf(a.status) - STUDENT_STATUS_ORDER.indexOf(b.status);
    case 'createdAt':
      return a.createdAt.getTime() - b.createdAt.getTime();
  }
}

/** Ignora as chaves com `undefined`, como o Prisma faz no `update`. */
function stripUndefined<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function uniqueViolation(...fields: string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    `Unique constraint failed on the fields: (${fields.map((field) => `\`${field}\``).join(',')})`,
    { code: 'P2002', clientVersion: 'in-memory', meta: { target: fields } },
  );
}

/** Violação de chave estrangeira, como o Prisma lança (`P2003`). */
function foreignKeyViolation(constraint: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(`Foreign key constraint violated: ${constraint}`, {
    code: 'P2003',
    clientVersion: 'in-memory',
    meta: { field_name: constraint },
  });
}

/** "Registro não encontrado" como o Prisma lança no `update`/`delete` sem casar o `where`. */
function recordNotFound(
  operation: 'update' | 'delete',
  modelName = 'Student',
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(`Record to ${operation} not found.`, {
    code: 'P2025',
    clientVersion: 'in-memory',
    meta: { modelName, cause: `Record to ${operation} not found.` },
  });
}
