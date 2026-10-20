import argon2 from 'argon2';
import {
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  VerifyEmailInput,
} from '@structured-qa/shared';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { emailTokenRepository } from '../repositories/emailTokenRepository';
import { loginAttemptRepository } from '../repositories/loginAttemptRepository';
import { sessionRepository } from '../repositories/sessionRepository';
import { userRepository } from '../repositories/userRepository';
import { UserRole, UserStatus } from '../types/database';
import { auditService } from './auditService';
import { emailService } from './emailService';
import { generateToken, hashToken } from './tokenService';

type Argon2Options = NonNullable<Parameters<typeof argon2.hash>[1]>;

// SEC-01: Argon2id, memory cost 19456 KiB, time cost 2, parallelism 1
const ARGON2_OPTIONS: Argon2Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

// SEC-03/SEC-04: fixed dummy hash so unknown-user logins spend similar time
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$PrmK3fjJa70D/SSYV+aJ+A$bAzJbKDyl7x60ry6XackEmYhB8iFggM0sqiZKh9VMzw';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const RESEND_MESSAGE = 'If that email address exists, a verification link has been sent.';

export interface RegisteredUser {
  id: string;
  username: string;
  email: string;
}

export interface LoginUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

// SEC-03: never reveal which field clashed during registration
function registrationFailed(): AppError {
  return new AppError('Registration could not be completed', 400, 'REGISTRATION_FAILED');
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === '23505'
  );
}

function verificationLink(rawToken: string): string {
  return `${config.APP_BASE_URL}/verify-email?token=${rawToken}`;
}

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

async function register(input: RegisterInput, ip: string | undefined): Promise<RegisteredUser> {
  const existingEmail = await userRepository.findByEmail(input.email);
  const existingUsername = await userRepository.findByUsername(input.username);
  if (existingEmail || existingUsername) {
    throw registrationFailed();
  }

  const passwordHash = await hashPassword(input.password);

  let user;
  try {
    user = await userRepository.create({
      full_name: input.fullName,
      username: input.username,
      email: input.email,
      password_hash: passwordHash,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw registrationFailed();
    }
    throw err;
  }

  const rawToken = generateToken();
  await emailTokenRepository.create({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  });
  await emailService.sendVerificationEmail(user.email, verificationLink(rawToken));
  await auditService.log({ actorUserId: user.id, action: 'auth.register', ip, result: 'success' });

  return { id: user.id, username: user.username, email: user.email };
}

async function verifyEmail(input: VerifyEmailInput): Promise<void> {
  const record = await emailTokenRepository.findValid(hashToken(input.token));
  if (!record) {
    throw new AppError('Invalid or expired verification token', 400, 'INVALID_OR_EXPIRED_TOKEN');
  }
  await emailTokenRepository.markUsed(record.id);
  await userRepository.markEmailVerified(record.user_id);
  await auditService.log({
    actorUserId: record.user_id,
    action: 'auth.email_verified',
    result: 'success',
  });
}

// Always returns the same result whether or not the account exists (SEC-03)
async function resendVerification(
  input: ResendVerificationInput,
): Promise<{ message: string }> {
  const user = await userRepository.findByEmail(input.email);
  if (!user || user.email_verified_at) {
    return { message: RESEND_MESSAGE };
  }

  const latest = await emailTokenRepository.latestForUser(user.id);
  if (latest && Date.now() - latest.created_at.getTime() < RESEND_MIN_INTERVAL_MS) {
    return { message: RESEND_MESSAGE };
  }

  const rawToken = generateToken();
  await emailTokenRepository.create({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  });
  await emailService.sendVerificationEmail(user.email, verificationLink(rawToken));
  await auditService.log({
    actorUserId: user.id,
    action: 'auth.verification_resent',
    result: 'success',
  });

  return { message: RESEND_MESSAGE };
}

async function login(
  input: LoginInput,
  ip: string | undefined,
  userAgent: string | undefined,
): Promise<{ user: LoginUser; rawSessionToken: string }> {
  // 1. Per-IP failure rate limit: 5 failed attempts per 15 minutes
  const recentFailures = await loginAttemptRepository.countRecentFailuresByIp(ip, 15);
  if (recentFailures >= MAX_FAILED_ATTEMPTS) {
    throw new AppError('Too many attempts. Try again later.', 429, 'RATE_LIMITED');
  }

  const user = await userRepository.findByIdentifier(input.identifier);
  if (!user) {
    // Keep timing similar for unknown users
    await verifyPassword(DUMMY_PASSWORD_HASH, input.password);
    await loginAttemptRepository.record({ identifier: input.identifier, ip, success: false });
    await auditService.log({ action: 'auth.login', ip, result: 'failure' });
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // 3. Account lockout
  if (user.locked_until && user.locked_until.getTime() > Date.now()) {
    throw new AppError('Account temporarily locked. Try again later.', 423, 'ACCOUNT_LOCKED');
  }

  // 4. Password verification (null password_hash fails as wrong password)
  const passwordOk = user.password_hash
    ? await verifyPassword(user.password_hash, input.password)
    : false;
  if (!passwordOk) {
    await loginAttemptRepository.record({ identifier: input.identifier, ip, success: false });
    const attempts = await userRepository.incrementFailedAttempts(user.id);
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      await userRepository.lockUntil(user.id, new Date(Date.now() + LOCKOUT_MS));
    }
    await auditService.log({ actorUserId: user.id, action: 'auth.login', ip, result: 'failure' });
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // 5. Account status (suspended users may still log in)
  if (user.status === 'banned' || user.status === 'deactivated') {
    throw new AppError('Account is not available.', 403, 'ACCOUNT_DISABLED');
  }

  // 6. Email verification
  if (!user.email_verified_at) {
    throw new AppError(
      'Please verify your email before logging in.',
      403,
      'EMAIL_NOT_VERIFIED',
    );
  }

  // 7. Success
  await userRepository.updateLoginSuccess(user.id);
  const rawSessionToken = generateToken();
  await sessionRepository.create({
    userId: user.id,
    tokenHash: hashToken(rawSessionToken),
    ip,
    userAgent,
    expiresAt: new Date(Date.now() + config.SESSION_TTL_MINUTES * 60 * 1000),
  });
  await loginAttemptRepository.record({ identifier: input.identifier, ip, success: true });
  await auditService.log({ actorUserId: user.id, action: 'auth.login', ip, result: 'success' });

  const loginUser: LoginUser = {
    id: user.id,
    fullName: user.full_name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
  };
  return { user: loginUser, rawSessionToken };
}

async function logout(sessionId: string, userId: string): Promise<void> {
  await sessionRepository.revoke(sessionId);
  await auditService.log({ actorUserId: userId, action: 'auth.logout', result: 'success' });
}

async function logoutAll(userId: string): Promise<void> {
  await sessionRepository.revokeAllForUser(userId);
  // Invalidate any session created before now (SEC-05)
  await userRepository.setSessionsValidAfter(userId, new Date());
  await auditService.log({ actorUserId: userId, action: 'auth.logout_all', result: 'success' });
}

export const authService = {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  logoutAll,
};


