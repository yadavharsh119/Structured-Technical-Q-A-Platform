import type { NextFunction, Request, Response } from 'express';
import type { ZodType, ZodTypeDef } from 'zod';
import { AppError } from '../middleware/errorHandler';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// Express 4 does not forward rejected promises to the error handler
export function asyncHandler(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}

// On zod failure -> 400 VALIDATION_ERROR with a message listing field names only
export function parseBody<T>(schema: ZodType<T, ZodTypeDef, unknown>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new AppError(fields, 400, 'VALIDATION_ERROR');
  }
  return result.data;
}

// Route params such as /questions/:id must be UUIDs before they reach the database
export function parseUuidParam(value: string | undefined, label: string): string {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new AppError(`Invalid ${label}.`, 400, 'VALIDATION_ERROR');
  }
  return value;
}

// Use inside handlers that run after requireAuth/requireVerified
export function requireAuthUserId(req: Request): string {
  if (!req.auth) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }
  return req.auth.user.id;
}
