import request from 'supertest';
import { createApp } from '../src/app';
import { closeDatabaseConnection, pool } from '../src/config/database';
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

function uniqueIdentity(): Identity {
  seq += 1;
  const password = 'Str0ng!Passw0rd';
  const username = `r${runId}${seq}`.slice(0, 30);
  return {
    fullName: `Report Test ${seq}`,
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
let categoryId: string;

interface CreatedTopic {
  id: string;
  slug: string;
}

async function createTopic(title: string, description: string): Promise<CreatedTopic> {
  const author = await createVerifiedUser();
  const question = await request(app).post('/api/questions').set('Cookie', author.cookie).send({
    title: `Question for ${title}`,
    description: 'Scaffold question for report tests.',
    categoryId,
    tagIds: [],
  });
  expect(question.status).toBe(201);
  const approve = await request(app)
    .post(`/api/questions/${question.body.data.question.id}/approve`)
    .set('Cookie', moderator.cookie)
    .send({ createTopic: { title, description, categoryId, tagIds: [] } });
  expect(approve.status).toBe(200);
  return { id: approve.body.data.topic.id as string, slug: approve.body.data.topic.slug as string };
}

async function addPerspective(cookie: string, slug: string, solution: string, explanation: string) {
  const res = await request(app).post(`/api/topics/${slug}/perspectives`).set('Cookie', cookie).send({
    proposedSolution: solution,
    explanation,
    advantages: ['Advantage'],
    limitations: ['Limitation'],
  });
  expect(res.status).toBe(201);
  return res.body.data.perspective.id as string;
}

function report(
  cookie: string,
  targetType: 'topic' | 'perspective',
  targetId: string,
  reason = 'spam',
  comment?: string,
) {
  return request(app)
    .post('/api/reports')
    .set('Cookie', cookie)
    .send({ targetType, targetId, reason, ...(comment !== undefined ? { comment } : {}) });
}

function act(cookie: string, reportId: string, action: 'dismiss' | 'hide' | 'escalate') {
  return request(app)
    .post(`/api/reports/${reportId}/action`)
    .set('Cookie', cookie)
    .send({ action });
}

describe('Content reporting and moderator queue (FR-MOD-01, FR-MOD-02)', () => {
  beforeAll(async () => {
    const category = await pool.query("SELECT id FROM categories WHERE name = 'Debugging'");
    categoryId = category.rows[0].id;
    moderator = await createVerifiedUser('moderator');
  });

  afterAll(async () => {
    const emailPattern = `r${runId}%@example.com`;
    await pool.query(
      'DELETE FROM reports WHERE reporter_id IN (SELECT id FROM users WHERE email LIKE $1)',
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

  it('reports a perspective and exposes reporter + content to the queue', async () => {
    const topic = await createTopic(`Reportable topic ${runId}`, 'Report target host.');
    const author = await createVerifiedUser();
    const reporter = await createVerifiedUser();
    const perspectiveId = await addPerspective(author.cookie, topic.slug, 'Reported solution', 'Reported explanation.');

    const created = await report(reporter.cookie, 'perspective', perspectiveId);
    expect(created.status).toBe(201);
    expect(created.body.data.report.status).toBe('open');
    expect(created.body.data.report.reason).toBe('spam');
    expect(created.body.data.report.reporter.username).toBe(reporter.identity.username);
    expect(created.body.data.report.target.proposedSolution).toBe('Reported solution');

    const queue = await request(app)
      .get('/api/reports?status=open')
      .set('Cookie', moderator.cookie);
    expect(queue.status).toBe(200);
    const listed = queue.body.data.reports.find(
      (item: { id: string }) => item.id === created.body.data.report.id,
    );
    expect(listed).toBeDefined();
    expect(listed.reporter.username).toBe(reporter.identity.username);
    expect(listed.target.authorUsername).toBe(author.identity.username);
  });

  it('blocks self-reports on your own topic and perspective', async () => {
    const topic = await createTopic(`Self report topic ${runId}`, 'Owned by the moderator.');
    const ownTopic = await report(moderator.cookie, 'topic', topic.id);
    expect(ownTopic.status).toBe(403);
    expect(ownTopic.body.error.code).toBe('SELF_REPORT');

    const author = await createVerifiedUser();
    const perspectiveId = await addPerspective(author.cookie, topic.slug, 'Own', 'Own perspective.');
    const ownPerspective = await report(author.cookie, 'perspective', perspectiveId);
    expect(ownPerspective.status).toBe(403);
    expect(ownPerspective.body.error.code).toBe('SELF_REPORT');
  });

  it('blocks a duplicate report with 409', async () => {
    const topic = await createTopic(`Duplicate report topic ${runId}`, 'Duplicate target.');
    const reporter = await createVerifiedUser();

    const first = await report(reporter.cookie, 'topic', topic.id);
    expect(first.status).toBe(201);
    const second = await report(reporter.cookie, 'topic', topic.id);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('REPORT_ALREADY_EXISTS');
  });

  it('returns 404 for an unknown report target', async () => {
    const reporter = await createVerifiedUser();
    const missing = '11111111-1111-4111-8111-111111111111';

    const topic = await report(reporter.cookie, 'topic', missing);
    expect(topic.status).toBe(404);
    expect(topic.body.error.code).toBe('TARGET_NOT_FOUND');

    const perspective = await report(reporter.cookie, 'perspective', missing);
    expect(perspective.status).toBe(404);
    expect(perspective.body.error.code).toBe('TARGET_NOT_FOUND');
  });

  it('returns 404 when acting on an unknown report', async () => {
    const res = await act(
      moderator.cookie,
      '11111111-1111-4111-8111-111111111111',
      'dismiss',
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REPORT_NOT_FOUND');
  });

  it('requires a comment when the reason is "other"', async () => {
    const topic = await createTopic(`Other reason topic ${runId}`, 'Other target.');
    const reporter = await createVerifiedUser();

    const missing = await report(reporter.cookie, 'topic', topic.id, 'other');
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('VALIDATION_ERROR');

    const withComment = await report(reporter.cookie, 'topic', topic.id, 'other', 'Needs context.');
    expect(withComment.status).toBe(201);
    expect(withComment.body.data.report.comment).toBe('Needs context.');
  });

  it('allows only moderators/admins to read the queue or act on reports', async () => {
    const registered = await createVerifiedUser();
    const queue = await request(app).get('/api/reports').set('Cookie', registered.cookie);
    expect(queue.status).toBe(403);
    expect(queue.body.error.code).toBe('FORBIDDEN');

    const action = await act(registered.cookie, '11111111-1111-4111-8111-111111111111', 'dismiss');
    expect(action.status).toBe(403);
  });

  it('escalates a report to under_review', async () => {
    const topic = await createTopic(`Escalate topic ${runId}`, 'Escalation target.');
    const reporter = await createVerifiedUser();
    const created = await report(reporter.cookie, 'topic', topic.id);

    const escalated = await act(moderator.cookie, created.body.data.report.id, 'escalate');
    expect(escalated.status).toBe(200);
    expect(escalated.body.data.report.status).toBe('under_review');
  });

  it('dismisses a report', async () => {
    const topic = await createTopic(`Dismiss topic ${runId}`, 'Dismissal target.');
    const reporter = await createVerifiedUser();
    const created = await report(reporter.cookie, 'topic', topic.id);

    const dismissed = await act(moderator.cookie, created.body.data.report.id, 'dismiss');
    expect(dismissed.status).toBe(200);
    expect(dismissed.body.data.report.status).toBe('dismissed');
  });

  it('hides a reported topic and removes it from public lists, detail and search', async () => {
    const keyword = `hiddenmod${runId}`;
    const topic = await createTopic(`${keyword} topic`, `Description with ${keyword}.`);
    const reporter = await createVerifiedUser();
    const created = await report(reporter.cookie, 'topic', topic.id);

    const hidden = await act(moderator.cookie, created.body.data.report.id, 'hide');
    expect(hidden.status).toBe(200);
    expect(hidden.body.data.report.status).toBe('resolved');
    expect(hidden.body.data.report.target.hidden).toBe(true);

    const publicList = await request(app).get('/api/topics');
    expect(publicList.body.data.topics.map((t: { id: string }) => t.id)).not.toContain(topic.id);

    const publicDetail = await request(app).get(`/api/topics/${topic.slug}`);
    expect(publicDetail.status).toBe(404);

    const publicSearch = await request(app).get(`/api/search?q=${keyword}`);
    expect(publicSearch.body.data.results.map((r: { id: string }) => r.id)).not.toContain(topic.id);

    const modList = await request(app).get('/api/topics').set('Cookie', moderator.cookie);
    expect(modList.body.data.topics.map((t: { id: string }) => t.id)).toContain(topic.id);

    const modDetail = await request(app).get(`/api/topics/${topic.slug}`).set('Cookie', moderator.cookie);
    expect(modDetail.status).toBe(200);

    const modSearch = await request(app)
      .get(`/api/search?q=${keyword}`)
      .set('Cookie', moderator.cookie);
    expect(modSearch.body.data.results.map((r: { id: string }) => r.id)).toContain(topic.id);
  });

  it('hides a reported perspective and removes it from lists, comparison and search', async () => {
    const keyword = `hiddenpsp${runId}`;
    const topic = await createTopic(`Perspective hide host ${runId}`, 'Perspective hide host.');
    const author = await createVerifiedUser();
    const otherAuthor = await createVerifiedUser();
    const reporter = await createVerifiedUser();
    const hiddenId = await addPerspective(author.cookie, topic.slug, `${keyword} solution`, 'Hidden explanation.');
    const visibleId = await addPerspective(otherAuthor.cookie, topic.slug, 'Visible solution', 'Visible explanation.');
    const created = await report(reporter.cookie, 'perspective', hiddenId);

    const hidden = await act(moderator.cookie, created.body.data.report.id, 'hide');
    expect(hidden.status).toBe(200);
    expect(hidden.body.data.report.target.hidden).toBe(true);

    const publicList = await request(app).get(`/api/topics/${topic.slug}/perspectives`);
    expect(publicList.body.data.perspectives.map((p: { id: string }) => p.id)).not.toContain(hiddenId);

    const modList = await request(app)
      .get(`/api/topics/${topic.slug}/perspectives`)
      .set('Cookie', moderator.cookie);
    expect(modList.body.data.perspectives.map((p: { id: string }) => p.id)).toContain(hiddenId);

    const publicCompare = await request(app).get(
      `/api/topics/${topic.slug}/compare?ids=${hiddenId},${visibleId}`,
    );
    expect(publicCompare.status).toBe(400);
    expect(publicCompare.body.error.code).toBe('INVALID_COMPARISON');

    const modCompare = await request(app)
      .get(`/api/topics/${topic.slug}/compare?ids=${hiddenId},${visibleId}`)
      .set('Cookie', moderator.cookie);
    expect(modCompare.status).toBe(200);
    expect(modCompare.body.data.perspectives).toHaveLength(2);

    const publicSearch = await request(app).get(`/api/search?q=${keyword}`);
    expect(publicSearch.body.data.results.map((r: { id: string }) => r.id)).not.toContain(topic.id);

    const modSearch = await request(app)
      .get(`/api/search?q=${keyword}`)
      .set('Cookie', moderator.cookie);
    expect(modSearch.body.data.results.map((r: { id: string }) => r.id)).toContain(topic.id);
  });
});
