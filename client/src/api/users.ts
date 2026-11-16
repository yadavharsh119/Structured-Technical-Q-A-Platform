import type {
  ApiResponse,
  ChangePasswordInput,
  DeactivateAccountInput,
  ProfileUpdateInput,
} from '@structured-qa/shared';
import { apiDownload, apiRequest, type DownloadedFile } from './client';

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

export interface UserProfileStats {
  questionsSubmitted: number;
  perspectivesSubmitted: number;
  totalUpvotesReceived: number;
}

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  bio: string | null;
  skills: string[];
  interests: string[];
  joinedAt: string;
  emailPublic: boolean;
  email?: string;
  stats: UserProfileStats;
}

export function getUserProfile(
  userId: string,
): Promise<ApiResponse<{ user: UserProfile }>> {
  return apiRequest(`/users/${encodeURIComponent(userId)}`);
}

export function updateMyProfile(
  input: ProfileUpdateInput,
): Promise<ApiResponse<{ user: UserProfile }>> {
  return apiRequest('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function changePassword(
  input: ChangePasswordInput,
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/users/me/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
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

export function exportMyData(): Promise<ApiResponse<DownloadedFile>> {
  return apiDownload('/users/me/export', { method: 'POST' });
}

export function deactivateAccount(
  input: DeactivateAccountInput,
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/users/me/deactivate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
