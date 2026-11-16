import { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { sessionRepository } from '../repositories/sessionRepository';
import { hashToken } from '../services/tokenService';
import { AppError } from './errorHandler';

export const SESSION_COOKIE = 'sid';

// Role hierarchy: registered < moderator < admin
const ROLE_RANK: Record<string, number> = { registered: 0, moderator: 1, admin: 2 };

/**
 * Attaches req.auth when a valid session cookie is present.
 * Never throws: invalid or missing sessions simply leave req.auth undefined.
 */
export async function attachSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const raw = req.cookies?.[SESSION_COOKIE];
    if (typeof raw === 'string' && raw.length > 0) {
      const found = await sessionRepository.findActiveByTokenHash(hashToken(raw));
      if (found) {
        const blocked = found.status === 'deactivated';
        const stale =
          found.sessions_valid_after !== null &&
          found.session_created_at.getTime() < found.sessions_valid_after.getTime();
        if (!blocked && !stale) {
          req.auth = {
            sessionId: found.session_id,
            user: {
              id: found.user_id,
              role: found.role,
              status: found.status,
              emailVerified: found.email_verified_at !== null,
            },
          };
          // Slide the session expiry (SEC-05)
          await sessionRepository.touch(
            found.session_id,
            new Date(Date.now() + config.SESSION_TTL_MINUTES * 60 * 1000),
          );
        }
      }
    }
  } catch {
    // attachSession must never fail a request
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    return;
  }
  next();
}

export function requireVerified(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    return;
  }
  if (!req.auth.user.emailVerified) {
    next(new AppError('Please verify your email before logging in.', 403, 'EMAIL_NOT_VERIFIED'));
    return;
  }
  next();
}

export function requireRole(...roles: Array<'registered' | 'moderator' | 'admin'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
      return;
    }
    const requiredRank = Math.max(...roles.map((role) => ROLE_RANK[role] ?? Number.MAX_SAFE_INTEGER));
    const actualRank = ROLE_RANK[req.auth.user.role] ?? -1;
    if (actualRank < requiredRank) {
      next(new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
}
