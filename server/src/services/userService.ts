import argon2 from 'argon2';
import type { ChangePasswordInput, ProfileUpdateInput } from '@structured-qa/shared';
import { AppError } from '../middleware/errorHandler';
import { sessionRepository } from '../repositories/sessionRepository';
import {
  userRepository,
  type UserProfileUpdate,
  type UserRow,
  type UserStats,
} from '../repositories/userRepository';
import { auditService } from './auditService';

type Argon2Options = NonNullable<Parameters<typeof argon2.hash>[1]>;

// SEC-01: keep password hashing parameters aligned with authService.
const ARGON2_OPTIONS: Argon2Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export interface UserProfileDto {
  id: string;
  username: string;
  fullName: string;
  bio: string | null;
  skills: string[];
  interests: string[];
  joinedAt: Date;
  emailPublic: boolean;
  email?: string;
  stats: UserStats;
}

function userNotFound(): AppError {
  return new AppError('User not found.', 404, 'USER_NOT_FOUND');
}

function usernameTaken(): AppError {
  return new AppError('Username is already taken.', 409, 'USERNAME_TAKEN');
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === '23505'
  );
}

function toProfileDto(user: UserRow, viewerId: string | null, stats: UserStats): UserProfileDto {
  const profile: UserProfileDto = {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    bio: user.bio,
    skills: user.technical_skills,
    interests: user.areas_of_interest,
    joinedAt: user.created_at,
    emailPublic: user.email_public,
    stats,
  };

  if (viewerId === user.id || user.email_public) {
    profile.email = user.email;
  }

  return profile;
}

function resolveProfileUpdate(input: ProfileUpdateInput): UserProfileUpdate {
  const data: UserProfileUpdate = {};

  const fullName = input.fullName ?? input.full_name;
  if (fullName !== undefined) {
    data.full_name = fullName;
  }

  if (input.username !== undefined) {
    data.username = input.username;
  }

  if (input.bio !== undefined) {
    data.bio = input.bio && input.bio.length > 0 ? input.bio : null;
  }

  const skills = input.skills ?? input.technicalSkills ?? input.technical_skills;
  if (skills !== undefined) {
    data.technical_skills = skills;
  }

  const interests = input.interests ?? input.areasOfInterest ?? input.areas_of_interest;
  if (interests !== undefined) {
    data.areas_of_interest = interests;
  }

  const emailPublic = input.emailPublic ?? input.email_public;
  if (emailPublic !== undefined) {
    data.email_public = emailPublic;
  }

  return data;
}

async function getProfile(userId: string, viewerId: string | null): Promise<UserProfileDto> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw userNotFound();
  }
  const stats = await userRepository.getStats(userId);
  return toProfileDto(user, viewerId, stats);
}

async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<UserProfileDto> {
  const current = await userRepository.findById(userId);
  if (!current) {
    throw userNotFound();
  }

  if (input.username !== undefined) {
    const existing = await userRepository.findByUsername(input.username);
    if (existing && existing.id !== userId) {
      throw usernameTaken();
    }
  }

  const update = resolveProfileUpdate(input);
  try {
    await userRepository.updateProfile(userId, update);
  } catch (err) {
    // Race with another user claiming the same username.
    if (isUniqueViolation(err)) {
      throw usernameTaken();
    }
    throw err;
  }

  return getProfile(userId, userId);
}

async function changePassword(
  userId: string,
  sessionId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw userNotFound();
  }
  if (!user.password_hash) {
    throw new AppError(
      'This account does not have a password set.',
      400,
      'PASSWORD_NOT_SET',
    );
  }

  let currentPasswordOk = false;
  try {
    currentPasswordOk = await argon2.verify(user.password_hash, input.currentPassword);
  } catch {
    currentPasswordOk = false;
  }
  if (!currentPasswordOk) {
    throw new AppError('Current password is incorrect.', 401, 'INVALID_CURRENT_PASSWORD');
  }

  const passwordHash = await argon2.hash(input.newPassword, ARGON2_OPTIONS);
  await userRepository.updatePasswordHash(userId, passwordHash);
  await sessionRepository.revokeOtherSessions(userId, sessionId);
  await auditService.log({
    actorUserId: userId,
    action: 'profile.password_changed',
    result: 'success',
  });
}

export const userService = {
  getProfile,
  updateProfile,
  changePassword,
};
