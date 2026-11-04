import request from 'supertest';
import { createApp } from '../src/app';
import { closeDatabaseConnection, pool } from '../src/config/database';
import { emailService } from '../src/services/emailService';
import { fingerprintService } from '../src/services/fingerprintService';

jest.mock('../src/services/emailService', () => ({
  emailService: { sendVerificationEmail: jest.fn() },
}));

const app = createApp();
const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
let seq = 0;

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

function uniqueIdentity(): Identity {
  seq += 1;
  const password = 'Str0ng!Passw0rd';
  const username = `d${runId}${seq}`.slice(0, 30);
  return {
    fullName: `Deletion Test ${seq}`,
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
  return { identity, cookie: cookieFrom(login), userId };
}

let categoryId: string;
let topicSlug: string;
let admin: TestUser;
let moderator: TestUser;

function perspectivePayload(overrides: Record<string, unknown> = {}) {
  return {
    proposedSolution: 'Use a bounded worker pool',
    explanation: 'Queue work and cap concurrency so latency stays predictable.',
    advantages: ['Predictable latency', 'Backpressure'],
    limitations: ['More moving parts'],
    codeSnippets: [],
    references: [],
    ...overrides,
  };
}

async function postPerspective(
  cookie: string,
  slug: string,
  overrides: Record<string, unknown> = {},
) {
  return request(app)
    .post(`/api/topics/${slug}/perspectives`)
    .set('Cookie', cookie)
    .send(perspectivePayload(overrides));
}

async function createTopic(title: string): Promise<string> {
  const author = await createVerifiedUser();
  const question = await request(app).post('/api/questions').set('Cookie', author.cookie).send({
    title: `Question for ${title}`,
    description: 'Topic scaffold question for deletion-request tests.',
    categoryId,
    techStack: 'Node.js 22',
    tagIds: [],
  });
  expect(question.status).toBe(201);
  const approve = await request(app)
    .post(`/api/questions/${question.body.data.question.id}/approve`)
    .set('Cookie', admin.cookie)
    .send({
      createTopic: {
        title,
        description: 'Topic used by deletion-request tests.',
        categoryId,
        tagIds: [],
      },
    });
  expect(approve.status).toBe(200);
  return approve.body.data.topic.slug as string;
}

async function createPerspective(cookie: string, overrides: Record<string, unknown> = {}) {
  const res = await postPerspective(cookie, topicSlug, overrides);
  expect(res.status).toBe(201);
  return res.body.data.perspective.id as string;
}

function requestDeletion(cookie: string, perspectiveId: string, reason: unknown) {
  return request(app)
    .post(`/api/perspectives/${perspectiveId}/deletion-requests`)
    .set('Cookie', cookie)
    .send(reason === undefined ? {} : { reason });
}

describe('Perspective deletion requests and admin removal', () => {
  beforeAll(async () => {
    const category = await pool.query("SELECT id FROM categories WHERE name = 'Debugging'");
    categoryId = category.rows[0].id;
    admin = await createVerifiedUser('admin');
    moderator = await createVerifiedUser('moderator');
    topicSlug = await createTopic(`Deletion Flow ${runId}`);
  });

  afterAll(async () => {
    const emailPattern = [`d${runId}%@example.com`];
    await pool.query(
      'DELETE FROM deletion_requests WHERE requester_id IN (SELECT id FROM users WHERE email LIKE $1)',
      emailPattern,
    );
    await pool.query(
      'DELETE FROM perspective_deletion_requests WHERE requested_by IN (SELECT id FROM users WHERE email LIKE $1)',
      emailPattern,
    );
    await pool.query(
      'DELETE FROM perspective_votes WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)',
      emailPattern,
    );
    await pool.query(
      'DELETE FROM perspectives WHERE author_id IN (SELECT id FROM users WHERE email LIKE $1)',
      emailPattern,
    );
    await pool.query(
      'DELETE FROM questions WHERE author_id IN (SELECT id FROM users WHERE email LIKE $1)',
      emailPattern,
    );
    await pool.query(
      'DELETE FROM topics WHERE created_by IN (SELECT id FROM users WHERE email LIKE $1)',
      emailPattern,
    );
    await pool.query(
      'DELETE FROM expert_fingerprints WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)',
      emailPattern,
    );
    await pool.query('DELETE FROM users WHERE email LIKE $1', emailPattern);
    await closeDatabaseConnection();
  });

  it('allows the author to request deletion with a reason', async () => {
    const author = await createVerifiedUser();
    const perspectiveId = await createPerspective(author.cookie);

    const res = await requestDeletion(author.cookie, perspectiveId, 'I no longer stand by this.');

    expect(res.status).toBe(201);
    expect(res.body.data.deletionRequest.status).toBe('pending');
    expect(res.body.data.deletionRequest.reason).toBe('I no longer stand by this.');
    expect(res.body.data.deletionRequest.requester).toEqual({
      id: author.userId,
      username: author.identity.username,
    });
  });

  it('blocks a non-author from requesting deletion', async () => {
    const author = await createVerifiedUser();
    const other = await createVerifiedUser();
    const perspectiveId = await createPerspective(author.cookie);

    const res = await requestDeletion(other.cookie, perspectiveId, 'Not mine.');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('requires a non-empty reason', async () => {
    const author = await createVerifiedUser();
    const perspectiveId = await createPerspective(author.cookie);

    const missing = await requestDeletion(author.cookie, perspectiveId, undefined);
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('VALIDATION_ERROR');

    const blank = await requestDeletion(author.cookie, perspectiveId, '   ');
    expect(blank.status).toBe(400);
    expect(blank.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('blocks a second pending request for the same perspective', async () => {
    const author = await createVerifiedUser();
    const perspectiveId = await createPerspective(author.cookie);

    const first = await requestDeletion(author.cookie, perspectiveId, 'First request.');
    expect(first.status).toBe(201);

    const second = await requestDeletion(author.cookie, perspectiveId, 'Second request.');
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('DELETION_REQUEST_PENDING');
  });

  it('keeps the perspective visible while the request is pending', async () => {
    const author = await createVerifiedUser();
    const perspectiveId = await createPerspective(author.cookie);
    await requestDeletion(author.cookie, perspectiveId, 'Pending review.');

    const list = await request(app).get(`/api/topics/${topicSlug}/perspectives`);
    expect(list.status).toBe(200);
    expect(
      list.body.data.perspectives.some((p: { id: string }) => p.id === perspectiveId),
    ).toBe(true);
    const found = list.body.data.perspectives.find(
      (p: { id: string }) => p.id === perspectiveId,
    );
    expect(found.deletionRequestPending).toBe(true);
  });

  it('approving a request hides the perspective from lists, search and stats', async () => {
    const author = await createVerifiedUser();
    const voter = await createVerifiedUser();
    const keyword = `zzdel${runId}`;
    const perspectiveId = await createPerspective(author.cookie, {
      proposedSolution: `Streaming parser ${keyword}`,
    });

    const upvote = await request(app)
      .post(`/api/perspectives/${perspectiveId}/upvote`)
      .set('Cookie', voter.cookie);
    expect(upvote.status).toBe(200);

    const before = await request(app).get(`/api/users/${author.userId}`);
    expect(before.body.data.user.stats.perspectivesSubmitted).toBe(1);
    expect(before.body.data.user.stats.totalUpvotesReceived).toBe(1);

    const created = await requestDeletion(author.cookie, perspectiveId, 'Remove this.');
    expect(created.status).toBe(201);
    const requestId = created.body.data.deletionRequest.id as string;

    const decision = await request(app)
      .post(`/api/admin/deletion-requests/${requestId}/decision`)
      .set('Cookie', admin.cookie)
      .send({ decision: 'approve', note: 'Approved.' });
    expect(decision.status).toBe(200);
    expect(decision.body.data.deletionRequest.status).toBe('approved');
    expect(decision.body.data.deletionRequest.decidedBy.username).toBe(admin.identity.username);

    const list = await request(app).get(`/api/topics/${topicSlug}/perspectives`);
    expect(
      list.body.data.perspectives.some((p: { id: string }) => p.id === perspectiveId),
    ).toBe(false);

    const search = await request(app).get(`/api/search?q=${keyword}`);
    expect(search.status).toBe(200);
    expect(search.body.data.results).toHaveLength(0);

    const after = await request(app).get(`/api/users/${author.userId}`);
    expect(after.body.data.user.stats.perspectivesSubmitted).toBe(0);
    expect(after.body.data.user.stats.totalUpvotesReceived).toBe(0);

    await fingerprintService.recalculateUser(author.userId);
    const fingerprint = await request(app)
      .get(`/api/users/${author.userId}/fingerprint`)
      .set('Cookie', author.cookie);
    expect(fingerprint.status).toBe(200);
    expect(fingerprint.body.data.fingerprint).toHaveLength(0);

    const row = await pool.query('SELECT deleted_at FROM perspectives WHERE id = $1', [
      perspectiveId,
    ]);
    expect(row.rows[0].deleted_at).not.toBeNull();
  });

  it('rejecting a request keeps the perspective visible', async () => {
    const author = await createVerifiedUser();
    const perspectiveId = await createPerspective(author.cookie);
    const created = await requestDeletion(author.cookie, perspectiveId, 'Please remove.');
    const requestId = created.body.data.deletionRequest.id as string;

    const decision = await request(app)
      .post(`/api/admin/deletion-requests/${requestId}/decision`)
      .set('Cookie', admin.cookie)
      .send({ decision: 'reject' });
    expect(decision.status).toBe(200);
    expect(decision.body.data.deletionRequest.status).toBe('rejected');

    const list = await request(app).get(`/api/topics/${topicSlug}/perspectives`);
    expect(
      list.body.data.perspectives.some((p: { id: string }) => p.id === perspectiveId),
    ).toBe(true);
  });

  it('hard delete removes the perspective, its upvotes and leaves an audit entry', async () => {
    const author = await createVerifiedUser();
    const voter = await createVerifiedUser();
    const perspectiveId = await createPerspective(author.cookie);
    await request(app)
      .post(`/api/perspectives/${perspectiveId}/upvote`)
      .set('Cookie', voter.cookie);

    const res = await request(app)
      .delete(`/api/admin/perspectives/${perspectiveId}?hard=true`)
      .set('Cookie', admin.cookie)
      .send({ reason: 'Legal removal request.' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: perspectiveId, hard: true });

    const perspective = await pool.query('SELECT id FROM perspectives WHERE id = $1', [
      perspectiveId,
    ]);
    expect(perspective.rows).toHaveLength(0);

    const votes = await pool.query(
      'SELECT 1 FROM perspective_votes WHERE perspective_id = $1',
      [perspectiveId],
    );
    expect(votes.rows).toHaveLength(0);

    const audit = await pool.query(
      'SELECT action, metadata FROM audit_logs WHERE target_id = $1 ORDER BY id DESC LIMIT 1',
      [perspectiveId],
    );
    expect(audit.rows[0].action).toBe('perspective.admin_delete.hard');
    expect(audit.rows[0].metadata.reason).toBe('Legal removal request.');
  });

  it('requires a reason for an administrative delete', async () => {
    const author = await createVerifiedUser();
    const perspectiveId = await createPerspective(author.cookie);

    const res = await request(app)
      .delete(`/api/admin/perspectives/${perspectiveId}`)
      .set('Cookie', admin.cookie)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 403 on every admin endpoint for a moderator', async () => {
    const author = await createVerifiedUser();
    const perspectiveId = await createPerspective(author.cookie);

    const list = await request(app)
      .get('/api/admin/deletion-requests')
      .set('Cookie', moderator.cookie);
    expect(list.status).toBe(403);

    const decide = await request(app)
      .post('/api/admin/deletion-requests/11111111-1111-4111-8111-111111111111/decision')
      .set('Cookie', moderator.cookie)
      .send({ decision: 'approve' });
    expect(decide.status).toBe(403);

    const remove = await request(app)
      .delete(`/api/admin/perspectives/${perspectiveId}`)
      .set('Cookie', moderator.cookie)
      .send({ reason: 'Not allowed.' });
    expect(remove.status).toBe(403);
  });
});
