import { z } from 'zod';
import { UserRole, UserStatus } from '../constants';

export const userRoleSchema = z.nativeEnum(UserRole);
export const userStatusSchema = z.nativeEnum(UserStatus);

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const healthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  environment: z.string(),
  database: z.object({
    connected: z.boolean(),
    latencyMs: z.number().optional(),
    error: z.string().optional(),
  }),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;
