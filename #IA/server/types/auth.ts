import type { AuditAction, User, UserRole } from '@prisma/client';

import type { CourseRepository, PurchaseRepository } from '@server/types/courses';
import type { DashboardRepository } from '@server/types/dashboard';
import type { Mailer } from '@server/types/email';
import type { PipelineLeadRepository } from '@server/types/pipeline';
import type { StudentRepository } from '@server/types/students';
import type { TaskRepository } from '@server/types/tasks';
import type { Permission } from '@server/utils/permissions';

/**
 * Usuário no formato que a API devolve (contrato de `/api/auth` e `/api/users`):
 * nunca `passwordHash` nem `tokenVersion` (RN-13).
 */
export type PublicUser = Omit<User, 'passwordHash' | 'tokenVersion'>;

/** Dados para criar um usuário. A senha já chega em hash bcrypt — texto puro nunca desce até aqui. */
export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  /** Padrão do schema: `true` (senha provisória, RN-04/RN-05). */
  mustChangePassword?: boolean;
  /** Padrão do schema: `true`. */
  isActive?: boolean;
}

/**
 * Campos alteráveis de um usuário. Tudo opcional: só o que vier é gravado.
 * `passwordHash` e `tokenVersion` são de uso interno (troca/redefinição de senha, RN-10).
 */
export interface UpdateUserData {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  mustChangePassword?: boolean;
  passwordHash?: string;
  tokenVersion?: number;
}

/**
 * Acesso a dados de usuários. O serviço depende desta interface, não do Prisma:
 * em produção entra a implementação Prisma; nos testes, a implementação em memória.
 *
 * O e-mail é normalizado (minúsculas, sem espaços nas bordas) dentro da implementação,
 * na escrita e na busca, porque o índice único do Postgres diferencia maiúsculas (RN-01).
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  list(): Promise<User[]>;
  /** Quantos admins ativos existem — base da RN-12 (último admin ativo). */
  countActiveAdmins(): Promise<number>;
}

/** Metadados livres de uma entrada de auditoria (coluna `Json?`). */
export type AuditMetadata = Record<string, unknown>;

/** Entrada a gravar na auditoria (RN-14). `createdAt` só é informado em teste, para fixar o tempo. */
export interface AuditLogEntry {
  action: AuditAction;
  actorId?: string | null;
  targetUserId?: string | null;
  email?: string | null;
  ip?: string | null;
  metadata?: AuditMetadata | null;
  createdAt?: Date;
}

/**
 * Acesso a dados da auditoria. Além de gravar, sustenta o bloqueio da RN-07:
 * falhas de login do e-mail na janela, contadas depois do último login bem-sucedido.
 */
export interface AuditLogRepository {
  record(entry: AuditLogEntry): Promise<void>;
  countFailedLoginsSince(email: string, since: Date): Promise<number>;
  findLastSuccessfulLoginAt(email: string): Promise<Date | null>;
}

/** Repositórios de que a autenticação precisa (login, sessão, gestão de usuários, seed). */
export interface AuthRepositories {
  users: UserRepository;
  auditLogs: AuditLogRepository;
}

/** Repositórios injetados no app (`createApp(deps)`) e nos serviços. */
export interface Repositories extends AuthRepositories {
  students: StudentRepository;
  courses: CourseRepository;
  purchases: PurchaseRepository;
  dashboard: DashboardRepository;
  pipelineLeads: PipelineLeadRepository;
  tasks: TaskRepository;
  /** Não é repositório, mas entra pela mesma injeção: nos testes, um fake que só guarda as mensagens. */
  mailer: Mailer;
}

/** Corpo de `POST /api/auth/login`. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Corpo de `PUT /api/auth/password`. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Resposta de `POST /api/auth/login`: a sessão vai no cookie, o corpo só traz o usuário (RN-08). */
export interface LoginResponse {
  user: PublicUser;
}

/** Resposta de `GET /api/auth/me`: usuário e permissões do papel (a matriz vive no backend). */
export interface MeResponse {
  user: PublicUser;
  permissions: Permission[];
}
