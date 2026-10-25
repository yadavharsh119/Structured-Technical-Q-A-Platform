import type { ApiResponse } from '@structured-qa/shared';
import { apiRequest } from './client';
import type { Question, Topic } from './types';

export function listTopics(): Promise<ApiResponse<{ topics: Topic[] }>> {
  return apiRequest('/topics');
}

export function getTopic(
  slug: string,
): Promise<ApiResponse<{ topic: Topic; questions: Question[] }>> {
  return apiRequest(`/topics/${encodeURIComponent(slug)}`);
}
