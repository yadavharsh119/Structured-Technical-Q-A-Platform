import { ApiErrorCode, UserRole, UserStatus } from '../constants';

export interface ApiErrorResponse {
  code: ApiErrorCode | string;
  message: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiFailureResponse {
  success: false;
  error: ApiErrorResponse;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiFailureResponse;

export interface HealthCheckData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database: {
    connected: boolean;
    latencyMs?: number;
    error?: string;
  };
}

export type HealthCheckResponse = ApiResponse<HealthCheckData>;

export const REPORT_REASONS = [
  'Spam',
  'Offensive/Abusive',
  'Duplicate',
  'Misleading/Incorrect',
  'Plagiarism',
  'Other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export interface ReportPerspectivePayload {
  perspectiveId: string;
  reason: ReportReason;
  details?: string;
}

export interface ReportPerspectiveResult {
  reportId: string;
  status: 'received';
}

export { UserRole, UserStatus, ApiErrorCode };
