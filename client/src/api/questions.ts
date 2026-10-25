import type {
  ApiResponse,
  QuestionApproveInput,
  QuestionCreateInput,
  QuestionRejectInput,
  QuestionUpdateInput,
} from '@structured-qa/shared';
import { apiRequest } from './client';
import type { Question, QuestionWithTopic } from './types';

export interface QuestionDraft {
  title: string;
  description: string;
  categoryId: string;
  techStack: string;
  tagIds: string[];
}

export function createQuestion(
  input: QuestionCreateInput,
): Promise<ApiResponse<{ question: Question }>> {
  return apiRequest('/questions', { method: 'POST', body: JSON.stringify(input) });
}

export function listMyQuestions(): Promise<ApiResponse<{ questions: Question[] }>> {
  return apiRequest('/questions/mine');
}

export function listPendingQuestions(): Promise<ApiResponse<{ questions: Question[] }>> {
  return apiRequest('/questions/pending');
}

export function updateQuestion(
  id: string,
  input: QuestionUpdateInput,
): Promise<ApiResponse<{ question: Question }>> {
  return apiRequest(`/questions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteQuestion(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest(`/questions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function rejectQuestion(
  id: string,
  input: QuestionRejectInput,
): Promise<ApiResponse<{ question: Question }>> {
  return apiRequest(`/questions/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function approveQuestion(
  id: string,
  input: QuestionApproveInput,
): Promise<ApiResponse<QuestionWithTopic>> {
  return apiRequest(`/questions/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
