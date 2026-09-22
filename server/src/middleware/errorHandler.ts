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
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const errorCode = 'code' in err ? err.code : ApiErrorCode.INTERNAL_SERVER_ERROR;

  // Log error details internally (SEC-18 / QA-04)
  logger.error({
    err,
    url: req.originalUrl,
    method: req.method,
    statusCode,
  });

  const isProduction = config.NODE_ENV === 'production';
  const responseMessage =
    statusCode >= 500 && isProduction ? 'An unexpected internal error occurred' : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: responseMessage,
      ...('details' in err && err.details ? { details: err.details } : {}),
    },
  });
}
