import type { ApiResponse, AttachmentDto } from '@structured-qa/shared';
import { apiRequest } from './client';

export function uploadAttachment(file: File): Promise<ApiResponse<AttachmentDto>> {
  const body = new FormData();
  body.append('file', file);
  return apiRequest('/attachments', { method: 'POST', body });
}

export function attachmentDownloadUrl(id: string): string {
  return `/api/attachments/${encodeURIComponent(id)}/download`;
}
