import { Request, Response, NextFunction } from 'express';
import { ApiErrorCode, ApiResponse } from '@structured-qa/shared';
import { logger } from './requestLogger';
import { config } from '../config';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    code: string = ApiErrorCode.INTERNAL_SERVER_ERROR,
    details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response<ApiResponse<never>>,
  _next: NextFunction,
): void {
  const isAppError = err instanceof AppError;
  const rawStatus =
    'statusCode' in err
      ? err.statusCode
      : 'status' in err && typeof (err as { status?: unknown }).status === 'number'
        ? (err as { status: number }).status
        : undefined;
  const statusCode =
    typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;
  const errorCode = isAppError
    ? err.code
    : statusCode === 400
      ? ApiErrorCode.VALIDATION_ERROR
      : ApiErrorCode.INTERNAL_SERVER_ERROR;

  // Log error details internally (SEC-18 / QA-04). The raw error is never
  // serialised into the HTTP response.
  logger.error({
    err,
    url: req.originalUrl,
    method: req.method,
    statusCode,
  });

  const isDevelopment = config.NODE_ENV === 'development';
  const responseMessage = isDevelopment
    ? err.message
    : isAppError && statusCode < 500
      ? err.message
      : statusCode === 400
        ? 'Invalid request.'
        : 'An unexpected internal error occurred';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: responseMessage,
      // AppError details are authored by the application and safe to expose.
      ...(isAppError && err.details !== undefined ? { details: err.details } : {}),
    },
  });
}
