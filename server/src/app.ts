import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, AppError } from './middleware/errorHandler';
import { attachSession } from './middleware/auth';
import { ApiErrorCode } from '@structured-qa/shared';
import { config } from './config';

export function createApp(): express.Application {
  const app = express();

  // Security Headers (SEC-10)
  app.use(helmet());

  // CORS allowlist configuration (COM-03)
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    }),
  );

  // Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Cookies (SEC-05: session cookie parsing)
  app.use(cookieParser());

  // Logging Middleware (QA-04)
  app.use(requestLogger);

  // Session attachment (never throws; leaves req.auth undefined when absent)
  app.use(attachSession);

  // API Routes
  app.use('/api', apiRoutes);

  // 404 Handler
  app.use((req: Request, _res: Response, next: express.NextFunction) => {
    next(
      new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, ApiErrorCode.NOT_FOUND),
    );
  });

  // Centralized Error Handler (QA-09, SEC-18)
  app.use(errorHandler);

  return app;
}

export const app = createApp();
