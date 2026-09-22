import { Request, Response } from 'express';
import { HealthCheckData, HealthCheckResponse } from '@structured-qa/shared';
import { checkDatabaseConnection } from '../config/database';
import { config } from '../config';

export async function getHealth(_req: Request, res: Response<HealthCheckResponse>): Promise<void> {
  const dbHealth = await checkDatabaseConnection();

  const data: HealthCheckData = {
    status: dbHealth.connected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.NODE_ENV,
    database: dbHealth,
  };

  res.status(200).json({
    success: true,
    data,
  });
}
