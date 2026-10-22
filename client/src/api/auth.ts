import type { ApiResponse, LoginInput, RegisterInput, UserRole, UserStatus } from '@structured-qa/shared';
import { apiRequest } from './client';

export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export function registerRequest(input: RegisterInput): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export function verifyEmailRequest(token: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) });
}

export function loginRequest(input: LoginInput): Promise<ApiResponse<{ user: AuthUser }>> {
  return apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function logoutRequest(): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export function meRequest(): Promise<ApiResponse<{ user: AuthUser }>> {
  return apiRequest('/auth/me');
}
