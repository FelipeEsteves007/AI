import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';

import { errorHandler } from './middleware/errorHandler';
import { auditLogModel } from './models/auditLogModel';
import { courseModel } from './models/courseModel';
import { dashboardModel } from './models/dashboardModel';
import { pipelineLeadModel } from './models/pipelineLeadModel';
import { purchaseModel } from './models/purchaseModel';
import { studentModel } from './models/studentModel';
import { taskModel } from './models/taskModel';
import { userModel } from './models/userModel';
import { createAuthRouter } from './routes/auth';
import { createCoursesRouter } from './routes/courses';
import { healthRouter } from './routes/health';
import { createDashboardRouter } from './routes/dashboard';
import { createEmailRouter } from './routes/email';
import { createPipelineRouter } from './routes/pipeline';
import { createReportsRouter } from './routes/reports';
import { createStudentsRouter } from './routes/students';
import { createTasksRouter } from './routes/tasks';
import { createUsersRouter } from './routes/users';
import type { Repositories } from './types/auth';
import { createMailerFromEnv } from './utils/mailer';

/** Repositórios sobre o Prisma: o padrão em produção. Nos testes entram os fakes em memória. */
export const prismaRepositories: Repositories = {
  users: userModel,
  auditLogs: auditLogModel,
  students: studentModel,
  courses: courseModel,
  purchases: purchaseModel,
  dashboard: dashboardModel,
  pipelineLeads: pipelineLeadModel,
  tasks: taskModel,
  mailer: createMailerFromEnv(),
};

/**
 * Monta o app Express. Os repositórios entram por injeção para que os testes
 * rodem sem banco; o padrão é o Prisma.
 *
 * `GET /health` continua público, e o `errorHandler` é sempre o último middleware.
 */
export function createApp(repositories: Repositories = prismaRepositories): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(cookieParser());

  app.use('/health', healthRouter);
  app.use('/api/auth', createAuthRouter(repositories));
  app.use('/api/users', createUsersRouter(repositories));
  app.use('/api/students', createStudentsRouter(repositories));
  app.use('/api/courses', createCoursesRouter(repositories));
  app.use('/api/dashboard', createDashboardRouter(repositories));
  app.use('/api/pipeline', createPipelineRouter(repositories));
  app.use('/api/tasks', createTasksRouter(repositories));
  app.use('/api/email', createEmailRouter(repositories));
  app.use('/api/reports', createReportsRouter(repositories));

  app.use(errorHandler);

  return app;
}
