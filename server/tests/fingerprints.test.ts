import request from 'supertest';
import { createApp } from '../src/app';
import { closeDatabaseConnection, pool } from '../src/config/database';
import { emailService } from '../src/services/emailService';
import {
  fingerprintService,
  recalculateUserFingerprint,
} from '../src/services/fingerprintService';

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

function uniqueIdentity(): Identity {
  seq += 1;
  const password = 'Str0ng!Passw0rd';
  const username = `f${runId}${seq}`.slice(0, 30);
  return {
    fullName: `Fingerprint Test ${seq}`,
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

interface TestUser {
  identity: Identity;
  cookie: string;
  userId: string;
}

async function createVerifiedUser(role: 'registered' | 'moderator' = 'registered'): Promise<TestUser> {
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
  if (role === 'moderator') {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['moderator', userId]);
  }
  return { identity, cookie: cookieFrom(login), userId };
}

let moderator: TestUser;
let debuggingCategoryId: string;

interface CreatedTopic {
  id: string;
  slug: string;
}

async function createTopicInCategory(title: string, categoryId: string): Promise<CreatedTopic> {
  const author = await createVerifiedUser();
  const question = await request(app).post('/api/questions').set('Cookie', author.cookie).send({
    title: `Question for ${title}`,
    description: 'Scaffold question for fingerprint tests.',
    categoryId,
    tagIds: [],
  });
  expect(question.status).toBe(201);
  const approve = await request(app)
    .post(`/api/questions/${question.body.data.question.id}/approve`)
    .set('Cookie', moderator.cookie)
    .send({ createTopic: { title, description: 'Topic for fingerprint tests.', categoryId, tagIds: [] } });
  expect(approve.status).toBe(200);
  return { id: approve.body.data.topic.id as string, slug: approve.body.data.topic.slug as string };
}

async function addPerspective(cookie: string, slug: string, solution: string): Promise<string> {
  const res = await request(app)
    .post(`/api/topics/${slug}/perspectives`)
    .set('Cookie', cookie)
    .send({
      proposedSolution: solution,
      explanation: 'Explanation for the fingerprint test perspective.',
      advantages: ['Advantage'],
      limitations: ['Limitation'],
    });
  expect(res.status).toBe(201);
  return res.body.data.perspective.id as string;
}

function fingerprintFor(userId: string, cookie?: string) {
  const req = request(app).get(`/api/users/${userId}/fingerprint`);
  return cookie ? req.set('Cookie', cookie) : req;
}

describe('Expert fingerprint (FR-EXP-01/02)', () => {
  beforeAll(async () => {
    const category = await pool.query("SELECT id FROM categories WHERE name = 'Debugging'");
    debuggingCategoryId = category.rows[0].id;
    moderator = await createVerifiedUser('moderator');
  });

  afterAll(async () => {
    const emailPattern = `f${runId}%@example.com`;
    await pool.query(
      'DELETE FROM expert_fingerprints WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)',
      [emailPattern],
    );
    await pool.query(
      'DELETE FROM perspective_votes WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)',
      [emailPattern],
    );
    await pool.query(
      'DELETE FROM perspectives WHERE author_id IN (SELECT id FROM users WHERE email LIKE $1)',
      [emailPattern],
    );
    await pool.query(
      'DELETE FROM questions WHERE author_id IN (SELECT id FROM users WHERE email LIKE $1)',
      [emailPattern],
    );
    await pool.query(
      'DELETE FROM topics WHERE created_by IN (SELECT id FROM users WHERE email LIKE $1)',
      [emailPattern],
    );
    await pool.query('DELETE FROM users WHERE email LIKE $1', [emailPattern]);
    await closeDatabaseConnection();
  });

  it('ignores hidden perspectives', async () => {
    const author = await createVerifiedUser();
    const topic = await createTopicInCategory(`Hidden fingerprint ${runId}`, debuggingCategoryId);
    const perspectiveId = await addPerspective(author.cookie, topic.slug, 'Hidden contribution');

    await pool.query('UPDATE perspectives SET hidden = true WHERE id = $1', [perspectiveId]);
    await recalculateUserFingerprint(author.userId);

    const res = await fingerprintFor(author.userId);
    expect(res.status).toBe(200);
    expect(res.body.data.fingerprint).toEqual([]);
  });

  it('ignores perspectives on unpublished topics', async () => {
    const author = await createVerifiedUser();
    const topic = await createTopicInCategory(`Archived fingerprint ${runId}`, debuggingCategoryId);
    await addPerspective(author.cookie, topic.slug, 'Archived contribution');

    await pool.query("UPDATE topics SET status = 'archived' WHERE id = $1", [topic.id]);
    await recalculateUserFingerprint(author.userId);

    const res = await fingerprintFor(author.userId);
    expect(res.status).toBe(200);
    expect(res.body.data.fingerprint).toEqual([]);
  });

  it('hides a private fingerprint from others but lets the owner read it', async () => {
    const author = await createVerifiedUser();
    const stranger = await createVerifiedUser();
    const topic = await createTopicInCategory(`Private fingerprint ${runId}`, debuggingCategoryId);
    await addPerspective(author.cookie, topic.slug, 'Visible contribution');
    await recalculateUserFingerprint(author.userId);

    const publicRes = await fingerprintFor(author.userId);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.data.fingerprint).toHaveLength(1);
    expect(publicRes.body.data.fingerprint[0]).toMatchObject({
      category: 'Debugging',
      perspectives: 1,
      upvotes: 0,
      rank: 1,
    });

    const unauthenticated = await request(app)
      .patch('/api/users/me/fingerprint-visibility')
      .send({ public: false });
    expect(unauthenticated.status).toBe(401);

    const hidden = await request(app)
      .patch('/api/users/me/fingerprint-visibility')
      .set('Cookie', author.cookie)
      .send({ public: false });
    expect(hidden.status).toBe(200);
    expect(hidden.body.data.fingerprintPublic).toBe(false);

    expect((await fingerprintFor(author.userId)).status).toBe(404);
    expect((await fingerprintFor(author.userId, stranger.cookie)).status).toBe(404);

    const ownerRes = await fingerprintFor(author.userId, author.cookie);
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.data.fingerprint).toHaveLength(1);

    await request(app)
      .patch('/api/users/me/fingerprint-visibility')
      .set('Cookie', author.cookie)
      .send({ public: true });
  });

  it('includes the author top category on perspective responses', async () => {
    const author = await createVerifiedUser();
    const topic = await createTopicInCategory(`Label fingerprint ${runId}`, debuggingCategoryId);
    await addPerspective(author.cookie, topic.slug, 'Labelled contribution');
    await recalculateUserFingerprint(author.userId);

    const publicList = await request(app).get(`/api/topics/${topic.slug}/perspectives`);
    expect(publicList.status).toBe(200);
    expect(publicList.body.data.perspectives[0].authorTopCategory).toBe('Debugging');

    await request(app)
      .patch('/api/users/me/fingerprint-visibility')
      .set('Cookie', author.cookie)
      .send({ public: false });

    const privateList = await request(app).get(`/api/topics/${topic.slug}/perspectives`);
    expect(privateList.body.data.perspectives[0].authorTopCategory).toBeNull();
  });

  it('recalculates fingerprints for every user with eligible perspectives', async () => {
    const author = await createVerifiedUser();
    const topic = await createTopicInCategory(`Bulk fingerprint ${runId}`, debuggingCategoryId);
    await addPerspective(author.cookie, topic.slug, 'Bulk contribution');

    const users = await fingerprintService.recalculateAllUsers();
    expect(users).toBeGreaterThanOrEqual(1);

    const res = await fingerprintFor(author.userId);
    expect(res.status).toBe(200);
    expect(res.body.data.fingerprint[0]).toMatchObject({ category: 'Debugging' });
  });

  it('returns 400 for an invalid user id', async () => {
    const res = await request(app).get('/api/users/not-a-uuid/fingerprint');
    expect(res.status).toBe(400);
  });
});
