import type { ApiResponse, PerspectiveCreateInput } from '@structured-qa/shared';
import { apiRequest } from './client';
import type { Perspective, PerspectiveSort, PerspectiveVoteState } from './types';

export function listPerspectives(
  slug: string,
  sort: PerspectiveSort,
): Promise<ApiResponse<{ perspectives: Perspective[] }>> {
  return apiRequest(
    `/topics/${encodeURIComponent(slug)}/perspectives?sort=${encodeURIComponent(sort)}`,
  );
}

export function createPerspective(
  slug: string,
  input: PerspectiveCreateInput,
): Promise<ApiResponse<{ perspective: Perspective }>> {
  return apiRequest(`/topics/${encodeURIComponent(slug)}/perspectives`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function togglePerspectiveUpvote(id: string): Promise<ApiResponse<PerspectiveVoteState>> {
  return apiRequest(`/perspectives/${encodeURIComponent(id)}/upvote`, { method: 'POST' });
}

export function comparePerspectives(
  slug: string,
  ids: string[],
): Promise<ApiResponse<{ perspectives: Perspective[] }>> {
  const params = new URLSearchParams({ ids: ids.join(',') });
  return apiRequest(
    `/topics/${encodeURIComponent(slug)}/compare?${params.toString()}`,
  );
}
