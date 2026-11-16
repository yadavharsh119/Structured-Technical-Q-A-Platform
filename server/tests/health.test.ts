import request from 'supertest';
import { createApp } from '../src/app';
import { closeDatabaseConnection } from '../src/config/database';

describe('Health & Server Infrastructure Tests', () => {
  const app = createApp();

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  it('GET /api/health should return 200 with structured health data', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('uptimeSeconds');
    expect(res.body.data).toHaveProperty('environment');
    expect(res.body.data).toHaveProperty('database');
    expect(res.body.data.database).toHaveProperty('connected');
  });

  it('GET /api/unknown-route should return 404 with structured error response', async () => {
    const res = await request(app).get('/api/unknown-route');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).toHaveProperty('message');
  });
});
