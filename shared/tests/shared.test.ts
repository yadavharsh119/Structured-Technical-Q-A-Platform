import { UserRole, ApiErrorCode, healthCheckSchema } from '../src';

describe('Shared Package Tests', () => {
  it('should define valid UserRole constants', () => {
    expect(UserRole.USER).toBe('user');
    expect(UserRole.MODERATOR).toBe('moderator');
    expect(UserRole.ADMIN).toBe('admin');
  });

  it('should define standard ApiErrorCode values', () => {
    expect(ApiErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ApiErrorCode.FORBIDDEN).toBe('FORBIDDEN');
    expect(ApiErrorCode.NOT_FOUND).toBe('NOT_FOUND');
    expect(ApiErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR');
  });

  it('should validate valid health check data schema', () => {
    const validData = {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      uptimeSeconds: 120,
      environment: 'test',
      database: {
        connected: true,
        latencyMs: 5,
      },
    };

    const parsed = healthCheckSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('should reject invalid health check status', () => {
    const invalidData = {
      status: 'unknown',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 120,
      environment: 'test',
      database: {
        connected: true,
      },
    };

    const parsed = healthCheckSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });
});
