import type { FingerprintVisibilityInput } from '@structured-qa/shared';
import { AppError } from '../middleware/errorHandler';
import {
  fingerprintRepository,
  type EligiblePerspectiveRow,
} from '../repositories/fingerprintRepository';
import { userRepository } from '../repositories/userRepository';

export interface FingerprintEntryDto {
  category: string;
  perspectives: number;
  upvotes: number;
  score: number;
  rank: number;
}

export interface FingerprintEntry {
  categoryId: string;
  categoryName: string;
  perspectives: number;
  upvotes: number;
  score: number;
  rank: number;
}

export interface FingerprintVisibilityDto {
  fingerprintPublic: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function fingerprintNotFound(): AppError {
  return new AppError('Fingerprint not found.', 404, 'FINGERPRINT_NOT_FOUND');
}

function userNotFound(): AppError {
  return new AppError('User not found.', 404, 'USER_NOT_FOUND');
}

export function recencyWeight(createdAt: Date, now: Date): number {
  const ageDays = (now.getTime() - createdAt.getTime()) / DAY_MS;
  if (ageDays < 30) return 1.0;
  if (ageDays < 180) return 0.7;
  return 0.4;
}

// Score = sum over perspectives of (1 + upvotes) * recency weight.
export function computeFingerprint(
  rows: Array<
    Pick<EligiblePerspectiveRow, 'category_id' | 'category_name' | 'created_at' | 'upvotes'>
  >,
  now: Date = new Date(),
): FingerprintEntry[] {
  const byCategory = new Map<string, FingerprintEntry>();

  for (const row of rows) {
    const entry = byCategory.get(row.category_id) ?? {
      categoryId: row.category_id,
      categoryName: row.category_name,
      perspectives: 0,
      upvotes: 0,
      score: 0,
      rank: 0,
    };
    entry.perspectives += 1;
    entry.upvotes += row.upvotes;
    entry.score += (1 + row.upvotes) * recencyWeight(row.created_at, now);
    byCategory.set(row.category_id, entry);
  }

  return Array.from(byCategory.values())
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.upvotes - a.upvotes ||
        b.perspectives - a.perspectives ||
        a.categoryName.localeCompare(b.categoryName),
    )
    .slice(0, 3)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

async function getForUser(
  userId: string,
  viewerId: string | null,
): Promise<FingerprintEntryDto[]> {
  const user = await userRepository.findById(userId);
  if (!user || (!user.fingerprint_public && viewerId !== userId)) {
    throw fingerprintNotFound();
  }

  const rows = await fingerprintRepository.findTopByUser(userId);
  return rows.map((row) => ({
    category: row.category_name,
    perspectives: row.perspective_count,
    upvotes: row.upvote_total,
    score: Number(row.score),
    rank: row.rank,
  }));
}

async function setVisibility(
  userId: string,
  input: FingerprintVisibilityInput,
): Promise<FingerprintVisibilityDto> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw userNotFound();
  }
  await userRepository.setFingerprintPublic(userId, input.public);
  return { fingerprintPublic: input.public };
}

async function recalculateUser(userId: string, now: Date = new Date()): Promise<FingerprintEntry[]> {
  const perspectives = await fingerprintRepository.listEligiblePerspectivesForUser(userId);
  const fingerprint = computeFingerprint(perspectives, now);
  await fingerprintRepository.replaceForUser(
    userId,
    fingerprint.map((entry) => ({
      user_id: userId,
      category_id: entry.categoryId,
      perspective_count: entry.perspectives,
      upvote_total: entry.upvotes,
      score: entry.score,
      rank: entry.rank,
    })),
    now,
  );
  return fingerprint;
}

async function recalculateAllUsers(now: Date = new Date()): Promise<number> {
  await fingerprintRepository.deleteAll();
  const userIds = await fingerprintRepository.listUserIdsWithEligiblePerspectives();
  for (const userId of userIds) {
    await recalculateUser(userId, now);
  }
  return userIds.length;
}

export const fingerprintService = {
  getForUser,
  setVisibility,
  recalculateUser,
  recalculateAllUsers,
};

export const recalculateUserFingerprint = recalculateUser;
