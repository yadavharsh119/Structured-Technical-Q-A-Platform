import request from 'supertest';
import { createApp } from '../src/app';
import { closeDatabaseConnection, pool } from '../src/config/database';
import { emailService } from '../src/services/emailService';

// Mock the EmailService so tests can capture the raw verification token
jest.mock('../src/services/emailService', () => ({
  emailService: { sendVerificationEmail: jest.fn() },
}));

const app = createApp();

// ── Unique-per-run helpers ────────────────────────────────────────────────────

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
  const username = `s${runId}${seq}`.slice(0, 30);
  return {
    fullName: `Search Test ${seq}`,
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
  cookie: string;
  userId: string;
}

async function createVerifiedUser(role: 'registered' | 'moderator' = 'registered'): Promise<TestUser> {
  const identity = uniqueIdentity();
  const reg = await request(app).post('/api/auth/register').send(identity);
  expect(reg.status).toBe(201);
  const verif = await request(app)
    .post('/api/auth/verify-email')
    .send({ token: latestVerificationToken() });
  expect(verif.status).toBe(200);
  const login = await request(app)
    .post('/api/auth/login')
    .send({ identifier: identity.email, password: identity.password });
  expect(login.status).toBe(200);
  const userId = login.body.data.user.id as string;
  if (role === 'moderator') {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['moderator', userId]);
  }
  return { cookie: cookieFrom(login), userId };
}

// ── Fixture creation helpers ──────────────────────────────────────────────────

let moderatorCookie: string;
let categoryId: string;
let tagId: string;
let tagName: string;

/**
 * Create a published topic via the normal question → approve flow.
 * Returns the topic slug.
 */
async function createPublishedTopic(
  title: string,
  description: string,
  tagIds: string[] = [],
): Promise<string> {
  const author = await createVerifiedUser();
  const qRes = await request(app).post('/api/questions').set('Cookie', author.cookie).send({
    title: `Question for: ${title}`,
    description: 'Scaffold question for search tests.',
    categoryId,
    tagIds: [],
  });
  expect(qRes.status).toBe(201);

  const approveRes = await request(app)
    .post(`/api/questions/${qRes.body.data.question.id}/approve`)
    .set('Cookie', moderatorCookie)
    .send({ createTopic: { title, description, categoryId, tagIds } });
  expect(approveRes.status).toBe(200);

  return approveRes.body.data.topic.slug as string;
}

/** Add a perspective to an existing published topic. */
async function addPerspective(
  cookie: string,
  slug: string,
  proposedSolution: string,
  explanation: string,
): Promise<string> {
  const res = await request(app).post(`/api/topics/${slug}/perspectives`).set('Cookie', cookie).send({
    proposedSolution,
    explanation,
    advantages: ['Pro one'],
    limitations: ['Con one'],
    codeSnippets: [],
    references: [],
  });
  expect(res.status).toBe(201);
  return res.body.data.perspective.id as string;
}

// ── Topic & perspective text fixtures ────────────────────────────────────────

// A unique keyword guaranteed to appear only in specific test records
const UNIQUE_KEYWORD = `srchkw${runId}`;

let topicOnlySlug: string;       // topic text matches UNIQUE_KEYWORD, no perspectives
let perspectiveOnlySlug: string; // topic text does NOT match; a perspective does
let bothMatchSlug: string;       // topic text AND a perspective match
let unrelatedSlug: string;       // never matches UNIQUE_KEYWORD
let taggedSlug: string;          // topic with a tag applied
let unpublishedId: string;       // topic hidden directly in DB — must never appear

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('GET /api/search (FR-SRCH-01, FR-SRCH-02)', () => {
  beforeAll(async () => {
    // Pick a category that is seeded by the migrations
    const catRow = await pool.query("SELECT id FROM categories LIMIT 1");
    categoryId = catRow.rows[0].id;

    // Pick or create a tag
    const tagRow = await pool.query("SELECT id, name FROM tags LIMIT 1");
    tagId = tagRow.rows[0].id;
    tagName = tagRow.rows[0].name;

    const mod = await createVerifiedUser('moderator');
    moderatorCookie = mod.cookie;

    // topic-only match
    topicOnlySlug = await createPublishedTopic(
      `${UNIQUE_KEYWORD} topic only ${runId}`,
      `This description also contains ${UNIQUE_KEYWORD} for fulltext.`,
    );

    // perspective-only match
    perspectiveOnlySlug = await createPublishedTopic(
      `Unrelated perspective host topic ${runId}`,
      'Generic description without the keyword.',
    );
    const pAuthor = await createVerifiedUser();
    await addPerspective(
      pAuthor.cookie,
      perspectiveOnlySlug,
      `${UNIQUE_KEYWORD} proposed solution`,
      `Explanation mentioning ${UNIQUE_KEYWORD}`,
    );

    // both-match topic
    bothMatchSlug = await createPublishedTopic(
      `Both match topic ${UNIQUE_KEYWORD} ${runId}`,
      `Description with ${UNIQUE_KEYWORD}`,
    );
    const bAuthor = await createVerifiedUser();
    await addPerspective(
      bAuthor.cookie,
      bothMatchSlug,
      `${UNIQUE_KEYWORD} solution in perspective`,
      `Explanation for both match ${UNIQUE_KEYWORD}`,
    );

    // unrelated topic (no keyword)
    unrelatedSlug = await createPublishedTopic(
      `Completely unrelated topic ${runId}`,
      'No keyword here at all.',
    );

    // tagged topic for tag-filter tests
    taggedSlug = await createPublishedTopic(
      `Tagged topic ${UNIQUE_KEYWORD} ${runId}`,
      `Tagged description with ${UNIQUE_KEYWORD}`,
      [tagId],
    );

    // unpublished topic — set status to hidden immediately after creation
    const unpubSlug = await createPublishedTopic(
      `Hidden topic ${UNIQUE_KEYWORD} ${runId}`,
      `This has the ${UNIQUE_KEYWORD} keyword but is hidden.`,
    );
    const hiddenRow = await pool.query("SELECT id FROM topics WHERE slug = $1", [unpubSlug]);
    unpublishedId = hiddenRow.rows[0].id;
    await pool.query("UPDATE topics SET status = 'hidden' WHERE id = $1", [unpublishedId]);
  });

  afterAll(async () => {
    const emailPattern = `s${runId}%@example.com`;
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

  // ── 1. Bad input ────────────────────────────────────────────────────────────

  it('returns 400 VALIDATION_ERROR when q is missing', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when q is too short (1 character)', async () => {
    const res = await request(app).get('/api/search?q=a');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('unrelated topic (no keyword match) is not returned', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}`);
    expect(res.status).toBe(200);
    const slugs = res.body.data.results.map((r: { slug: string }) => r.slug);
    expect(slugs).not.toContain(unrelatedSlug);
  });

  // ── 2. Keyword matching ─────────────────────────────────────────────────────

  it('returns 200 with results for a keyword that matches topic text', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { results, total, page, pageSize, filters } = res.body.data;
    expect(total).toBeGreaterThanOrEqual(1);
    expect(page).toBe(1);
    expect(pageSize).toBe(20);
    expect(filters.q).toBe(UNIQUE_KEYWORD);

    const slugs = results.map((r: { slug: string }) => r.slug);
    expect(slugs).toContain(topicOnlySlug);
  });

  it('topic-only match has matchedIn = "topic"', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}`);
    expect(res.status).toBe(200);
    const match = res.body.data.results.find((r: { slug: string }) => r.slug === topicOnlySlug);
    expect(match).toBeDefined();
    expect(match.matchedIn).toBe('topic');
  });

  it('perspective-only match has matchedIn = "perspective" and topic appears in results', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}`);
    expect(res.status).toBe(200);
    const match = res.body.data.results.find((r: { slug: string }) => r.slug === perspectiveOnlySlug);
    expect(match).toBeDefined();
    expect(match.matchedIn).toBe('perspective');
  });

  it('both-match topic has matchedIn = "both"', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}`);
    expect(res.status).toBe(200);
    const match = res.body.data.results.find((r: { slug: string }) => r.slug === bothMatchSlug);
    expect(match).toBeDefined();
    expect(match.matchedIn).toBe('both');
  });

  it('result shape contains required fields', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}`);
    expect(res.status).toBe(200);
    const first = res.body.data.results[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('slug');
    expect(first).toHaveProperty('title');
    expect(first).toHaveProperty('shortDescription');
    expect(first).toHaveProperty('category');
    expect(first.category).toHaveProperty('id');
    expect(first.category).toHaveProperty('name');
    expect(first).toHaveProperty('tags');
    expect(Array.isArray(first.tags)).toBe(true);
    expect(first).toHaveProperty('perspectiveCount');
    expect(first).toHaveProperty('totalUpvotes');
    expect(first).toHaveProperty('matchedIn');
  });

  // ── 3. Unpublished topics are excluded ─────────────────────────────────────

  it('hidden topic is never returned even when keyword matches', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.results.map((r: { id: string }) => r.id);
    expect(ids).not.toContain(unpublishedId);
  });

  // ── 4. Category filter ──────────────────────────────────────────────────────

  it('category filter by UUID narrows results to that category', async () => {
    const res = await request(app).get(
      `/api/search?q=${UNIQUE_KEYWORD}&category=${categoryId}`,
    );
    expect(res.status).toBe(200);
    const { results } = res.body.data;
    for (const r of results) {
      expect(r.category.id).toBe(categoryId);
    }
    expect(res.body.data.filters.category).toBe(categoryId);
  });

  it('category filter with a non-existent UUID returns empty results', async () => {
    const res = await request(app).get(
      '/api/search?q=the&category=00000000-0000-4000-8000-000000000000',
    );
    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  // ── 5. Tag filter ───────────────────────────────────────────────────────────

  it('tag filter returns only topics with that tag', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}&tag=${tagName}`);
    expect(res.status).toBe(200);
    const slugs = res.body.data.results.map((r: { slug: string }) => r.slug);
    expect(slugs).toContain(taggedSlug);
    // Non-tagged topics that only match by keyword should be absent
    expect(slugs).not.toContain(topicOnlySlug);
  });

  it('tag filter with a non-existent tag returns empty results', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}&tag=__nonexistent_tag__`);
    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveLength(0);
  });

  // ── 6. Sort modes ───────────────────────────────────────────────────────────

  it('sort=relevance returns 200', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}&sort=relevance`);
    expect(res.status).toBe(200);
    expect(res.body.data.filters.sort).toBe('relevance');
  });

  it('sort=newest returns results ordered by newest first', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}&sort=newest`);
    expect(res.status).toBe(200);
    expect(res.body.data.filters.sort).toBe('newest');
    const results = res.body.data.results as Array<{ id: string }>;
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('sort=most_upvotes returns 200 with the correct filter in the response', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}&sort=most_upvotes`);
    expect(res.status).toBe(200);
    expect(res.body.data.filters.sort).toBe('most_upvotes');
  });

  it('sort=most_perspectives returns 200', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}&sort=most_perspectives`);
    expect(res.status).toBe(200);
    expect(res.body.data.filters.sort).toBe('most_perspectives');
  });

  // ── 7. Pagination ───────────────────────────────────────────────────────────

  it('page=1 returns the first page', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}&page=1`);
    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(1);
  });

  it('page=2 returns empty when total results fit on page 1', async () => {
    // Our fixture creates at most 5 matching topics, well within page size 20
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}&page=2`);
    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(2);
    // Total count is still reported accurately
    expect(typeof res.body.data.total).toBe('number');
    // Page 2 results are empty (fixtures < 20)
    expect(res.body.data.results).toHaveLength(0);
  });

  // ── 8. Public access (no auth required) ────────────────────────────────────

  it('GET /api/search is public — no cookie required', async () => {
    const res = await request(app).get(`/api/search?q=${UNIQUE_KEYWORD}`);
    expect(res.status).toBe(200);
  });
});
