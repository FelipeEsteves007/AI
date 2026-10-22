import { apiClient } from '@/services/apiClient';
import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  SessionResponse,
} from '@/types/auth';

/** `POST /api/auth/login` — o cookie de sessão vem no header e o navegador guarda sozinho. */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: credentials,
  });
  return response as LoginResponse;
}

/** `POST /api/auth/logout` — 204, cookie expirado pelo backend. */
export async function logout(): Promise<void> {
  await apiClient('/api/auth/logout', { method: 'POST' });
}

/** `GET /api/auth/me` — usuário e lista de permissões. Lança ApiError 401 se não houver sessão. */
export async function getSession(): Promise<SessionResponse> {
  const response = await apiClient<SessionResponse>('/api/auth/me');
  return response as SessionResponse;
}

/** `PUT /api/auth/password` — 204 e novo cookie (as outras sessões caem). */
export async function changePassword(payload: ChangePasswordRequest): Promise<void> {
  await apiClient('/api/auth/password', { method: 'PUT', body: payload });
}
