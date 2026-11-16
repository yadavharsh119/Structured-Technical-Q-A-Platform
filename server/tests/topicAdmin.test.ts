import request from 'supertest';
import { createApp } from '../src/app';
import { closeDatabaseConnection, pool } from '../src/config/database';
import { topicRepository } from '../src/repositories/topicRepository';
import { emailService } from '../src/services/emailService';

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
  cookie: string;
  userId: string;
}

function uniqueIdentity(): Identity {
  seq += 1;
  const password = 'Str0ng!Passw0rd';
  const username = `t${runId}${seq}`.slice(0, 30);
  return {
    fullName: `Topic Admin Test ${seq}`,
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
  return { cookie: cookieFrom(login), userId };
}

let categoryId = '';
let otherCategoryId = '';
let tagId = '';

function topicPayload(title: string, overrides: Record<string, unknown> = {}) {
  return {
    title,
    description: `Description for ${title}`,
    categoryId,
    tagIds: [tagId],
    ...overrides,
  };
}

async function createTopic(cookie: string, title: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/topics')
    .set('Cookie', cookie)
    .send(topicPayload(title, overrides));
  expect([200, 201]).toContain(res.status);
  return res.body.data.topic as { id: string; slug: string; title: string; status: string };
}

function perspectivePayload(solution: string) {
  return {
    proposedSolution: solution,
    explanation: 'Explain the trade-offs in detail.',
    advantages: ['One advantage'],
    limitations: ['One limitation'],
    codeSnippets: [],
    references: [],
  };
}

async function addPerspective(cookie: string, slug: string, solution: string): Promise<string> {
  const res = await request(app)
    .post(`/api/topics/${slug}/perspectives`)
    .set('Cookie', cookie)
    .send(perspectivePayload(solution));
  expect(res.status).toBe(201);
  return res.body.data.perspective.id as string;
}

describe('Topic administration API', () => {
  let moderator: TestUser;
  let admin: TestUser;
  let authorA: TestUser;
  let authorB: TestUser;
  let voter: TestUser;

  beforeAll(async () => {
    const category = await pool.query("SELECT id FROM categories WHERE name = 'Debugging'");
    categoryId = category.rows[0].id as string;
    const other = await pool.query("SELECT id FROM categories WHERE name = 'System Design'");
    otherCategoryId = other.rows[0].id as string;
    const tag = await pool.query('SELECT id FROM tags ORDER BY name LIMIT 1');
    tagId = tag.rows[0].id as string;

    moderator = await createVerifiedUser('moderator');
    admin = await createVerifiedUser('admin');
    authorA = await createVerifiedUser();
    authorB = await createVerifiedUser();
    voter = await createVerifiedUser();
  });

  afterAll(async () => {
    const emailPattern = `t${runId}%@example.com`;
    const users = 'SELECT id FROM users WHERE email LIKE $1';
    const topics = `SELECT id FROM topics WHERE created_by IN (${users})`;
    const perspectives = `SELECT id FROM perspectives WHERE author_id IN (${users}) OR topic_id IN (${topics})`;
    const questions = `SELECT id FROM questions WHERE author_id IN (${users})`;

    await pool.query(`DELETE FROM topic_slug_redirects WHERE topic_id IN (${topics})`, [emailPattern]);
    await pool.query(
      `DELETE FROM perspective_votes WHERE user_id IN (${users}) OR perspective_id IN (${perspectives})`,
      [emailPattern],
    );
    await pool.query(`DELETE FROM perspectives WHERE id IN (${perspectives})`, [emailPattern]);
    await pool.query(
      `DELETE FROM topic_questions WHERE topic_id IN (${topics}) OR question_id IN (${questions})`,
      [emailPattern],
    );
    await pool.query(`DELETE FROM question_tags WHERE question_id IN (${questions})`, [emailPattern]);
    await pool.query(`DELETE FROM questions WHERE id IN (${questions})`, [emailPattern]);
    await pool.query(`DELETE FROM topic_tags WHERE topic_id IN (${topics})`, [emailPattern]);
    await pool.query(`DELETE FROM topics WHERE id IN (${topics})`, [emailPattern]);
    await pool.query('DELETE FROM users WHERE email LIKE $1', [emailPattern]);
    await closeDatabaseConnection();
  });

  it('lets a moderator create a curated published topic and handles slug collisions', async () => {
    const baseTitle = `Slug Collision ${runId}`;
    const first = await createTopic(moderator.cookie, `${baseTitle}!`);
    const second = await createTopic(moderator.cookie, baseTitle);

    expect(first.status).toBe('published');
    expect(second.status).toBe('published');
    expect(second.slug).not.toBe(first.slug);
    expect(second.slug.startsWith(`${first.slug}-`)).toBe(true);

    const skipped = await request(app)
      .post('/api/topics')
      .set('Cookie', moderator.cookie)
      .send(topicPayload(`${baseTitle}!`));
    expect(skipped.status).toBe(200);
    expect(skipped.body.data.topic.id).toBe(first.id);

    const list = await request(app).get('/api/topics');
    expect(list.status).toBe(200);
    const ids = list.body.data.topics.map((topic: { id: string }) => topic.id);
    expect(ids).toContain(first.id);
    expect(ids).toContain(second.id);
  });

  it('lets a moderator edit metadata, keeps slugs unique and redirects the old slug', async () => {
    const topic = await createTopic(moderator.cookie, `Editable Topic ${runId}`);
    const oldSlug = topic.slug;
    const newSlug = `edited-${runId}`;

    const edit = await request(app)
      .patch(`/api/topics/${topic.id}`)
      .set('Cookie', moderator.cookie)
      .send({
        title: `Edited Topic ${runId}`,
        description: 'Updated description.',
        categoryId: otherCategoryId,
        tagIds: [tagId],
        slug: newSlug,
      });
    expect(edit.status).toBe(200);
    expect(edit.body.data.topic.slug).toBe(newSlug);
    expect(edit.body.data.topic.title).toBe(`Edited Topic ${runId}`);

    const redirected = await request(app).get(`/api/topics/${oldSlug}`).redirects(0);
    expect(redirected.status).toBe(301);
    expect(redirected.headers.location).toBe(`/api/topics/${newSlug}`);
    expect(redirected.body.data.redirectTo.slug).toBe(newSlug);

    const current = await request(app).get(`/api/topics/${newSlug}`);
    expect(current.status).toBe(200);
    expect(current.body.data.topic.id).toBe(topic.id);

    const other = await createTopic(moderator.cookie, `Other Topic ${runId}`);
    const collision = await request(app)
      .patch(`/api/topics/${other.id}`)
      .set('Cookie', moderator.cookie)
      .send({ slug: newSlug });
    expect(collision.status).toBe(409);
    expect(collision.body.error.code).toBe('TOPIC_SLUG_EXISTS');
  });

  it('archives a topic, keeps it viewable, and removes it from list and search', async () => {
    const keyword = `arch${runId}`;
    const topic = await createTopic(moderator.cookie, `Archived ${keyword}`);

    const beforeSearch = await request(app).get(`/api/search?q=${keyword}`);
    expect(beforeSearch.status).toBe(200);
    expect(beforeSearch.body.data.results.map((r: { id: string }) => r.id)).toContain(topic.id);

    const archive = await request(app)
      .post(`/api/topics/${topic.id}/archive`)
      .set('Cookie', moderator.cookie);
    expect(archive.status).toBe(200);
    expect(archive.body.data.topic.status).toBe('archived');

    const view = await request(app).get(`/api/topics/${topic.slug}`);
    expect(view.status).toBe(200);
    expect(view.body.data.topic.status).toBe('archived');

    const perspectives = await request(app).get(`/api/topics/${topic.slug}/perspectives`);
    expect(perspectives.status).toBe(200);

    const list = await request(app).get('/api/topics');
    expect(list.body.data.topics.map((t: { id: string }) => t.id)).not.toContain(topic.id);

    const afterSearch = await request(app).get(`/api/search?q=${keyword}`);
    expect(afterSearch.body.data.results.map((r: { id: string }) => r.id)).not.toContain(topic.id);

    const rejected = await request(app)
      .post(`/api/topics/${topic.slug}/perspectives`)
      .set('Cookie', authorA.cookie)
      .send(perspectivePayload('Should be rejected'));
    expect(rejected.status).toBe(409);
    expect(rejected.body.error.code).toBe('TOPIC_ARCHIVED');
  });

  it('returns 403 when a moderator tries to merge topics', async () => {
    const source = await createTopic(moderator.cookie, `Merge Forbidden Source ${runId}`);
    const destination = await createTopic(moderator.cookie, `Merge Forbidden Dest ${runId}`);

    const res = await request(app)
      .post('/api/admin/topics/merge')
      .set('Cookie', moderator.cookie)
      .send({ sourceId: source.id, destinationId: destination.id });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('merges perspectives and linked questions, archives the source and redirects its slug', async () => {
    const source = await createTopic(moderator.cookie, `Merge Source ${runId}`);
    const destination = await createTopic(moderator.cookie, `Merge Destination ${runId}`);

    const sourcePerspective = await addPerspective(
      authorA.cookie,
      source.slug,
      'Source perspective',
    );
    const destinationPerspective = await addPerspective(
      authorB.cookie,
      destination.slug,
      'Destination perspective',
    );

    const vote = await request(app)
      .post(`/api/perspectives/${sourcePerspective}/upvote`)
      .set('Cookie', voter.cookie);
    expect(vote.status).toBe(200);
    expect(vote.body.data.upvoteCount).toBe(1);

    const question = await request(app)
      .post('/api/questions')
      .set('Cookie', authorA.cookie)
      .send({
        title: `Merged question ${runId}`,
        description: 'This approved question should move with its topic.',
        categoryId,
        tagIds: [tagId],
      });
    expect(question.status).toBe(201);
    const questionId = question.body.data.question.id as string;
    const approve = await request(app)
      .post(`/api/questions/${questionId}/approve`)
      .set('Cookie', moderator.cookie)
      .send({ linkTopicId: source.id });
    expect(approve.status).toBe(200);

    const merge = await request(app)
      .post('/api/admin/topics/merge')
      .set('Cookie', admin.cookie)
      .send({ sourceId: source.id, destinationId: destination.id });
    expect(merge.status).toBe(200);
    expect(merge.body.data.source.status).toBe('archived');
    expect(merge.body.data.destination.id).toBe(destination.id);

    const sourceRows = await pool.query(
      'SELECT status, merged_into_topic_id FROM topics WHERE id = $1',
      [source.id],
    );
    expect(sourceRows.rows[0].status).toBe('archived');
    expect(sourceRows.rows[0].merged_into_topic_id).toBe(destination.id);

    const redirectRows = await pool.query(
      'SELECT topic_id FROM topic_slug_redirects WHERE old_slug = $1',
      [source.slug],
    );
    expect(redirectRows.rows[0].topic_id).toBe(destination.id);

    const redirected = await request(app).get(`/api/topics/${source.slug}`).redirects(0);
    expect(redirected.status).toBe(301);
    expect(redirected.body.data.redirectTo.id).toBe(destination.id);

    const destinationView = await request(app).get(`/api/topics/${destination.slug}`);
    expect(destinationView.status).toBe(200);
    expect(destinationView.body.data.questions.map((q: { id: string }) => q.id)).toContain(questionId);

    const perspectiveView = await request(app).get(
      `/api/topics/${destination.slug}/perspectives`,
    );
    expect(perspectiveView.status).toBe(200);
    const perspectives = perspectiveView.body.data.perspectives as Array<{
      id: string;
      upvoteCount: number;
    }>;
    expect(perspectives.map((p) => p.id)).toEqual(
      expect.arrayContaining([sourcePerspective, destinationPerspective]),
    );
    expect(perspectives.find((p) => p.id === sourcePerspective)?.upvoteCount).toBe(1);
  });

  it('returns 409 with conflicting user ids and changes nothing when a merge conflicts', async () => {
    const source = await createTopic(moderator.cookie, `Conflict Source ${runId}`);
    const destination = await createTopic(moderator.cookie, `Conflict Destination ${runId}`);

    await addPerspective(authorA.cookie, source.slug, 'Source side');
    await addPerspective(authorA.cookie, destination.slug, 'Destination side');
    await addPerspective(authorB.cookie, source.slug, 'Only on source');

    const merge = await request(app)
      .post('/api/admin/topics/merge')
      .set('Cookie', admin.cookie)
      .send({ sourceId: source.id, destinationId: destination.id });

    expect(merge.status).toBe(409);
    expect(merge.body.error.code).toBe('TOPIC_MERGE_CONFLICT');
    expect(merge.body.error.details.conflictingUserIds).toContain(authorA.userId);
    expect(merge.body.error.details.conflictingUserIds).not.toContain(authorB.userId);

    const sourceRow = await pool.query('SELECT status FROM topics WHERE id = $1', [source.id]);
    expect(sourceRow.rows[0].status).toBe('published');

    const sourcePerspectives = await pool.query(
      'SELECT author_id FROM perspectives WHERE topic_id = $1',
      [source.id],
    );
    expect(sourcePerspectives.rows.map((r: { author_id: string }) => r.author_id)).toEqual(
      expect.arrayContaining([authorA.userId, authorB.userId]),
    );

    const redirects = await pool.query(
      'SELECT old_slug FROM topic_slug_redirects WHERE old_slug = $1',
      [source.slug],
    );
    expect(redirects.rowCount).toBe(0);

    const view = await request(app).get(`/api/topics/${source.slug}`);
    expect(view.status).toBe(200);
    expect(view.body.data.topic.status).toBe('published');
  });

  it('rolls the whole merge back if a later step fails', async () => {
    const source = await createTopic(moderator.cookie, `Atomic Source ${runId}`);
    const destination = await createTopic(moderator.cookie, `Atomic Destination ${runId}`);
    await addPerspective(authorA.cookie, source.slug, 'Must stay on the source');

    const spy = jest
      .spyOn(topicRepository, 'upsertRedirect')
      .mockRejectedValueOnce(new Error('forced merge failure'));

    try {
      const merge = await request(app)
        .post('/api/admin/topics/merge')
        .set('Cookie', admin.cookie)
        .send({ sourceId: source.id, destinationId: destination.id });
      expect(merge.status).toBe(500);
    } finally {
      spy.mockRestore();
    }

    const sourceRow = await pool.query('SELECT status FROM topics WHERE id = $1', [source.id]);
    expect(sourceRow.rows[0].status).toBe('published');

    const moved = await pool.query(
      'SELECT topic_id FROM perspectives WHERE topic_id = $1',
      [source.id],
    );
    expect(moved.rowCount).toBe(1);
    expect(moved.rows[0].topic_id).toBe(source.id);

    const redirects = await pool.query(
      'SELECT old_slug FROM topic_slug_redirects WHERE old_slug = $1',
      [source.slug],
    );
    expect(redirects.rowCount).toBe(0);
  });
});
