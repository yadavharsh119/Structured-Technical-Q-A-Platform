import type {
  ApiResponse,
  TopicCreateInput,
  TopicUpdateInput,
} from '@structured-qa/shared';
import { apiRequest } from './client';
import type { Question, Topic } from './types';

export interface TopicRedirect {
  id: string;
  slug: string;
}

export type TopicLookupData =
  | { topic: Topic; questions: Question[] }
  | { redirectTo: TopicRedirect };

export interface TopicMergeResult {
  source: Topic;
  destination: Topic;
}

export function listTopics(): Promise<ApiResponse<{ topics: Topic[] }>> {
  return apiRequest('/topics');
}

export function getTopic(slug: string): Promise<ApiResponse<TopicLookupData>> {
  return apiRequest(`/topics/${encodeURIComponent(slug)}`);
}

export function createTopic(
  input: TopicCreateInput,
): Promise<ApiResponse<{ topic: Topic }>> {
  return apiRequest('/topics', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTopic(
  topicId: string,
  input: TopicUpdateInput,
): Promise<ApiResponse<{ topic: Topic }>> {
  return apiRequest(`/topics/${encodeURIComponent(topicId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function archiveTopic(topicId: string): Promise<ApiResponse<{ topic: Topic }>> {
  return apiRequest(`/topics/${encodeURIComponent(topicId)}/archive`, {
    method: 'POST',
  });
}

export function mergeTopics(
  sourceId: string,
  destinationId: string,
): Promise<ApiResponse<TopicMergeResult>> {
  return apiRequest('/admin/topics/merge', {
    method: 'POST',
    body: JSON.stringify({ sourceId, destinationId }),
  });
}
