import type {
  AdminPerspectiveDeleteInput,
  ApiResponse,
  DeletionRequestCreateInput,
  DeletionRequestDecisionInput,
  DeletionRequestListQuery,
} from '@structured-qa/shared';
import { apiRequest } from './client';
import type { DeletionRequest } from './types';

export function createDeletionRequest(
  perspectiveId: string,
  input: DeletionRequestCreateInput,
): Promise<ApiResponse<{ deletionRequest: DeletionRequest }>> {
  return apiRequest(`/perspectives/${encodeURIComponent(perspectiveId)}/deletion-requests`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listDeletionRequests(
  status?: DeletionRequestListQuery['status'],
): Promise<ApiResponse<{ deletionRequests: DeletionRequest[] }>> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest(`/admin/deletion-requests${query}`);
}

export function decideDeletionRequest(
  id: string,
  input: DeletionRequestDecisionInput,
): Promise<ApiResponse<{ deletionRequest: DeletionRequest }>> {
  return apiRequest(`/admin/deletion-requests/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function adminDeletePerspective(
  id: string,
  input: AdminPerspectiveDeleteInput,
  hard: boolean,
): Promise<ApiResponse<{ id: string; hard: boolean }>> {
  const query = hard ? '?hard=true' : '';
  return apiRequest(`/admin/perspectives/${encodeURIComponent(id)}${query}`, {
    method: 'DELETE',
    body: JSON.stringify(input),
  });
}
