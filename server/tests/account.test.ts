import request from 'supertest';
import JSZip from 'jszip';
import { createApp } from '../src/app';
import { closeDatabaseConnection, pool } from '../src/config/database';
import { accountRepository } from '../src/repositories/accountRepository';
import { userRepository } from '../src/repositories/userRepository';
import { emailService } from '../src/services/emailService';

jest.mock('../src/services/emailService', () => ({
  emailService: {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  },
}));

const app = createApp();
const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
let seq = 0;
let categoryId = '';
const createdUserIds: string[] = [];

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
  const username = `a${runId}${seq}`.slice(0, 30);
  return {
    fullName: `Account Test ${seq}`,
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

function binaryParser(
  res: request.Response,
  callback: (err: Error | null, body: Buffer) => void,
): void {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
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

async function createVerifiedUser(role: 'registered' | 'moderator' = 'registered'): Promise<TestUser> {
  const identity = uniqueIdentity();
  expect((await request(app).post('/api/auth/register').send(identity)).status).toBe(201);
  expect(
    (
      await request(app)
        .post('/api/auth/verify-email')
        .send({ token: latestVerificationToken() })
    ).status,
  ).toBe(200);

  const login = await request(app)
    .post('/api/auth/login')
    .send({ identifier: identity.email, password: identity.password });
  expect(login.status).toBe(200);
  const userId = login.body.data.user.id as string;
  createdUserIds.push(userId);

  if (role === 'moderator') {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['moderator', userId]);
  }

  return { identity, cookie: cookieFrom(login), userId };
}

async function createQuestion(cookie: string, title: string): Promise<string> {
  const res = await request(app).post('/api/questions').set('Cookie', cookie).send({
    title,
    description: 'Question created for account lifecycle tests.',
    categoryId,
    tagIds: [],
  });
  expect(res.status).toBe(201);
  return res.body.data.question.id as string;
}

async function approveWithTopic(
  moderatorCookie: string,
  questionId: string,
  title: string,
): Promise<string> {
  const res = await request(app)
    .post(`/api/questions/${questionId}/approve`)
    .set('Cookie', moderatorCookie)
    .send({
      createTopic: {
        title,
        description: 'Topic created for account lifecycle tests.',
        categoryId,
        tagIds: [],
      },
    });
  expect(res.status).toBe(200);
  return res.body.data.topic.slug as string;
}

async function addPerspective(cookie: string, slug: string, solution: string): Promise<string> {
  const res = await request(app)
    .post(`/api/topics/${slug}/perspectives`)
    .set('Cookie', cookie)
    .send({
      proposedSolution: solution,
      explanation: 'Explanation for the account lifecycle test perspective.',
      advantages: ['Advantage'],
      limitations: ['Limitation'],
    });
  expect(res.status).toBe(201);
  return res.body.data.perspective.id as string;
}

async function readZipJson<T>(zip: JSZip, name: string): Promise<T> {
  const file = zip.file(name);
  if (!file) throw new Error(`Missing ${name} in export`);
  return JSON.parse(await file.async('string')) as T;
}

describe('Account data export and deactivation (FR-PROF-02/03, SEC-14)', () => {
  beforeAll(async () => {
    const category = await pool.query("SELECT id FROM categories WHERE name = 'Debugging'");
    categoryId = category.rows[0].id as string;
    await pool.query('DELETE FROM login_attempts');
  });

  afterAll(async () => {
    const ids = createdUserIds;
    if (ids.length > 0) {
      await pool.query(
        'DELETE FROM perspective_votes WHERE user_id = ANY($1::uuid[]) OR perspective_id IN (SELECT id FROM perspectives WHERE author_id = ANY($1::uuid[]))',
        [ids],
      );
      await pool.query('DELETE FROM perspectives WHERE author_id = ANY($1::uuid[])', [ids]);
      await pool.query('DELETE FROM questions WHERE author_id = ANY($1::uuid[])', [ids]);
      await pool.query('DELETE FROM topics WHERE created_by = ANY($1::uuid[])', [ids]);
      await pool.query('DELETE FROM expert_fingerprints WHERE user_id = ANY($1::uuid[])', [ids]);
      await pool.query('DELETE FROM oauth_identities WHERE user_id = ANY($1::uuid[])', [ids]);
      await pool.query('DELETE FROM sessions WHERE user_id = ANY($1::uuid[])', [ids]);
      await pool.query('DELETE FROM email_verification_tokens WHERE user_id = ANY($1::uuid[])', [ids]);
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id = ANY($1::uuid[])', [ids]);
      await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [ids]);
    }
    await closeDatabaseConnection();
  });

  it('exports only the requesting user data, without credentials or other users', async () => {
    const author = await createVerifiedUser();
    const other = await createVerifiedUser();
    const moderator = await createVerifiedUser('moderator');

    const authorQuestion = await createQuestion(author.cookie, `Export question ${runId}`);
    const authorSlug = await approveWithTopic(
      moderator.cookie,
      authorQuestion,
      `Export topic ${runId}`,
    );
    const authorPerspective = await addPerspective(
      author.cookie,
      authorSlug,
      'Export my perspective',
    );

    const otherTitle = `Other user question ${runId}`;
    const otherQuestion = await createQuestion(other.cookie, otherTitle);
    const otherSlug = await approveWithTopic(
      moderator.cookie,
      otherQuestion,
      `Other export topic ${runId}`,
    );
    const otherPerspective = await addPerspective(
      other.cookie,
      otherSlug,
      'Other user perspective',
    );

    // The author's only vote belongs to another user's perspective; the
    // author's own perspective is upvoted by the other user.
    expect(
      (
        await request(app)
          .post(`/api/perspectives/${otherPerspective}/upvote`)
          .set('Cookie', author.cookie)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post(`/api/perspectives/${authorPerspective}/upvote`)
          .set('Cookie', other.cookie)
      ).status,
    ).toBe(200);

    const res = await request(app)
      .post('/api/users/me/export')
      .set('Cookie', author.cookie)
      .buffer(true)
      .parse(binaryParser);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toContain('attachment');

    const zip = await JSZip.loadAsync(res.body as Buffer);
    expect(Object.keys(zip.files).sort()).toEqual([
      'perspectives.json',
      'profile.json',
      'questions.json',
      'votes.json',
    ]);

    const profile = await readZipJson<Record<string, unknown>>(zip, 'profile.json');
    expect(profile).toMatchObject({
      username: author.identity.username,
      fullName: author.identity.fullName,
      email: author.identity.email,
    });
    expect(profile).not.toHaveProperty('password_hash');
    expect(profile).not.toHaveProperty('passwordHash');
    expect(profile).not.toHaveProperty('role');
    expect(profile).not.toHaveProperty('status');

    const questions = await readZipJson<Array<Record<string, unknown>>>(zip, 'questions.json');
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({ id: authorQuestion });
    expect(JSON.stringify(questions)).not.toContain(otherTitle);

    const perspectives = await readZipJson<Array<Record<string, unknown>>>(
      zip,
      'perspectives.json',
    );
    expect(perspectives).toHaveLength(1);
    expect(perspectives[0]).toMatchObject({ id: authorPerspective });

    const votes = await readZipJson<Array<Record<string, unknown>>>(zip, 'votes.json');
    expect(votes).toHaveLength(1);
    expect(votes[0]).toMatchObject({ perspectiveId: otherPerspective });

    const archiveText = (
      await Promise.all(
        ['profile.json', 'questions.json', 'perspectives.json', 'votes.json'].map((name) =>
          zip.file(name)?.async('string'),
        ),
      )
    ).join('\n');
    expect(archiveText).not.toContain(other.identity.email);
    expect(archiveText).not.toContain('password_hash');
    expect(archiveText).not.toContain('token_hash');
    expect(archiveText).not.toContain('audit');
  });

  it('requires authentication to export data', async () => {
    const res = await request(app).post('/api/users/me/export').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects deactivation with the wrong password', async () => {
    const user = await createVerifiedUser();

    const res = await request(app)
      .post('/api/users/me/deactivate')
      .set('Cookie', user.cookie)
      .send({ password: 'WrongPassword1!', confirm: true });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_PASSWORD');

    const row = await pool.query('SELECT status, email FROM users WHERE id = $1', [user.userId]);
    expect(row.rows[0]).toMatchObject({
      status: 'active',
      email: user.identity.email,
    });
    expect(
      (await request(app).get('/api/auth/me').set('Cookie', user.cookie)).status,
    ).toBe(200);
  });

  it('anonymises the account, keeps content and votes, revokes sessions and frees the identity', async () => {
    const author = await createVerifiedUser();
    const voter = await createVerifiedUser();
    const moderator = await createVerifiedUser('moderator');

    await request(app)
      .patch('/api/users/me')
      .set('Cookie', author.cookie)
      .send({
        bio: 'Private bio',
        skills: ['TypeScript'],
        interests: ['Databases'],
      });
    const questionId = await createQuestion(author.cookie, `Deactivate question ${runId}`);
    const slug = await approveWithTopic(moderator.cookie, questionId, `Deactivate topic ${runId}`);
    const perspectiveId = await addPerspective(author.cookie, slug, 'Deactivate perspective');
    expect(
      (
        await request(app)
          .post(`/api/perspectives/${perspectiveId}/upvote`)
          .set('Cookie', voter.cookie)
      ).status,
    ).toBe(200);

    const secondLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: author.identity.email, password: author.identity.password });
    const secondCookie = cookieFrom(secondLogin);

    await pool.query(
      'INSERT INTO oauth_identities (user_id, provider, provider_user_id) VALUES ($1, $2, $3)',
      [author.userId, 'github', `gh-${runId}`],
    );
    await pool.query(
      "INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [author.userId, `verify-${runId}`],
    );
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
      [author.userId, `reset-${runId}`],
    );
    await pool.query(
      "INSERT INTO expert_fingerprints (user_id, category_id, perspective_count, upvote_total, score, rank) VALUES ($1, $2, 1, 1, 1.0, 1)",
      [author.userId, categoryId],
    );

    const deactivation = await request(app)
      .post('/api/users/me/deactivate')
      .set('Cookie', author.cookie)
      .send({ password: author.identity.password, confirm: true });
    expect(deactivation.status).toBe(200);
    expect(deactivation.body.data.message).toBe('Account deactivated.');

    const row = await pool.query('SELECT * FROM users WHERE id = $1', [author.userId]);
    expect(row.rows[0]).toMatchObject({
      status: 'deactivated',
      full_name: 'Deactivated User',
      bio: null,
      technical_skills: [],
      areas_of_interest: [],
      email_public: false,
      password_hash: null,
    });
    expect(row.rows[0].username).toMatch(new RegExp(`^deleted-user-[0-9a-f]{10}$`));
    expect(row.rows[0].email).toBe(`${row.rows[0].username}@deleted.invalid`);
    expect(row.rows[0].deactivated_at).not.toBeNull();
    expect(row.rows[0].username).not.toBe(author.identity.username);
    expect(row.rows[0].email).not.toBe(author.identity.email);

    const oauth = await pool.query('SELECT 1 FROM oauth_identities WHERE user_id = $1', [
      author.userId,
    ]);
    const verification = await pool.query(
      'SELECT 1 FROM email_verification_tokens WHERE user_id = $1',
      [author.userId],
    );
    const reset = await pool.query('SELECT 1 FROM password_reset_tokens WHERE user_id = $1', [
      author.userId,
    ]);
    const fingerprint = await pool.query('SELECT 1 FROM expert_fingerprints WHERE user_id = $1', [
      author.userId,
    ]);
    expect(oauth.rowCount).toBe(0);
    expect(verification.rowCount).toBe(0);
    expect(reset.rowCount).toBe(0);
    expect(fingerprint.rowCount).toBe(0);

    const sessions = await pool.query(
      'SELECT 1 FROM sessions WHERE user_id = $1 AND revoked_at IS NULL',
      [author.userId],
    );
    expect(sessions.rowCount).toBe(0);

    const questionCount = await pool.query(
      'SELECT count(*)::int AS count FROM questions WHERE author_id = $1',
      [author.userId],
    );
    const perspectiveCount = await pool.query(
      'SELECT count(*)::int AS count FROM perspectives WHERE author_id = $1',
      [author.userId],
    );
    const voteCount = await pool.query(
      'SELECT count(*)::int AS count FROM perspective_votes WHERE perspective_id = $1',
      [perspectiveId],
    );
    expect(questionCount.rows[0].count).toBe(1);
    expect(perspectiveCount.rows[0].count).toBe(1);
    expect(voteCount.rows[0].count).toBe(1);

    const publicProfile = await request(app).get(`/api/users/${author.userId}`);
    expect(publicProfile.status).toBe(200);
    expect(publicProfile.body.data.user).toMatchObject({
      id: author.userId,
      username: row.rows[0].username,
      fullName: 'Deactivated User',
      bio: null,
      skills: [],
      interests: [],
    });

    const audit = await pool.query(
      "SELECT 1 FROM audit_logs WHERE actor_user_id = $1 AND action = 'account.deactivated'",
      [author.userId],
    );
    expect(audit.rowCount).toBe(1);

    expect((await request(app).get('/api/auth/me').set('Cookie', author.cookie)).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Cookie', secondCookie)).status).toBe(401);

    const loginByEmail = await request(app)
      .post('/api/auth/login')
      .send({ identifier: author.identity.email, password: author.identity.password });
    expect([401, 403]).toContain(loginByEmail.status);
    const loginByUsername = await request(app)
      .post('/api/auth/login')
      .send({ identifier: author.identity.username, password: author.identity.password });
    expect([401, 403]).toContain(loginByUsername.status);

    const reusable = await request(app).post('/api/auth/register').send(author.identity);
    expect(reusable.status).toBe(201);
    const reused = await pool.query(
      'SELECT id, email, username FROM users WHERE email = $1 AND username = $2',
      [author.identity.email, author.identity.username],
    );
    expect(reused.rows[0]).toMatchObject({
      email: author.identity.email,
      username: author.identity.username,
    });
    createdUserIds.push(reused.rows[0].id as string);
  });

  it('handles missing accounts and unusable password hashes safely', async () => {
    const user = await createVerifiedUser();

    const exportSpy = jest.spyOn(userRepository, 'findById').mockResolvedValueOnce(undefined);
    const missingExport = await request(app)
      .post('/api/users/me/export')
      .set('Cookie', user.cookie);
    exportSpy.mockRestore();
    expect(missingExport.status).toBe(404);
    expect(missingExport.body.error.code).toBe('USER_NOT_FOUND');

    const deactivateSpy = jest.spyOn(userRepository, 'findById').mockResolvedValueOnce(undefined);
    const missingDeactivate = await request(app)
      .post('/api/users/me/deactivate')
      .set('Cookie', user.cookie)
      .send({ password: user.identity.password, confirm: true });
    deactivateSpy.mockRestore();
    expect(missingDeactivate.status).toBe(404);
    expect(missingDeactivate.body.error.code).toBe('USER_NOT_FOUND');

    await pool.query('UPDATE users SET password_hash = NULL WHERE id = $1', [user.userId]);
    const passwordless = await request(app)
      .post('/api/users/me/deactivate')
      .set('Cookie', user.cookie)
      .send({ password: user.identity.password, confirm: true });
    expect(passwordless.status).toBe(401);
    expect(passwordless.body.error.code).toBe('INVALID_PASSWORD');

    await pool.query("UPDATE users SET password_hash = 'not-a-valid-hash' WHERE id = $1", [
      user.userId,
    ]);
    const malformed = await request(app)
      .post('/api/users/me/deactivate')
      .set('Cookie', user.cookie)
      .send({ password: user.identity.password, confirm: true });
    expect(malformed.status).toBe(401);
    expect(malformed.body.error.code).toBe('INVALID_PASSWORD');
  });

  it('rolls back the whole deactivation when a transactional step fails', async () => {
    const user = await createVerifiedUser();
    const spy = jest
      .spyOn(accountRepository, 'deleteFingerprints')
      .mockRejectedValueOnce(new Error('forced transactional failure'));

    try {
      const res = await request(app)
        .post('/api/users/me/deactivate')
        .set('Cookie', user.cookie)
        .send({ password: user.identity.password, confirm: true });
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
    }

    const row = await pool.query('SELECT status, email, username FROM users WHERE id = $1', [
      user.userId,
    ]);
    expect(row.rows[0]).toMatchObject({
      status: 'active',
      email: user.identity.email,
      username: user.identity.username,
    });
    expect(
      (await request(app).get('/api/auth/me').set('Cookie', user.cookie)).status,
    ).toBe(200);
  });
});
