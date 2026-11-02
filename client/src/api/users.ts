import type { ApiResponse } from '@structured-qa/shared';
import { apiRequest } from './client';

export interface FingerprintEntry {
  category: string;
  perspectives: number;
  upvotes: number;
  score: number;
  rank: number;
}

export interface FingerprintVisibility {
  fingerprintPublic: boolean;
}

export function getUserFingerprint(
  userId: string,
): Promise<ApiResponse<{ fingerprint: FingerprintEntry[] }>> {
  return apiRequest(`/users/${encodeURIComponent(userId)}/fingerprint`);
}

export function updateFingerprintVisibility(
  isPublic: boolean,
): Promise<ApiResponse<FingerprintVisibility>> {
  return apiRequest('/users/me/fingerprint-visibility', {
    method: 'PATCH',
    body: JSON.stringify({ public: isPublic }),
  });
}
