import request from 'supertest';
import { createApp } from '../src/app';
import { closeDatabaseConnection, pool } from '../src/config/database';
import { emailService } from '../src/services/emailService';

// Mock the EmailService so tests can read the raw verification token
jest.mock('../src/services/emailService', () => ({
  emailService: { sendVerificationEmail: jest.fn() },
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
  const username = `p${runId}${seq}`.slice(0, 30);
  return {
    fullName: `Perspective Test ${seq}`,
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

interface TestUser {
  identity: Identity;
  cookie: string;
  userId: string;
}

async function createVerifiedUser(role: 'registered' | 'moderator' = 'registered'): Promise<TestUser> {
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
  const userId = login.body.data.user.id as string;
  if (role === 'moderator') {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['moderator', userId]);
  }
  return { identity, cookie: cookieFrom(login), userId };
}

let categoryId: string;
let topicSlug: string;
let moderator: TestUser;

function perspectivePayload(overrides: Record<string, unknown> = {}) {
  return {
    proposedSolution: 'Stream the payload instead of buffering it',
    explanation: 'Parse JSON incrementally so large bodies never block the event loop.',
    advantages: ['Keeps the event loop responsive', 'Constant memory usage'],
    limitations: ['Streaming parsers are harder to debug'],
    codeSnippets: [{ language: 'javascript', code: 'jsonStream.parse(chunk);' }],
    references: ['https://nodejs.org/api/stream.html'],
    ...overrides,
  };
}

function postPerspective(cookie: string | null, slug: string, overrides: Record<string, unknown> = {}) {
  const req = request(app).post(`/api/topics/${slug}/perspectives`);
  return (cookie ? req.set('Cookie', cookie) : req).send(perspectivePayload(overrides));
}

// Approving a fresh question with createTopic yields a published topic
async function createTopic(title: string): Promise<string> {
  const author = await createVerifiedUser();
  const question = await request(app).post('/api/questions').set('Cookie', author.cookie).send({
    title: `Question for ${title}`,
    description: 'Topic scaffold question for perspective tests.',
    categoryId,
    techStack: 'Node.js 22',
    tagIds: [],
  });
  expect(question.status).toBe(201);
  const approve = await request(app)
    .post(`/api/questions/${question.body.data.question.id}/approve`)
    .set('Cookie', moderator.cookie)
    .send({
      createTopic: { title, description: 'Topic used by perspective tests.', categoryId, tagIds: [] },
    });
  expect(approve.status).toBe(200);
  return approve.body.data.topic.slug as string;
}

describe('Perspectives, upvotes and comparison API', () => {
  beforeAll(async () => {
    const category = await pool.query("SELECT id FROM categories WHERE name = 'Debugging'");
    categoryId = category.rows[0].id;
    moderator = await createVerifiedUser('moderator');
    topicSlug = await createTopic(`Perspective Flow ${runId}`);
  });

  afterAll(async () => {
    const emailPattern = [`p${runId}%@example.com`];
    // Order matters: votes -> perspectives -> questions -> topics -> users
    // (none of these FKs cascade)
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
    await pool.query('DELETE FROM users WHERE email LIKE $1', emailPattern);
    await closeDatabaseConnection();
  });

  // 1 - Creating perspectives
  it('POST /api/topics/:slug/perspectives as a guest returns 401', async () => {
    const res = await postPerspective(null, topicSlug);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('a verified user posts a perspective and gets 201', async () => {
    const author = await createVerifiedUser();
    const res = await postPerspective(author.cookie, topicSlug);

    expect(res.status).toBe(201);
    expect(res.body.data.perspective.authorUsername).toBe(author.identity.username);
    expect(res.body.data.perspective.proposedSolution).toBe(
      'Stream the payload instead of buffering it',
    );
    expect(res.body.data.perspective.advantages).toHaveLength(2);
    expect(res.body.data.perspective.codeSnippets).toEqual([
      { language: 'javascript', code: 'jsonStream.parse(chunk);' },
    ]);
    expect(res.body.data.perspective.references).toEqual(['https://nodejs.org/api/stream.html']);
    expect(res.body.data.perspective.upvoteCount).toBe(0);
    expect(res.body.data.perspective.hasUpvoted).toBe(false);
  });

  it('a second perspective on the same topic by the same user returns 409 PERSPECTIVE_ALREADY_EXISTS', async () => {
    const author = await createVerifiedUser();
    const first = await postPerspective(author.cookie, topicSlug);
    expect(first.status).toBe(201);

    const second = await postPerspective(author.cookie, topicSlug, {
      proposedSolution: 'A completely different approach',
    });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('PERSPECTIVE_ALREADY_EXISTS');
  });

  it('posting on an unknown topic returns 404 TOPIC_NOT_FOUND', async () => {
    const author = await createVerifiedUser();
    const res = await postPerspective(author.cookie, 'no-such-topic');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TOPIC_NOT_FOUND');
  });

  it('an invalid body returns 400 VALIDATION_ERROR', async () => {
    const author = await createVerifiedUser();
    const res = await postPerspective(author.cookie, topicSlug, { advantages: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 2 - Listing perspectives
  it('GET /api/topics/:slug/perspectives is public and includes the author, count and date', async () => {
    const author = await createVerifiedUser();
    const posted = await postPerspective(author.cookie, topicSlug);
    expect(posted.status).toBe(201);

    const res = await request(app).get(`/api/topics/${topicSlug}/perspectives`);
    expect(res.status).toBe(200);
    const found = res.body.data.perspectives.find(
      (p: { id: string }) => p.id === posted.body.data.perspective.id,
    );
    expect(found).toBeDefined();
    expect(found.authorUsername).toBe(author.identity.username);
    expect(found.upvoteCount).toBe(0);
    expect(found.hasUpvoted).toBe(false);
    expect(found.createdAt).toBeDefined();
  });

  it('sort=top orders perspectives by upvote count', async () => {
    const slug = await createTopic(`Top sort ${runId}`);
    const firstAuthor = await createVerifiedUser();
    const secondAuthor = await createVerifiedUser();
    const voterA = await createVerifiedUser();
    const voterB = await createVerifiedUser();
    const voterC = await createVerifiedUser();

    const first = await postPerspective(firstAuthor.cookie, slug);
    const second = await postPerspective(secondAuthor.cookie, slug);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    // first gets 2 upvotes, second gets 1
    await request(app)
      .post(`/api/perspectives/${first.body.data.perspective.id}/upvote`)
      .set('Cookie', voterA.cookie);
    await request(app)
      .post(`/api/perspectives/${first.body.data.perspective.id}/upvote`)
      .set('Cookie', voterB.cookie);
    await request(app)
      .post(`/api/perspectives/${second.body.data.perspective.id}/upvote`)
      .set('Cookie', voterC.cookie);

    const res = await request(app).get(`/api/topics/${slug}/perspectives?sort=top`);
    expect(res.status).toBe(200);
    expect(res.body.data.perspectives).toHaveLength(2);
    expect(res.body.data.perspectives[0].id).toBe(first.body.data.perspective.id);
    expect(res.body.data.perspectives[0].upvoteCount).toBe(2);
    expect(res.body.data.perspectives[1].upvoteCount).toBe(1);
  });

  // 3 - Upvotes
  it('guests cannot upvote', async () => {
    const author = await createVerifiedUser();
    const posted = await postPerspective(author.cookie, topicSlug);
    expect(posted.status).toBe(201);

    const res = await request(app).post(
      `/api/perspectives/${posted.body.data.perspective.id}/upvote`,
    );
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('the author cannot upvote their own perspective (CANNOT_VOTE_OWN)', async () => {
    const author = await createVerifiedUser();
    const posted = await postPerspective(author.cookie, topicSlug);
    expect(posted.status).toBe(201);

    const res = await request(app)
      .post(`/api/perspectives/${posted.body.data.perspective.id}/upvote`)
      .set('Cookie', author.cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CANNOT_VOTE_OWN');
  });

  it('upvoting an unknown perspective returns 404 PERSPECTIVE_NOT_FOUND', async () => {
    const voter = await createVerifiedUser();
    const res = await request(app)
      .post('/api/perspectives/99999999-9999-4999-8999-999999999999/upvote')
      .set('Cookie', voter.cookie);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PERSPECTIVE_NOT_FOUND');
  });

  it('upvote toggles on and off, updating the count and hasUpvoted', async () => {
    const author = await createVerifiedUser();
    const voter = await createVerifiedUser();
    const posted = await postPerspective(author.cookie, topicSlug);
    expect(posted.status).toBe(201);
    const id = posted.body.data.perspective.id as string;

    const on = await request(app).post(`/api/perspectives/${id}/upvote`).set('Cookie', voter.cookie);
    expect(on.status).toBe(200);
    expect(on.body.data).toEqual({ upvoteCount: 1, hasUpvoted: true });

    // The voter sees hasUpvoted in the public list
    const listVoter = await request(app)
      .get(`/api/topics/${topicSlug}/perspectives`)
      .set('Cookie', voter.cookie);
    const asVoter = listVoter.body.data.perspectives.find((p: { id: string }) => p.id === id);
    expect(asVoter.hasUpvoted).toBe(true);

    // Someone else still sees it as not upvoted
    const other = await createVerifiedUser();
    const listOther = await request(app)
      .get(`/api/topics/${topicSlug}/perspectives`)
      .set('Cookie', other.cookie);
    const asOther = listOther.body.data.perspectives.find((p: { id: string }) => p.id === id);
    expect(asOther.hasUpvoted).toBe(false);

    const off = await request(app).post(`/api/perspectives/${id}/upvote`).set('Cookie', voter.cookie);
    expect(off.status).toBe(200);
    expect(off.body.data).toEqual({ upvoteCount: 0, hasUpvoted: false });
  });

  // 4 - Comparison
  it('compares two perspectives of the same topic with scores and authors', async () => {
    const firstAuthor = await createVerifiedUser();
    const secondAuthor = await createVerifiedUser();
    const voter = await createVerifiedUser();

    const first = await postPerspective(firstAuthor.cookie, topicSlug);
    const second = await postPerspective(secondAuthor.cookie, topicSlug, {
      proposedSolution: 'Use a streaming JSON parser library',
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    await request(app)
      .post(`/api/perspectives/${first.body.data.perspective.id}/upvote`)
      .set('Cookie', voter.cookie);

    const res = await request(app).get(
      `/api/topics/${topicSlug}/compare?ids=${first.body.data.perspective.id},${second.body.data.perspective.id}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.perspectives).toHaveLength(2);
    expect(res.body.data.perspectives[0].authorUsername).toBe(firstAuthor.identity.username);
    expect(res.body.data.perspectives[0].upvoteCount).toBe(1);
    expect(res.body.data.perspectives[0].proposedSolution).toBeDefined();
    expect(res.body.data.perspectives[0].advantages).toBeDefined();
    expect(res.body.data.perspectives[0].limitations).toBeDefined();
    expect(res.body.data.perspectives[0].codeSnippets).toBeDefined();
    expect(res.body.data.perspectives[0].createdAt).toBeDefined();
  });

  it('comparing with fewer than two ids returns INVALID_COMPARISON', async () => {
    const author = await createVerifiedUser();
    const posted = await postPerspective(author.cookie, topicSlug);
    expect(posted.status).toBe(201);

    const res = await request(app).get(
      `/api/topics/${topicSlug}/compare?ids=${posted.body.data.perspective.id}`,
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_COMPARISON');
  });

  it('comparing with more than three ids returns INVALID_COMPARISON', async () => {
    const res = await request(app).get(
      `/api/topics/${topicSlug}/compare?ids=11111111-1111-4111-8111-111111111111,22222222-2222-4222-8222-222222222222,33333333-3333-4333-8333-333333333333,44444444-4444-4444-8444-444444444444`,
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_COMPARISON');
  });

  it('comparing ids from a different topic returns INVALID_COMPARISON', async () => {
    const otherSlug = await createTopic(`Other Topic ${runId}`);
    const author = await createVerifiedUser();
    const posted = await postPerspective(author.cookie, otherSlug);
    expect(posted.status).toBe(201);

    const res = await request(app).get(
      `/api/topics/${topicSlug}/compare?ids=${posted.body.data.perspective.id},11111111-1111-4111-8111-111111111111`,
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_COMPARISON');
  });

  it('comparing on an unknown topic returns 404 TOPIC_NOT_FOUND', async () => {
    const res = await request(app).get(
      '/api/topics/no-such-topic/compare?ids=11111111-1111-4111-8111-111111111111,22222222-2222-4222-8222-222222222222',
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TOPIC_NOT_FOUND');
  });
});
