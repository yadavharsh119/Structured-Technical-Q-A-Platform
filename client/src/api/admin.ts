import type {
  ADMIN_ASSIGNABLE_ROLES,
  ADMIN_USER_ACTIONS,
  ADMIN_USER_ROLES,
  ADMIN_USER_STATUSES,
  ApiResponse,
  CategoryCreateInput,
  CategoryUpdateInput,
  TagCreateInput,
  TagMergeInput,
  TagUpdateInput,
} from '@structured-qa/shared';
import { apiRequest } from './client';

export type AdminRole = (typeof ADMIN_USER_ROLES)[number];
export type AdminAssignableRole = (typeof ADMIN_ASSIGNABLE_ROLES)[number];
export type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number];
export type AdminUserAction = (typeof ADMIN_USER_ACTIONS)[number];

export interface AdminUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: AdminRole;
  status: AdminUserStatus;
  suspendedUntil: string | null;
  createdAt: string;
}

export interface AdminUserList {
  users: AdminUser[];
  page: number;
  perPage: number;
  total: number;
}

export interface AdminUserQuery {
  q?: string;
  role?: AdminRole;
  status?: AdminUserStatus;
  page?: number;
}

export interface AdminUserActionInput {
  action: AdminUserAction;
  reason: string;
  durationDays?: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
}

export interface AdminTag {
  id: string;
  name: string;
  isActive: boolean;
}

export interface TagMergeResult {
  source: AdminTag;
  destination: AdminTag;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string | null;
  actorUsername: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  result: 'success' | 'failure';
  details: Record<string, unknown>;
}

export interface AuditLogList {
  logs: AuditLog[];
  page: number;
  perPage: number;
  total: number;
}

export interface AuditLogQuery {
  actor?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
}

export function listAdminUsers(query: AdminUserQuery = {}): Promise<ApiResponse<AdminUserList>> {
  const params = new URLSearchParams();

  if (query.q) params.set('q', query.q);
  if (query.role) params.set('role', query.role);
  if (query.status) params.set('status', query.status);
  params.set('page', String(query.page ?? 1));

  return apiRequest(`/admin/users?${params.toString()}`);
}

export function updateAdminUserRole(
  userId: string,
  role: AdminAssignableRole,
): Promise<ApiResponse<{ user: AdminUser }>> {
  return apiRequest(`/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export function applyAdminUserAction(
  userId: string,
  input: AdminUserActionInput,
): Promise<ApiResponse<{ user: AdminUser }>> {
  return apiRequest(`/admin/users/${encodeURIComponent(userId)}/actions`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listAuditLogs(query: AuditLogQuery = {}): Promise<ApiResponse<AuditLogList>> {
  const params = new URLSearchParams();

  if (query.actor) params.set('actor', query.actor);
  if (query.action) params.set('action', query.action);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  params.set('page', String(query.page ?? 1));

  return apiRequest(`/admin/audit-logs?${params.toString()}`);
}

export function listAdminCategories(): Promise<ApiResponse<{ categories: AdminCategory[] }>> {
  return apiRequest('/admin/categories');
}

export function createAdminCategory(
  input: CategoryCreateInput,
): Promise<ApiResponse<{ category: AdminCategory }>> {
  return apiRequest('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdminCategory(
  categoryId: string,
  input: CategoryUpdateInput,
): Promise<ApiResponse<{ category: AdminCategory }>> {
  return apiRequest(`/admin/categories/${encodeURIComponent(categoryId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listAdminTags(): Promise<ApiResponse<{ tags: AdminTag[] }>> {
  return apiRequest('/admin/tags');
}

export function createAdminTag(input: TagCreateInput): Promise<ApiResponse<{ tag: AdminTag }>> {
  return apiRequest('/admin/tags', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdminTag(
  tagId: string,
  input: TagUpdateInput,
): Promise<ApiResponse<{ tag: AdminTag }>> {
  return apiRequest(`/admin/tags/${encodeURIComponent(tagId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function mergeAdminTags(input: TagMergeInput): Promise<ApiResponse<TagMergeResult>> {
  return apiRequest('/admin/tags/merge', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
