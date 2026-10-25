import type { ApiResponse } from '@structured-qa/shared';
import { apiRequest } from './client';
import type { Category, Tag } from './types';

export function listCategories(): Promise<ApiResponse<{ categories: Category[] }>> {
  return apiRequest('/categories');
}

export function listTags(): Promise<ApiResponse<{ tags: Tag[] }>> {
  return apiRequest('/tags');
}
