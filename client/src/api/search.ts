import type { ApiResponse, SearchResponse, SearchSort } from '@structured-qa/shared';
import { apiRequest } from './client';

export interface SearchTopicsParams {
  q: string;
  category?: string;
  tags?: string[];
  sort?: SearchSort;
  page?: number;
}

export function searchTopics(params: SearchTopicsParams): Promise<ApiResponse<SearchResponse>> {
  const query = new URLSearchParams();
  query.set('q', params.q);
  if (params.category) {
    query.set('category', params.category);
  }
  if (params.tags) {
    for (const tag of params.tags) {
      if (tag.trim()) {
        query.append('tag', tag.trim());
      }
    }
  }
  if (params.sort) {
    query.set('sort', params.sort);
  }
  if (params.page && params.page > 1) {
    query.set('page', String(params.page));
  }
  return apiRequest(`/search?${query.toString()}`);
}
