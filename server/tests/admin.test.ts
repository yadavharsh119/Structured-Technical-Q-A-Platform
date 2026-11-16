import request from 'supertest';
import { createApp } from '../src/app';
import { closeDatabaseConnection, pool } from '../src/config/database';
import { emailService } from '../src/services/emailService';

jest.mock('../src/services/emailService', () => ({
  emailService: {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendAccountActionEmail: jest.fn(),
  },
}));

const app = createApp();
const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
let seq = 0;
let categoryId = '';

interface Identity {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface TestUser {
  identity: Identity;
  cookie: string;
  userId: string;
}

const createdUsers: TestUser[] = [];

function uniqueIdentity(): Identity {
  seq += 1;
  const password = 'Str0ng!Passw0rd';
  const username = `ad${runId}${seq}`.slice(0, 30);
  return {
    fullName: `Admin Test ${seq}`,
    username,
    email: `${username}@example.com`,
    password,
    confirmPassword: password,
  };
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

async function createVerifiedUser(
  role: 'registered' | 'moderator' | 'admin' = 'registered',
): Promise<TestUser> {
  const identity = uniqueIdentity();
  const registration = await request(app).post('/api/auth/register').send(identity);
  expect(registration.status).toBe(201);
  const verification = await request(app)
    .post('/api/auth/verify-email')
    .send({ token: latestVerificationToken() });
  expect(verification.status).toBe(200);
  const login = await request(app)
    .post('/api/auth/login')
    .send({ identifier: identity.email, password: identity.password });
  expect(login.status).toBe(200);
  const userId = login.body.data.user.id as string;
  if (role !== 'registered') {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
  }
  const user = { identity, cookie: cookieFrom(login), userId };
  createdUsers.push(user);
  return user;
}

function questionPayload() {
  return {
    title: `Admin moderation question ${runId}`,
    description: 'Used to verify contribution write guards.',
    categoryId,
    tagIds: [],
  };
}

function submitQuestion(cookie: string) {
  return request(app).post('/api/questions').set('Cookie', cookie).send(questionPayload());
}

describe('Admin user management and audit log API', () => {
  let admin: TestUser;
  let admin2: TestUser;
  let moderator: TestUser;
  let roleTarget: TestUser;
  let warnTarget: TestUser;
  let suspendTarget: TestUser;
  let banTarget: TestUser;

  beforeAll(async () => {
    const category = await pool.query("SELECT id FROM categories WHERE name = 'Debugging'");
    categoryId = category.rows[0].id as string;

    admin = await createVerifiedUser('admin');
    admin2 = await createVerifiedUser('admin');
    moderator = await createVerifiedUser('moderator');
    roleTarget = await createVerifiedUser();
    warnTarget = await createVerifiedUser();
    suspendTarget = await createVerifiedUser();
    banTarget = await createVerifiedUser();
  });

  afterAll(async () => {
    const ids = createdUsers.map((user) => user.userId);
    await pool.query(
      'DELETE FROM user_warnings WHERE user_id = ANY($1::uuid[]) OR issued_by = ANY($1::uuid[])',
      [ids],
    );
    await pool.query(
      'DELETE FROM user_actions WHERE user_id = ANY($1::uuid[]) OR admin_id = ANY($1::uuid[])',
      [ids],
    );
    await pool.query('DELETE FROM questions WHERE author_id = ANY($1::uuid[])', [ids]);
    await pool.query('DELETE FROM reports WHERE reporter_id = ANY($1::uuid[])', [ids]);
    await pool.query('DELETE FROM perspective_votes WHERE user_id = ANY($1::uuid[])', [ids]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [ids]);
    await closeDatabaseConnection();
  });

  it('rejects non-admin access with 403', async () => {
    const list = await request(app).get('/api/admin/users').set('Cookie', moderator.cookie);
    expect(list.status).toBe(403);
    expect(list.body.error.code).toBe('FORBIDDEN');

    const patch = await request(app)
      .patch(`/api/admin/users/${roleTarget.userId}/role`)
      .set('Cookie', moderator.cookie)
      .send({ role: 'moderator' });
    expect(patch.status).toBe(403);

    const logs = await request(app)
      .get('/api/admin/audit-logs')
      .set('Cookie', moderator.cookie);
    expect(logs.status).toBe(403);
  });

  it('lists users with search and changes a role', async () => {
    const list = await request(app)
      .get(`/api/admin/users?q=${roleTarget.identity.username}&role=registered&status=active&page=1`)
      .set('Cookie', admin.cookie);
    expect(list.status).toBe(200);
    expect(list.body.data.perPage).toBe(20);
    expect(
      list.body.data.users.some((user: { id: string }) => user.id === roleTarget.userId),
    ).toBe(true);

    const changed = await request(app)
      .patch(`/api/admin/users/${roleTarget.userId}/role`)
      .set('Cookie', admin.cookie)
      .send({ role: 'moderator' });
    expect(changed.status).toBe(200);
    expect(changed.body.data.user.role).toBe('moderator');

    const row = await pool.query('SELECT role FROM users WHERE id = $1', [roleTarget.userId]);
    expect(row.rows[0].role).toBe('moderator');
  });

  it('blocks an admin from changing their own role', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${admin.userId}/role`)
      .set('Cookie', admin.cookie)
      .send({ role: 'registered' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SELF_ROLE_CHANGE');
  });

  it('blocks actions against self and other admins', async () => {
    const self = await request(app)
      .post(`/api/admin/users/${admin.userId}/actions`)
      .set('Cookie', admin.cookie)
      .send({ action: 'warn', reason: 'self check' });
    expect(self.status).toBe(403);
    expect(self.body.error.code).toBe('SELF_ACTION');

    const otherAdmin = await request(app)
      .post(`/api/admin/users/${admin2.userId}/actions`)
      .set('Cookie', admin.cookie)
      .send({ action: 'ban', reason: 'other admin check' });
    expect(otherAdmin.status).toBe(403);
    expect(otherAdmin.body.error.code).toBe('ADMIN_TARGET');
  });

  it('requires a reason for every action', async () => {
    const res = await request(app)
      .post(`/api/admin/users/${warnTarget.userId}/actions`)
      .set('Cookie', admin.cookie)
      .send({ action: 'warn' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('warns a user and stores the warning', async () => {
    const res = await request(app)
      .post(`/api/admin/users/${warnTarget.userId}/actions`)
      .set('Cookie', admin.cookie)
      .send({ action: 'warn', reason: 'Off-topic posting' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(warnTarget.userId);

    const warning = await pool.query('SELECT reason FROM user_warnings WHERE user_id = $1', [
      warnTarget.userId,
    ]);
    expect(warning.rowCount).toBe(1);
    expect(warning.rows[0].reason).toBe('Off-topic posting');
  });

  it('suspends a user and blocks posting and voting', async () => {
    const res = await request(app)
      .post(`/api/admin/users/${suspendTarget.userId}/actions`)
      .set('Cookie', admin.cookie)
      .send({ action: 'suspend', reason: 'Repeated abuse', durationDays: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.user.status).toBe('suspended');
    expect(res.body.data.user.suspendedUntil).toBeTruthy();

    const question = await submitQuestion(suspendTarget.cookie);
    expect(question.status).toBe(403);
    expect(question.body.error.code).toBe('ACCOUNT_SUSPENDED');

    const vote = await request(app)
      .post('/api/perspectives/00000000-0000-4000-8000-000000000000/upvote')
      .set('Cookie', suspendTarget.cookie);
    expect(vote.status).toBe(403);
    expect(vote.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('lets an expired suspension post again automatically', async () => {
    await pool.query(
      "UPDATE users SET suspended_until = now() - interval '1 minute' WHERE id = $1",
      [suspendTarget.userId],
    );

    const question = await submitQuestion(suspendTarget.cookie);
    expect(question.status).toBe(201);

    const row = await pool.query('SELECT status FROM users WHERE id = $1', [
      suspendTarget.userId,
    ]);
    expect(row.rows[0].status).toBe('active');
  });

  it('bans, blocks posting, then restores access', async () => {
    const banned = await request(app)
      .post(`/api/admin/users/${banTarget.userId}/actions`)
      .set('Cookie', admin.cookie)
      .send({ action: 'ban', reason: 'Severe abuse' });
    expect(banned.status).toBe(200);
    expect(banned.body.data.user.status).toBe('banned');

    const blocked = await submitQuestion(banTarget.cookie);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('ACCOUNT_BANNED');

    const restored = await request(app)
      .post(`/api/admin/users/${banTarget.userId}/actions`)
      .set('Cookie', admin.cookie)
      .send({ action: 'restore', reason: 'Appeal accepted' });
    expect(restored.status).toBe(200);
    expect(restored.body.data.user.status).toBe('active');

    const allowed = await submitQuestion(banTarget.cookie);
    expect(allowed.status).toBe(201);
  });

  it('emails the affected user for warn/suspend/ban/restore', () => {
    const mock = emailService.sendAccountActionEmail as unknown as jest.Mock;
    const actions = mock.mock.calls.map((call) => call[1] as string);
    expect(actions).toEqual(expect.arrayContaining(['warn', 'suspend', 'ban', 'restore']));
  });

  it('writes success and failure entries to the audit log', async () => {
    const warnLogs = await request(app)
      .get('/api/admin/audit-logs?action=admin.user_warn&page=1')
      .set('Cookie', admin.cookie);
    expect(warnLogs.status).toBe(200);
    expect(warnLogs.body.data.logs.length).toBeGreaterThanOrEqual(2);
    const results = warnLogs.body.data.logs.map((log: { result: string }) => log.result);
    expect(results).toContain('success');
    expect(results).toContain('failure');
    expect(
      warnLogs.body.data.logs.some(
        (log: { targetId: string }) => log.targetId === warnTarget.userId,
      ),
    ).toBe(true);

    const byActor = await request(app)
      .get(`/api/admin/audit-logs?actor=${admin.identity.username}`)
      .set('Cookie', admin.cookie);
    expect(byActor.status).toBe(200);
    expect(byActor.body.data.total).toBeGreaterThan(0);

    const byRange = await request(app)
      .get(
        '/api/admin/audit-logs?from=2000-01-01T00:00:00.000Z&to=2999-01-01T00:00:00.000Z',
      )
      .set('Cookie', admin.cookie);
    expect(byRange.status).toBe(200);
    expect(byRange.body.data.logs.length).toBeGreaterThan(0);
  });

  it('rejects UPDATE and DELETE on the audit log table', async () => {
    const row = await pool.query('SELECT id FROM audit_logs ORDER BY id DESC LIMIT 1');
    const auditId = row.rows[0].id as string;

    await expect(
      pool.query('UPDATE audit_logs SET action = action WHERE id = $1', [auditId]),
    ).rejects.toBeTruthy();
    await expect(
      pool.query('DELETE FROM audit_logs WHERE id = $1', [auditId]),
    ).rejects.toBeTruthy();
  });
});
