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
  const username = `q${runId}${seq}`.slice(0, 30);
  return {
    fullName: `Question Test ${seq}`,
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
let tagIds: string[] = [];

function questionPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Why does my Node.js event loop block on JSON.parse?',
    description: 'Large payloads make the server unresponsive. How should I profile this?',
    categoryId,
    techStack: 'Node.js 22, Express 4',
    tagIds: tagIds.slice(0, 2),
    ...overrides,
  };
}

async function submitQuestion(cookie: string, overrides: Record<string, unknown> = {}) {
  return request(app).post('/api/questions').set('Cookie', cookie).send(questionPayload(overrides));
}

describe('Questions and review queue API', () => {
  beforeAll(async () => {
    const category = await pool.query("SELECT id FROM categories WHERE name = 'Debugging'");
    categoryId = category.rows[0].id;
    const tags = await pool.query('SELECT id FROM tags ORDER BY name LIMIT 3');
    tagIds = tags.rows.map((row: { id: string }) => row.id);
  });

  afterAll(async () => {
    const emailPattern = [`q${runId}%@example.com`];
    // Order matters: questions reference topics, topics reference users
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

  // 1 - Public taxonomy
  it('GET /api/categories is public and returns the seeded categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const names = res.body.data.categories.map((category: { name: string }) => category.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'Debugging',
        'System Design',
        'Technology Comparison',
        'Security',
        'Performance',
      ]),
    );
  });

  it('GET /api/tags is public and returns the seeded tags', async () => {
    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tags.length).toBeGreaterThanOrEqual(15);
  });

  // 2 - Question submission permissions
  it('POST /api/questions as a guest returns 401', async () => {
    const res = await request(app).post('/api/questions').send(questionPayload());
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('POST /api/questions with invalid body returns 400 VALIDATION_ERROR', async () => {
    const user = await createVerifiedUser();
    const res = await submitQuestion(user.cookie, { title: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/questions with an unknown category returns 400 VALIDATION_ERROR', async () => {
    const user = await createVerifiedUser();
    const res = await submitQuestion(user.cookie, {
      categoryId: '99999999-9999-4999-8999-999999999999',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('Category not found');
  });

  it('POST /api/questions with an unknown tag returns 400 VALIDATION_ERROR', async () => {
    const user = await createVerifiedUser();
    const res = await submitQuestion(user.cookie, {
      tagIds: ['88888888-8888-4888-8888-888888888888'],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('tags do not exist');
  });

  it('POST /api/questions with more than 5 tags returns 400 VALIDATION_ERROR', async () => {
    const user = await createVerifiedUser();
    const manyTags = await pool.query('SELECT id FROM tags ORDER BY name LIMIT 6');
    const res = await submitQuestion(user.cookie, {
      tagIds: manyTags.rows.map((row: { id: string }) => row.id),
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/questions creates a pending question with tags', async () => {
    const user = await createVerifiedUser();
    const res = await submitQuestion(user.cookie);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.question.status).toBe('pending');
    expect(res.body.data.question.techStack).toBe('Node.js 22, Express 4');
    expect(res.body.data.question.tags).toHaveLength(2);
  });

  // 3 - Own questions
  it('GET /api/questions/mine returns only the caller questions with status', async () => {
    const user = await createVerifiedUser();
    await submitQuestion(user.cookie);
    await submitQuestion(user.cookie, { title: 'Second question about profiling' });

    const res = await request(app).get('/api/questions/mine').set('Cookie', user.cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.questions).toHaveLength(2);
    expect(res.body.data.questions.every((q: { status: string }) => q.status === 'pending')).toBe(true);
  });

  it('GET /api/questions/mine as a guest returns 401', async () => {
    const res = await request(app).get('/api/questions/mine');
    expect(res.status).toBe(401);
  });

  // 4 - Owner edit/delete while pending
  it('PATCH /api/questions/:id lets the owner edit a pending question', async () => {
    const user = await createVerifiedUser();
    const created = await submitQuestion(user.cookie);
    const questionId = created.body.data.question.id;

    const res = await request(app)
      .patch(`/api/questions/${questionId}`)
      .set('Cookie', user.cookie)
      .send({ title: 'Updated title', tagIds: [tagIds[0]] });
    expect(res.status).toBe(200);
    expect(res.body.data.question.title).toBe('Updated title');
    expect(res.body.data.question.tags).toHaveLength(1);
  });

  it('PATCH /api/questions/:id by a non-owner returns 403 FORBIDDEN', async () => {
    const owner = await createVerifiedUser();
    const intruder = await createVerifiedUser();
    const created = await submitQuestion(owner.cookie);
    const questionId = created.body.data.question.id;

    const res = await request(app)
      .patch(`/api/questions/${questionId}`)
      .set('Cookie', intruder.cookie)
      .send({ title: 'Hostile edit' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('PATCH and DELETE on an approved question return 409 QUESTION_NOT_PENDING', async () => {
    const user = await createVerifiedUser();
    const moderator = await createVerifiedUser('moderator');
    const created = await submitQuestion(user.cookie);
    const questionId = created.body.data.question.id;

    const approve = await request(app)
      .post(`/api/questions/${questionId}/approve`)
      .set('Cookie', moderator.cookie)
      .send({
        createTopic: {
          title: `Patch guard ${runId}`,
          description: 'Topic created to test the patch guard',
          categoryId,
          tagIds: [tagIds[0]],
        },
      });
    expect(approve.status).toBe(200);

    const patch = await request(app)
      .patch(`/api/questions/${questionId}`)
      .set('Cookie', user.cookie)
      .send({ title: 'Too late' });
    expect(patch.status).toBe(409);
    expect(patch.body.error.code).toBe('QUESTION_NOT_PENDING');

    const del = await request(app)
      .delete(`/api/questions/${questionId}`)
      .set('Cookie', user.cookie);
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe('QUESTION_NOT_PENDING');
  });

  it('DELETE /api/questions/:id lets the owner delete a pending question', async () => {
    const user = await createVerifiedUser();
    const created = await submitQuestion(user.cookie);
    const questionId = created.body.data.question.id;

    const del = await request(app).delete(`/api/questions/${questionId}`).set('Cookie', user.cookie);
    expect(del.status).toBe(200);
    expect(del.body.data.message).toBe('Question deleted.');

    const mine = await request(app).get('/api/questions/mine').set('Cookie', user.cookie);
    expect(mine.body.data.questions).toHaveLength(0);
  });

  it('DELETE /api/questions/:id by a non-owner returns 403 FORBIDDEN', async () => {
    const owner = await createVerifiedUser();
    const intruder = await createVerifiedUser();
    const created = await submitQuestion(owner.cookie);
    const questionId = created.body.data.question.id;

    const res = await request(app)
      .delete(`/api/questions/${questionId}`)
      .set('Cookie', intruder.cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('PATCH /api/questions/:not-a-uuid returns 400 VALIDATION_ERROR', async () => {
    const user = await createVerifiedUser();
    const res = await request(app)
      .patch('/api/questions/not-a-uuid')
      .set('Cookie', user.cookie)
      .send({ title: 'Updated' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 5 - Pending queue permissions
  it('GET /api/questions/pending as a guest returns 401', async () => {
    const res = await request(app).get('/api/questions/pending');
    expect(res.status).toBe(401);
  });

  it('GET /api/questions/pending as a normal user returns 403 FORBIDDEN', async () => {
    const user = await createVerifiedUser();
    const res = await request(app).get('/api/questions/pending').set('Cookie', user.cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/questions/pending as a moderator lists pending questions with authors', async () => {
    const user = await createVerifiedUser();
    await submitQuestion(user.cookie);

    const moderator = await createVerifiedUser('moderator');
    const res = await request(app).get('/api/questions/pending').set('Cookie', moderator.cookie);
    expect(res.status).toBe(200);
    const found = res.body.data.questions.find(
      (q: { authorUsername: string }) => q.authorUsername === user.identity.username,
    );
    expect(found).toBeDefined();
    expect(found.status).toBe('pending');
  });

  // 6 - Rejection
  it('POST /api/questions/:id/reject as a normal user returns 403 FORBIDDEN', async () => {
    const user = await createVerifiedUser();
    const created = await submitQuestion(user.cookie);
    const questionId = created.body.data.question.id;

    const res = await request(app)
      .post(`/api/questions/${questionId}/reject`)
      .set('Cookie', user.cookie)
      .send({ reason: 'Not relevant' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/questions/:id/reject without a reason returns 400 VALIDATION_ERROR', async () => {
    const user = await createVerifiedUser();
    const moderator = await createVerifiedUser('moderator');
    const created = await submitQuestion(user.cookie);
    const questionId = created.body.data.question.id;

    const res = await request(app)
      .post(`/api/questions/${questionId}/reject`)
      .set('Cookie', moderator.cookie)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/questions/:id/reject marks the question rejected with a reason', async () => {
    const user = await createVerifiedUser();
    const moderator = await createVerifiedUser('moderator');
    const created = await submitQuestion(user.cookie);
    const questionId = created.body.data.question.id;

    const res = await request(app)
      .post(`/api/questions/${questionId}/reject`)
      .set('Cookie', moderator.cookie)
      .send({ reason: 'Duplicate of an existing question.' });
    expect(res.status).toBe(200);
    expect(res.body.data.question.status).toBe('rejected');
    expect(res.body.data.question.rejectionReason).toBe('Duplicate of an existing question.');

    const mine = await request(app).get('/api/questions/mine').set('Cookie', user.cookie);
    const rejected = mine.body.data.questions.find((q: { id: string }) => q.id === questionId);
    expect(rejected.status).toBe('rejected');

    const again = await request(app)
      .post(`/api/questions/${questionId}/reject`)
      .set('Cookie', moderator.cookie)
      .send({ reason: 'Twice' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('QUESTION_NOT_PENDING');
  });

  it('POST /api/questions/:id/reject on an unknown question returns 404 QUESTION_NOT_FOUND', async () => {
    const moderator = await createVerifiedUser('moderator');
    const res = await request(app)
      .post('/api/questions/99999999-9999-4999-8999-999999999999/reject')
      .set('Cookie', moderator.cookie)
      .send({ reason: 'Nope' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('QUESTION_NOT_FOUND');
  });

  // 7 - Approval
  it('POST /api/questions/:id/approve as a normal user returns 403 FORBIDDEN', async () => {
    const user = await createVerifiedUser();
    const created = await submitQuestion(user.cookie);
    const questionId = created.body.data.question.id;

    const res = await request(app)
      .post(`/api/questions/${questionId}/approve`)
      .set('Cookie', user.cookie)
      .send({ linkTopicId: '11111111-1111-4111-8111-111111111111' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/questions/:id/approve requires exactly one of linkTopicId or createTopic', async () => {
    const moderator = await createVerifiedUser('moderator');
    const res = await request(app)
      .post('/api/questions/99999999-9999-4999-8999-999999999999/approve')
      .set('Cookie', moderator.cookie)
      .send({ linkTopicId: '11111111-1111-4111-8111-111111111111', createTopic: { title: 'x' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/questions/:id/approve with an unknown linkTopicId returns 404 TOPIC_NOT_FOUND', async () => {
    const user = await createVerifiedUser();
    const moderator = await createVerifiedUser('moderator');
    const created = await submitQuestion(user.cookie);
    const questionId = created.body.data.question.id;

    const res = await request(app)
      .post(`/api/questions/${questionId}/approve`)
      .set('Cookie', moderator.cookie)
      .send({ linkTopicId: '99999999-9999-4999-8999-999999999999' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TOPIC_NOT_FOUND');
  });

  it('approve with createTopic creates a published topic and links the question', async () => {
    const user = await createVerifiedUser();
    const moderator = await createVerifiedUser('moderator');
    const created = await submitQuestion(user.cookie);
    const questionId = created.body.data.question.id;

    const res = await request(app)
      .post(`/api/questions/${questionId}/approve`)
      .set('Cookie', moderator.cookie)
      .send({
        createTopic: {
          title: `Deadlock debugging ${runId}`,
          description: 'Approving this question creates the topic.',
          categoryId,
          tagIds: [tagIds[0]],
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.data.question.status).toBe('approved');
    expect(res.body.data.topic.slug).toBe(`deadlock-debugging-${runId}`);
    expect(res.body.data.topic.isCurated).toBe(false);
    expect(res.body.data.topic.status).toBe('published');
    expect(res.body.data.topic.tags).toHaveLength(1);

    // Approving twice is rejected
    const again = await request(app)
      .post(`/api/questions/${questionId}/approve`)
      .set('Cookie', moderator.cookie)
      .send({
        createTopic: {
          title: `Other ${runId}`,
          description: 'Should not be created',
          categoryId,
          tagIds: [],
        },
      });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('QUESTION_NOT_PENDING');

    // The question now points at the topic and is gone from the pending queue
    const mine = await request(app).get('/api/questions/mine').set('Cookie', user.cookie);
    const approved = mine.body.data.questions.find((q: { id: string }) => q.id === questionId);
    expect(approved.status).toBe('approved');
    expect(approved.topicId).toBe(res.body.data.topic.id);

    const pending = await request(app)
      .get('/api/questions/pending')
      .set('Cookie', moderator.cookie);
    expect(pending.body.data.questions.find((q: { id: string }) => q.id === questionId)).toBeUndefined();
  });

  it('approve link mode attaches the question to an existing topic', async () => {
    const user = await createVerifiedUser();
    const moderator = await createVerifiedUser('moderator');

    // First question creates the topic
    const first = await submitQuestion(user.cookie);
    const createdTopic = await request(app)
      .post(`/api/questions/${first.body.data.question.id}/approve`)
      .set('Cookie', moderator.cookie)
      .send({
        createTopic: {
          title: `Link mode ${runId}`,
          description: 'Topic used for link mode',
          categoryId,
          tagIds: [],
        },
      });
    expect(createdTopic.status).toBe(200);
    const topicId = createdTopic.body.data.topic.id;

    // Second question links to it
    const second = await submitQuestion(user.cookie, { title: 'Follow-up on the same deadlock' });
    const linked = await request(app)
      .post(`/api/questions/${second.body.data.question.id}/approve`)
      .set('Cookie', moderator.cookie)
      .send({ linkTopicId: topicId });
    expect(linked.status).toBe(200);
    expect(linked.body.data.topic.id).toBe(topicId);
    expect(linked.body.data.question.topicId).toBe(topicId);
  });

  it('approving with different titles that share a slug produces suffixed slugs', async () => {
    const user = await createVerifiedUser();
    const moderator = await createVerifiedUser('moderator');
    // Distinct titles (topics.title is UNIQUE) that slugify identically
    const firstTitle = `Collision case ${runId}`;
    const secondTitle = `COLLISION CASE ${runId}!!`;

    const first = await submitQuestion(user.cookie);
    const second = await submitQuestion(user.cookie, { title: 'Second collision question' });

    const firstApprove = await request(app)
      .post(`/api/questions/${first.body.data.question.id}/approve`)
      .set('Cookie', moderator.cookie)
      .send({
        createTopic: { title: firstTitle, description: 'First topic', categoryId, tagIds: [] },
      });
    expect(firstApprove.status).toBe(200);
    expect(firstApprove.body.data.topic.slug).toBe(`collision-case-${runId}`);

    const secondApprove = await request(app)
      .post(`/api/questions/${second.body.data.question.id}/approve`)
      .set('Cookie', moderator.cookie)
      .send({
        createTopic: { title: secondTitle, description: 'Second topic', categoryId, tagIds: [] },
      });
    expect(secondApprove.status).toBe(200);
    expect(secondApprove.body.data.topic.slug).toBe(`collision-case-${runId}-2`);
  });

  it('approve createTopic with a duplicate title returns 400 VALIDATION_ERROR', async () => {
    const user = await createVerifiedUser();
    const moderator = await createVerifiedUser('moderator');
    const title = `Duplicate title ${runId}`;

    const first = await submitQuestion(user.cookie);
    const second = await submitQuestion(user.cookie, { title: 'Second duplicate-title question' });

    const firstApprove = await request(app)
      .post(`/api/questions/${first.body.data.question.id}/approve`)
      .set('Cookie', moderator.cookie)
      .send({
        createTopic: { title, description: 'First topic', categoryId, tagIds: [] },
      });
    expect(firstApprove.status).toBe(200);

    const secondApprove = await request(app)
      .post(`/api/questions/${second.body.data.question.id}/approve`)
      .set('Cookie', moderator.cookie)
      .send({
        createTopic: { title, description: 'Second topic', categoryId, tagIds: [] },
      });
    expect(secondApprove.status).toBe(400);
    expect(secondApprove.body.error.code).toBe('VALIDATION_ERROR');
    expect(secondApprove.body.error.message).toContain('title');
  });

  // 8 - Public topics
  it('GET /api/topics lists published topics', async () => {
    const res = await request(app).get('/api/topics');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.topics)).toBe(true);
  });

  it('GET /api/topics/:slug returns the topic with its approved questions', async () => {
    const user = await createVerifiedUser();
    const moderator = await createVerifiedUser('moderator');
    const created = await submitQuestion(user.cookie);

    const approve = await request(app)
      .post(`/api/questions/${created.body.data.question.id}/approve`)
      .set('Cookie', moderator.cookie)
      .send({
        createTopic: {
          title: `Public detail ${runId}`,
          description: 'Topic detail test',
          categoryId,
          tagIds: [tagIds[0]],
        },
      });
    expect(approve.status).toBe(200);
    const slug = approve.body.data.topic.slug;

    const detail = await request(app).get(`/api/topics/${slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.topic.slug).toBe(slug);
    expect(detail.body.data.topic.tags).toHaveLength(1);
    const questions = detail.body.data.questions as Array<{ id: string; status: string; authorUsername: string }>;
    expect(questions.map((q) => q.id)).toContain(created.body.data.question.id);
    expect(questions.every((q) => q.status === 'approved')).toBe(true);
    expect(questions.every((q) => q.authorUsername === user.identity.username)).toBe(true);
  });

  it('GET /api/topics/:slug with an unknown slug returns 404 TOPIC_NOT_FOUND', async () => {
    const res = await request(app).get('/api/topics/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TOPIC_NOT_FOUND');
  });
});
