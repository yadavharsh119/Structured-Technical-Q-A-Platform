import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { createApp } from '../src/app';
import { closeDatabaseConnection, pool } from '../src/config/database';
import { errorHandler } from '../src/middleware/errorHandler';
import { attachSession, requireAuth, requireRole } from '../src/middleware/auth';
import { emailService } from '../src/services/emailService';

// Mock the EmailService so tests can read the raw verification token
jest.mock('../src/services/emailService', () => ({
  emailService: {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  },
}));

const app = createApp();

// Unique suffix per run so every test user is unique
const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
let seq = 0;

interface Identity {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

function uniqueIdentity(): Identity {
  seq += 1;
  const password = 'Str0ng!Passw0rd';
  const username = `u${runId}${seq}`.slice(0, 30);
  return {
    fullName: `Auth Test ${seq}`,
    username,
    email: `${username}@example.com`,
    password,
    confirmPassword: password,
  };
}

function register(identity: Identity) {
  return request(app).post('/api/auth/register').send(identity);
}

function cookieFrom(res: request.Response): string {
  const setCookie = res.headers['set-cookie'];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  expect(raw).toBeDefined();
  return (raw ?? '').split(';')[0] ?? '';
}

function latestVerificationToken(): string {
  const mock = emailService.sendVerificationEmail as unknown as jest.Mock;
  const calls = mock.mock.calls as Array<[string, string]>;
  const last = calls[calls.length - 1];
  if (!last) throw new Error('No verification email was captured');
  const match = last[1].match(/token=([^&]+)/);
  if (!match || !match[1]) throw new Error('No token found in verification link');
  return match[1];
}

function latestResetToken(): string {
  const mock = emailService.sendPasswordResetEmail as unknown as jest.Mock;
  const calls = mock.mock.calls as Array<[string, string]>;
  const last = calls[calls.length - 1];
  if (!last) throw new Error('No password reset email was captured');
  const match = last[1].match(/token=([^&]+)/);
  if (!match || !match[1]) throw new Error('No token found in password reset link');
  return match[1];
}

async function createVerifiedUser(): Promise<{ identity: Identity; cookie: string }> {
  const identity = uniqueIdentity();
  const registration = await register(identity);
  expect(registration.status).toBe(201);
  const verification = await request(app)
    .post('/api/auth/verify-email')
    .send({ token: latestVerificationToken() });
  expect(verification.status).toBe(200);
  const login = await request(app)
    .post('/api/auth/login')
    .send({ identifier: identity.email, password: identity.password });
  expect(login.status).toBe(200);
  return { identity, cookie: cookieFrom(login) };
}

describe('Auth API', () => {
  beforeAll(async () => {
    // Fresh per-IP failure counter for every run
    await pool.query('DELETE FROM login_attempts');
  });

  afterAll(async () => {
    // Sessions and verification tokens cascade; audit_logs are append-only
    await pool.query('DELETE FROM users WHERE email LIKE $1', [`u${runId}%@example.com`]);
    await closeDatabaseConnection();
  });

  // 1
  it('register with valid data -> 201', async () => {
    const res = await register(uniqueIdentity());
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty(
      'message',
      'Registration successful. Check your email to verify your account.',
    );
  });

  // 2
  it('register with weak password -> 400 VALIDATION_ERROR', async () => {
    const identity = uniqueIdentity();
    const res = await register({ ...identity, password: 'weak1!', confirmPassword: 'weak1!' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('password');
  });

  // 3
  it('register with mismatched confirmPassword -> 400', async () => {
    const identity = uniqueIdentity();
    const res = await register({ ...identity, confirmPassword: 'Different1!Pass' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('confirmPassword');
  });

  // 4
  it('duplicate email and duplicate username fail with the identical generic message', async () => {
    const identity = uniqueIdentity();
    const first = await register(identity);
    expect(first.status).toBe(201);

    const duplicateEmail = await register({ ...uniqueIdentity(), email: identity.email });
    expect(duplicateEmail.status).toBe(400);
    expect(duplicateEmail.body.error.code).toBe('REGISTRATION_FAILED');

    const duplicateUsername = await register({ ...uniqueIdentity(), username: identity.username });
    expect(duplicateUsername.status).toBe(400);
    expect(duplicateUsername.body.error.code).toBe('REGISTRATION_FAILED');

    // Identical message for both — never reveal which field clashed
    expect(duplicateEmail.body.error.message).toBe(duplicateUsername.body.error.message);
    expect(duplicateEmail.body.error.message).toBe('Registration could not be completed');
  });

  // 5
  it('stores the password as an argon2id hash', async () => {
    const identity = uniqueIdentity();
    expect((await register(identity)).status).toBe(201);
    const result = await pool.query('SELECT password_hash FROM users WHERE email = $1', [
      identity.email,
    ]);
    expect(result.rows[0]?.password_hash).toMatch(/^\$argon2id\$/);
  });

  // 6
  it('login before verification -> 403 EMAIL_NOT_VERIFIED', async () => {
    const identity = uniqueIdentity();
    expect((await register(identity)).status).toBe(201);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: identity.email, password: identity.password });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  // 7
  it('verify-email with valid token -> 200; reusing the token -> 400', async () => {
    const identity = uniqueIdentity();
    expect((await register(identity)).status).toBe(201);
    const token = latestVerificationToken();

    const first = await request(app).post('/api/auth/verify-email').send({ token });
    expect(first.status).toBe(200);
    expect(first.body).toHaveProperty('success', true);

    const reuse = await request(app).post('/api/auth/verify-email').send({ token });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  // 8
  it('verify-email with garbage token -> 400', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'garbagetokengarbagetokengarbage' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  // 9
  it('login with email after verification -> 200 with HttpOnly, SameSite=Lax cookie', async () => {
    const identity = uniqueIdentity();
    expect((await register(identity)).status).toBe(201);
    const verify = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: latestVerificationToken() });
    expect(verify.status).toBe(200);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: identity.email, password: identity.password });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      email: identity.email,
      role: 'registered',
      status: 'active',
    });
    const setCookie = res.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie ?? '');
    expect(cookieHeader).toContain('sid=');
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('SameSite=Lax');
  });

  // 10
  it('login with USERNAME in a different letter case -> 200', async () => {
    const identity = uniqueIdentity();
    expect((await register(identity)).status).toBe(201);
    const verify = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: latestVerificationToken() });
    expect(verify.status).toBe(200);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: identity.username.toUpperCase(), password: identity.password });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toHaveProperty('username', identity.username);
  });

  // 11
  it('GET /me with the cookie -> 200; without cookie -> 401', async () => {
    const { identity, cookie } = await createVerifiedUser();

    const withCookie = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(withCookie.status).toBe(200);
    expect(withCookie.body.data.user).toMatchObject({
      email: identity.email,
      emailVerified: true,
    });
    expect(typeof withCookie.body.data.user.fingerprintPublic).toBe('boolean');
    expect(typeof withCookie.body.data.user.emailPublic).toBe('boolean');

    const withoutCookie = await request(app).get('/api/auth/me');
    expect(withoutCookie.status).toBe(401);
    expect(withoutCookie.body.error.code).toBe('UNAUTHENTICATED');
  });

  // 12
  it('wrong password -> 401 with the same message as an unknown user', async () => {
    const identity = uniqueIdentity();
    expect((await register(identity)).status).toBe(201);

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ identifier: identity.email, password: 'NotThePassword1!' });
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');

    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ identifier: `ghost_${runId}@example.com`, password: 'NotThePassword1!' });
    expect(unknownUser.status).toBe(401);
    expect(unknownUser.body.error.code).toBe('INVALID_CREDENTIALS');

    expect(wrongPassword.body.error.message).toBe(unknownUser.body.error.message);
    expect(wrongPassword.body.error.message).toBe('Invalid credentials');
  });

  // 13
  it('5 wrong passwords then the correct one -> 423 ACCOUNT_LOCKED', async () => {
    const identity = uniqueIdentity();
    expect((await register(identity)).status).toBe(201);
    // Isolate this test from earlier failures (per-IP limiter runs first)
    await pool.query('DELETE FROM login_attempts');

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: identity.email, password: 'WrongPassword1!' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    }

    // Keep the per-IP rate limit from masking the account-lock assertion
    await pool.query('DELETE FROM login_attempts');
    const locked = await request(app)
      .post('/api/auth/login')
      .send({ identifier: identity.email, password: identity.password });
    expect(locked.status).toBe(423);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');
    // Leave the failure counter clean for the remaining tests
    await pool.query('DELETE FROM login_attempts');
  });

  // 14
  it('logout -> 200, then GET /me with the old cookie -> 401', async () => {
    const { cookie } = await createVerifiedUser();

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(200);
    expect(logout.body).toHaveProperty('success', true);

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe('UNAUTHENTICATED');
  });

  // 15
  it('logout-all kills a second session created earlier for the same user', async () => {
    const { identity, cookie: cookie1 } = await createVerifiedUser();

    const secondLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: identity.email, password: identity.password });
    expect(secondLogin.status).toBe(200);
    const cookie2 = cookieFrom(secondLogin);

    // Second session works before logout-all
    const before = await request(app).get('/api/auth/me').set('Cookie', cookie2);
    expect(before.status).toBe(200);

    const logoutAll = await request(app).post('/api/auth/logout-all').set('Cookie', cookie1);
    expect(logoutAll.status).toBe(200);

    const after = await request(app).get('/api/auth/me').set('Cookie', cookie2);
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe('UNAUTHENTICATED');
  });

  // 16
  it('resend-verification for unknown email -> 200 same body as for a real one', async () => {
    const unknown = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: `ghost_${runId}@example.com` });
    expect(unknown.status).toBe(200);

    const identity = uniqueIdentity();
    expect((await register(identity)).status).toBe(201);
    const real = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: identity.email });
    expect(real.status).toBe(200);

    expect(real.body).toEqual(unknown.body);
    expect(real.body).toHaveProperty('success', true);
  });

  // 17
  it('forgot-password for unknown email -> 200 same body as for a real one', async () => {
    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: `ghost_${runId}@example.com` });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toHaveProperty('success', true);

    const identity = uniqueIdentity();
    expect((await register(identity)).status).toBe(201);
    const real = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: identity.email });
    expect(real.status).toBe(200);

    expect(real.body).toEqual(unknown.body);
  });

  // 18
  it('reset-password with a valid token -> new password works and the old one fails', async () => {
    const { identity } = await createVerifiedUser();
    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: identity.email });
    expect(forgot.status).toBe(200);

    const newPassword = 'N3w!Passw0rdLong';
    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: latestResetToken(), newPassword });
    expect(reset.status).toBe(200);
    expect(reset.body).toHaveProperty('success', true);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: identity.email, password: identity.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: identity.email, password: newPassword });
    expect(newLogin.status).toBe(200);
  });

  // 19
  it('reset token cannot be reused', async () => {
    const { identity } = await createVerifiedUser();
    await request(app).post('/api/auth/forgot-password').send({ email: identity.email });
    const token = latestResetToken();

    const first = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'N3w!Passw0rdLong' });
    expect(first.status).toBe(200);

    const reuse = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'An0ther!Passw0rd' });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  // 20
  it('expired reset token -> 400', async () => {
    const { identity } = await createVerifiedUser();
    await request(app).post('/api/auth/forgot-password').send({ email: identity.email });
    const token = latestResetToken();

    await pool.query(
      `UPDATE password_reset_tokens SET expires_at = now() - interval '1 minute'
       WHERE used_at IS NULL AND user_id = (SELECT id FROM users WHERE email = $1)`,
      [identity.email],
    );

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'N3w!Passw0rdLong' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  // 21
  it('reset-password with a weak password -> 400 VALIDATION_ERROR', async () => {
    const { identity } = await createVerifiedUser();
    await request(app).post('/api/auth/forgot-password').send({ email: identity.email });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: latestResetToken(), newPassword: 'weak1!' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('newPassword');
  });

  // 22
  it('reset-password revokes every existing session for the user', async () => {
    const { identity, cookie: cookie1 } = await createVerifiedUser();
    const secondLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: identity.email, password: identity.password });
    expect(secondLogin.status).toBe(200);
    const cookie2 = cookieFrom(secondLogin);

    await request(app).post('/api/auth/forgot-password').send({ email: identity.email });
    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: latestResetToken(), newPassword: 'N3w!Passw0rdLong' });
    expect(reset.status).toBe(200);

    const firstSession = await request(app).get('/api/auth/me').set('Cookie', cookie1);
    expect(firstSession.status).toBe(401);
    const secondSession = await request(app).get('/api/auth/me').set('Cookie', cookie2);
    expect(secondSession.status).toBe(401);
  });

  // 23
  it('resend-verification is throttled to once per 5 minutes per user', async () => {
    const identity = uniqueIdentity();
    expect((await register(identity)).status).toBe(201);

    const mock = emailService.sendVerificationEmail as unknown as jest.Mock;
    const before = mock.mock.calls.length;

    const throttled = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: identity.email });
    expect(throttled.status).toBe(200);
    expect(mock.mock.calls.length).toBe(before);

    // Move the latest token outside the 5-minute window
    await pool.query(
      `UPDATE email_verification_tokens SET created_at = now() - interval '6 minutes'
       WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
      [identity.email],
    );

    const allowed = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: identity.email });
    expect(allowed.status).toBe(200);
    expect(mock.mock.calls.length).toBe(before + 1);
  });

  // 24
  it("requireRole('moderator') returns 403 for a registered user", async () => {
    // Temporary test-only app (mounted in this file, not in the server app)
    const guardApp = express();
    guardApp.use(cookieParser());
    guardApp.use(attachSession);
    guardApp.get(
      '/guard',
      requireAuth,
      requireRole('moderator'),
      (_req, res) => {
        res.status(200).json({ success: true, data: { ok: true } });
      },
    );
    guardApp.use(errorHandler);

    const { cookie } = await createVerifiedUser();
    const res = await request(guardApp).get('/guard').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
