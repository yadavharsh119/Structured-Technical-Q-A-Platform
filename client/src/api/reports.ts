import type {
  ApiResponse,
  ReportAction,
  ReportCreateInput,
  ReportStatus,
} from '@structured-qa/shared';
import { apiRequest } from './client';
import type { Report } from './types';

export function createReport(input: ReportCreateInput): Promise<ApiResponse<{ report: Report }>> {
  return apiRequest('/reports', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listReports(status?: ReportStatus): Promise<ApiResponse<{ reports: Report[] }>> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest(`/reports${query}`);
}

export function actOnReport(
  id: string,
  action: ReportAction,
): Promise<ApiResponse<{ report: Report }>> {
  return apiRequest(`/reports/${encodeURIComponent(id)}/action`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}
