import type { ApiResponse } from '@structured-qa/shared';
import { getTopicBySlug } from '../lib/getTopic';
import type { TopicDetail } from '../types/topic';
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

// SubmitPerspective still runs on mock data; this keeps its topic lookup local.
export function fetchTopicBySlug(slug: string): Promise<TopicDetail | null> {
  return new Promise((resolve) => setTimeout(() => resolve(getTopicBySlug(slug)), 250));
}
