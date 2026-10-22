/**
 * Chamadas de `/api/users` (TASK-215). Só o admin passa pelo RBAC do backend; se a
 * sessão não tiver `users:manage`, a API responde 403 e o `apiClient` lança `ApiError`.
 */

import { apiClient } from '@/services/apiClient';
import type { AuthUser, UserRole } from '@/types/auth';

export interface CreateUserRequest {
  name: string;
  email: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

/** Resposta da criação e da redefinição: a senha em texto puro vem uma única vez (RN-04). */
export interface TemporaryPasswordResponse {
  user: AuthUser;
  temporaryPassword: string;
}

interface ListUsersResponse {
  users: AuthUser[];
}

interface UserResponse {
  user: AuthUser;
}

/** `GET /api/users` — todos os usuários, ativos e inativos (RN-11: ninguém é excluído). */
export async function listUsers(): Promise<AuthUser[]> {
  const response = await apiClient<ListUsersResponse>('/api/users');
  return response?.users ?? [];
}

/** `POST /api/users` — 201 com o usuário e a senha provisória. 409 `EMAIL_IN_USE` se o e-mail repete. */
export async function createUser(payload: CreateUserRequest): Promise<TemporaryPasswordResponse> {
  const response = await apiClient<TemporaryPasswordResponse>('/api/users', {
    method: 'POST',
    body: payload,
  });
  return response as TemporaryPasswordResponse;
}

/** `PUT /api/users/{id}` — nome, papel e situação. 409 `LAST_ADMIN` protege o último admin (RN-12). */
export async function updateUser(id: string, payload: UpdateUserRequest): Promise<AuthUser> {
  const response = await apiClient<UserResponse>(`/api/users/${id}`, {
    method: 'PUT',
    body: payload,
  });
  return (response as UserResponse).user;
}

/** `POST /api/users/{id}/password-reset` — nova senha provisória, exibida uma única vez (RN-04). */
export async function resetPassword(id: string): Promise<TemporaryPasswordResponse> {
  const response = await apiClient<TemporaryPasswordResponse>(`/api/users/${id}/password-reset`, {
    method: 'POST',
  });
  return response as TemporaryPasswordResponse;
}
