import { Request, Response } from 'express';
import { HealthCheckData, HealthCheckResponse } from '@structured-qa/shared';
import { checkDatabaseConnection } from '../config/database';
import { config } from '../config';

export async function getHealth(_req: Request, res: Response<HealthCheckResponse>): Promise<void> {
  const dbHealth = await checkDatabaseConnection();
  // SEC-18: database error text can contain driver/SQL details, so it is only
  // exposed in development.
  const publicDatabase =
    config.NODE_ENV === 'development'
      ? dbHealth
      : {
          connected: dbHealth.connected,
          ...(dbHealth.latencyMs !== undefined ? { latencyMs: dbHealth.latencyMs } : {}),
        };

  const data: HealthCheckData = {
    status: dbHealth.connected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.NODE_ENV,
    database: publicDatabase,
  };

  res.status(200).json({
    success: true,
    data,
  });
}
