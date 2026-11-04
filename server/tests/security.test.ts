import express from 'express';
import request from 'supertest';
import { createApp } from '../src/app';
import { config } from '../src/config';
import { closeDatabaseConnection } from '../src/config/database';
import { errorHandler } from '../src/middleware/errorHandler';

const app = createApp();
const allowedOrigin = config.CORS_ORIGINS.split(',')[0]?.trim() ?? 'http://localhost:3000';

afterAll(async () => {
  delete process.env.RATE_LIMIT_ENABLED;
  await closeDatabaseConnection();
});

describe('security headers', () => {
  it('sets HSTS, frame deny, nosniff and a strict API CSP on GET /api/health', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['strict-transport-security']).toContain('max-age=');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });
});

describe('CORS allowlist', () => {
  it('allows the configured origin with credentials', async () => {
    const res = await request(app).get('/api/health').set('Origin', allowedOrigin);

    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('emits no CORS headers for an untrusted origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://not-allowed.invalid');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });
});

describe('input validation', () => {
  it('rejects an invalid login body with 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an empty topic slug param with 400', async () => {
    const res = await request(app).get('/api/topics/%20');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('error handling', () => {
  it('never returns stacks or SQL/table details outside development', async () => {
    const errorApp = express();
    errorApp.get('/boom', (_req, _res, next) => {
      next(new Error('relation "users" does not exist'));
    });
    errorApp.use(errorHandler);

    const res = await request(errorApp).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.error).not.toHaveProperty('stack');
    expect(JSON.stringify(res.body)).not.toContain('relation');
    expect(JSON.stringify(res.body)).not.toContain('users');
  });
});

describe('rate limiting', () => {
  it('returns 429 with a clear message after the login limit', async () => {
    process.env.RATE_LIMIT_ENABLED = 'true';

    try {
      const statuses: number[] = [];
      for (let attempt = 0; attempt < 21; attempt += 1) {
        const res = await request(app).post('/api/auth/login').send({});
        statuses.push(res.status);
      }

      expect(statuses.slice(0, 20).every((status) => status === 400)).toBe(true);
      expect(statuses[20]).toBe(429);

      const limited = await request(app).post('/api/auth/login').send({});
      expect(limited.status).toBe(429);
      expect(limited.body.error.message).toMatch(/too many requests/i);
    } finally {
      delete process.env.RATE_LIMIT_ENABLED;
    }
  });
});

describe('session cookie flags', () => {
  it('forces Secure cookies in production even when COOKIE_SECURE=false', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousCookieSecure = process.env.COOKIE_SECURE;

    process.env.NODE_ENV = 'production';
    process.env.COOKIE_SECURE = 'false';
    jest.resetModules();

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const productionConfig = require('../src/config').config;
      expect(productionConfig.COOKIE_SECURE).toBe(true);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      if (previousCookieSecure === undefined) {
        delete process.env.COOKIE_SECURE;
      } else {
        process.env.COOKIE_SECURE = previousCookieSecure;
      }
      jest.resetModules();
    }
  });
});
