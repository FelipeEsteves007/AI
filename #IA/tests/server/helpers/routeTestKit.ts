import {
  UserRole,
  type Course,
  type PipelineLead,
  type Purchase,
  type Student,
  type Task,
  type User,
} from '@prisma/client';

import { createApp } from '@server/app';
import type { Repositories } from '@server/types/auth';
import { SESSION_COOKIE_NAME } from '@server/utils/jwt';
import { hashPassword } from '@server/utils/password';

import {
  InMemoryAuditLogRepository,
  InMemoryCatalog,
  InMemoryStudentRepository,
  InMemoryUserRepository,
} from '../fakes/inMemoryRepositories';
import {
  InMemoryDashboardRepository,
  InMemoryMailer,
  InMemoryPipelineLeadRepository,
  InMemoryTaskRepository,
  type BusinessSources,
} from '../fakes/inMemoryBusiness';
import { startTestServer, type TestServer } from './expressTestApp';
import { makeUser } from './userFixture';

export const TEST_SECRET = 'segredo-de-teste-suficientemente-longo-32+';
const SENHA = 'SenhaAtual1';

export interface TestUsers {
  admin: User;
  ceo: User;
  ana: User;
  bruno: User;
}

/** Admin, CEO e dois vendedores com a mesma senha de teste. */
export async function makeTestUsers(): Promise<TestUsers> {
  const passwordHash = await hashPassword(SENHA);

  return {
    admin: makeUser({ name: 'Admin', email: 'admin@exemplo.com', passwordHash, role: UserRole.admin }),
    ceo: makeUser({ name: 'CEO', email: 'ceo@exemplo.com', passwordHash, role: UserRole.ceo }),
    ana: makeUser({ name: 'Ana', email: 'ana@exemplo.com', passwordHash, role: UserRole.vendedor }),
    bruno: makeUser({
      name: 'Bruno',
      email: 'bruno@exemplo.com',
      passwordHash,
      role: UserRole.vendedor,
    }),
  };
}

export interface RunningApp {
  catalog: InMemoryCatalog;
  auditLogs: InMemoryAuditLogRepository;
  students: InMemoryStudentRepository;
  leads: InMemoryPipelineLeadRepository;
  tasks: InMemoryTaskRepository;
  mailer: InMemoryMailer;
  request(method: string, path: string, cookie?: string, body?: unknown): Promise<Response>;
  /** POST com corpo de texto puro (ex.: CSV). */
  postText(path: string, cookie: string, text: string, contentType?: string): Promise<Response>;
  login(email: string): Promise<string>;
  close(): Promise<void>;
}

/** Sobe `createApp` com fakes em memória que enxergam as mesmas tabelas. */
export async function startRouteApp(seed: {
  users: User[];
  students?: Student[];
  courses?: Course[];
  purchases?: Purchase[];
  leads?: PipelineLead[];
  tasks?: Task[];
}): Promise<RunningApp> {
  const auditLogs = new InMemoryAuditLogRepository();
  const catalog = new InMemoryCatalog({ courses: seed.courses, purchases: seed.purchases });
  const students = new InMemoryStudentRepository(
    {
      students: seed.students ?? [],
      users: seed.users,
      courses: seed.courses ?? [],
      purchases: seed.purchases ?? [],
    },
    auditLogs,
  );
  const sources: BusinessSources = {
    students: () => students.snapshot().students,
    users: () => seed.users,
    courses: () => catalog.snapshot().courses,
    purchases: () => catalog.snapshot().purchases,
  };
  const leads = new InMemoryPipelineLeadRepository(seed.leads, sources);
  const tasks = new InMemoryTaskRepository(seed.tasks, sources);
  const mailer = new InMemoryMailer();
  const repositories: Repositories = {
    users: new InMemoryUserRepository(seed.users),
    auditLogs,
    students,
    courses: catalog.courses,
    purchases: catalog.purchases,
    dashboard: new InMemoryDashboardRepository(sources),
    pipelineLeads: leads,
    tasks,
    mailer,
  };
  const server: TestServer = await startTestServer(createApp(repositories));

  const request = (method: string, path: string, cookie?: string, body?: unknown) =>
    fetch(`${server.baseUrl}${path}`, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  return {
    catalog,
    auditLogs,
    students,
    leads,
    tasks,
    mailer,
    request,
    postText: (path, cookie, text, contentType = 'text/csv') =>
      fetch(`${server.baseUrl}${path}`, {
        method: 'POST',
        headers: { cookie, 'content-type': contentType },
        body: text,
      }),
    async login(email) {
      const response = await request('POST', '/api/auth/login', undefined, {
        email,
        password: SENHA,
      });
      const cookie = response.headers
        .getSetCookie()
        .find((value) => value.startsWith(`${SESSION_COOKIE_NAME}=`));

      if (!cookie) {
        throw new Error(`Login falhou para ${email}: ${response.status}`);
      }

      return cookie.split(';')[0] as string;
    },
    close: () => server.close(),
  };
}
