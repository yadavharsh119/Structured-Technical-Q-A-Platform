import { NextFunction, Request, Response } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@structured-qa/shared';
import { ZodType } from 'zod';
import { config } from '../config';
import { userRepository } from '../repositories/userRepository';
import { authService } from '../services/authService';
import { SESSION_COOKIE } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// Express 4 does not forward rejected promises to the error handler
function asyncHandler(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}

// On zod failure -> 400 VALIDATION_ERROR with a message listing field names only
function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new AppError(fields, 400, 'VALIDATION_ERROR');
  }
  return result.data;
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: config.SESSION_TTL_MINUTES * 60 * 1000,
  };
}

function requireAuthOrThrow(req: Request): { sessionId: string; userId: string } {
  if (!req.auth) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }
  return { sessionId: req.auth.sessionId, userId: req.auth.user.id };
}

export const register = asyncHandler(async (req, res) => {
  const input = parseBody(registerSchema, req.body);
  await authService.register(input, req.ip);
  res.status(201).json({
    success: true,
    data: { message: 'Registration successful. Check your email to verify your account.' },
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const input = parseBody(verifyEmailSchema, req.body);
  await authService.verifyEmail(input);
  res.status(200).json({
    success: true,
    data: { message: 'Email verified successfully. You can now log in.' },
  });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const input = parseBody(resendVerificationSchema, req.body);
  const { message } = await authService.resendVerification(input);
  res.status(200).json({ success: true, data: { message } });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const input = parseBody(forgotPasswordSchema, req.body);
  const { message } = await authService.forgotPassword(input);
  res.status(200).json({ success: true, data: { message } });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const input = parseBody(resetPasswordSchema, req.body);
  await authService.resetPassword(input);
  res.status(200).json({
    success: true,
    data: { message: 'Password reset successfully. Please log in again.' },
  });
});

export const login = asyncHandler(async (req, res) => {
  const input = parseBody(loginSchema, req.body);
  const { user, rawSessionToken } = await authService.login(
    input,
    req.ip,
    req.get('user-agent'),
  );
  res.cookie(SESSION_COOKIE, rawSessionToken, sessionCookieOptions());
  res.status(200).json({ success: true, data: { user } });
});

export const logout = asyncHandler(async (req, res) => {
  const { sessionId, userId } = requireAuthOrThrow(req);
  await authService.logout(sessionId, userId);
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  });
  res.status(200).json({ success: true, data: { message: 'Logged out successfully.' } });
});

export const logoutAll = asyncHandler(async (req, res) => {
  const { userId } = requireAuthOrThrow(req);
  await authService.logoutAll(userId);
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  });
  res.status(200).json({ success: true, data: { message: 'Logged out of all sessions.' } });
});

export const me = asyncHandler(async (req, res) => {
  const { userId } = requireAuthOrThrow(req);
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.email_verified_at !== null,
        fingerprintPublic: user.fingerprint_public,
        emailPublic: user.email_public,
      },
    },
  });
});
