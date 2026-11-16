import request from 'supertest';
import { createApp } from '../src/app';
import { closeDatabaseConnection, pool } from '../src/config/database';
import { emailService } from '../src/services/emailService';

jest.mock('../src/services/emailService', () => ({
  emailService: { sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() },
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

function uniqueIdentity(): Identity {
  seq += 1;
  const password = 'Str0ng!Passw0rd';
  const username = `p${runId}${seq}`.slice(0, 30);
  return {
    fullName: `Profile Test ${seq}`,
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

  if (role === 'moderator') {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['moderator', userId]);
  }

  return { identity, cookie: cookieFrom(login), userId };
}

async function createQuestion(cookie: string, title: string): Promise<string> {
  const res = await request(app).post('/api/questions').set('Cookie', cookie).send({
    title,
    description: 'Question created for profile stats tests.',
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
        description: 'Topic created for profile stats tests.',
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
      explanation: 'Explanation for the profile stats test perspective.',
      advantages: ['Advantage'],
      limitations: ['Limitation'],
    });
  expect(res.status).toBe(201);
  return res.body.data.perspective.id as string;
}

function getProfile(userId: string, cookie?: string) {
  const req = request(app).get(`/api/users/${userId}`);
  return cookie ? req.set('Cookie', cookie) : req;
}

describe('Profile management (FR-PROF-01/02)', () => {
  beforeAll(async () => {
    const category = await pool.query("SELECT id FROM categories WHERE name = 'Debugging'");
    categoryId = category.rows[0].id as string;
    await pool.query('DELETE FROM login_attempts');
  });

  afterAll(async () => {
    const emailPattern = `p${runId}%@example.com`;
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

  it('public view hides email by default; the owner sees it', async () => {
    const author = await createVerifiedUser();
    const newUsername = `${author.identity.username}x`;
    const update = await request(app)
      .patch('/api/users/me')
      .set('Cookie', author.cookie)
      .send({
        fullName: 'Updated Profile Name',
        username: newUsername,
        bio: 'I build reliable systems.',
        skills: ['TypeScript', 'PostgreSQL'],
        interests: ['Security', 'Databases'],
      });
    expect(update.status).toBe(200);
    expect(update.body.data.user).toMatchObject({
      username: newUsername,
      fullName: 'Updated Profile Name',
      bio: 'I build reliable systems.',
      skills: ['TypeScript', 'PostgreSQL'],
      interests: ['Security', 'Databases'],
      email: author.identity.email,
      emailPublic: false,
    });

    const publicView = await getProfile(author.userId);
    expect(publicView.status).toBe(200);
    expect(publicView.body.data.user).toMatchObject({
      username: newUsername,
      fullName: 'Updated Profile Name',
      bio: 'I build reliable systems.',
      skills: ['TypeScript', 'PostgreSQL'],
      interests: ['Security', 'Databases'],
      emailPublic: false,
    });
    expect(publicView.body.data.user.email).toBeUndefined();
    expect(publicView.body.data.user.joinedAt).toBeDefined();
    expect(publicView.body.data.user.stats).toBeDefined();

    const ownerView = await getProfile(author.userId, author.cookie);
    expect(ownerView.status).toBe(200);
    expect(ownerView.body.data.user.email).toBe(author.identity.email);

    const makePublic = await request(app)
      .patch('/api/users/me')
      .set('Cookie', author.cookie)
      .send({ emailPublic: true });
    expect(makePublic.status).toBe(200);
    expect(makePublic.body.data.user.emailPublic).toBe(true);

    const publicWithEmail = await getProfile(author.userId);
    expect(publicWithEmail.body.data.user.email).toBe(author.identity.email);
  });

  it('reports stats and ignores hidden perspectives and their upvotes', async () => {
    const author = await createVerifiedUser();
    const voter = await createVerifiedUser();
    const moderator = await createVerifiedUser('moderator');

    const firstQuestion = await createQuestion(author.cookie, `Stats question one ${runId}`);
    const secondQuestion = await createQuestion(author.cookie, `Stats question two ${runId}`);
    const firstSlug = await approveWithTopic(
      moderator.cookie,
      firstQuestion,
      `Stats topic one ${runId}`,
    );
    const secondSlug = await approveWithTopic(
      moderator.cookie,
      secondQuestion,
      `Stats topic two ${runId}`,
    );

    const visiblePerspective = await addPerspective(
      author.cookie,
      firstSlug,
      'Visible contribution',
    );
    const hiddenPerspective = await addPerspective(author.cookie, secondSlug, 'Hidden contribution');

    expect(
      (await request(app)
        .post(`/api/perspectives/${visiblePerspective}/upvote`)
        .set('Cookie', voter.cookie)).status,
    ).toBe(200);
    expect(
      (await request(app)
        .post(`/api/perspectives/${hiddenPerspective}/upvote`)
        .set('Cookie', voter.cookie)).status,
    ).toBe(200);

    await pool.query('UPDATE perspectives SET hidden = true WHERE id = $1', [hiddenPerspective]);

    const res = await getProfile(author.userId);
    expect(res.status).toBe(200);
    expect(res.body.data.user.stats).toEqual({
      questionsSubmitted: 2,
      perspectivesSubmitted: 1,
      totalUpvotesReceived: 1,
    });
  });

  it('rejects a username already taken by another user, case-insensitively', async () => {
    const first = await createVerifiedUser();
    const second = await createVerifiedUser();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', second.cookie)
      .send({ username: first.identity.username.toUpperCase() });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('enforces the bio, skills and interests limits', async () => {
    const user = await createVerifiedUser();

    const longBio = await request(app)
      .patch('/api/users/me')
      .set('Cookie', user.cookie)
      .send({ bio: 'x'.repeat(501) });
    expect(longBio.status).toBe(400);
    expect(longBio.body.error.code).toBe('VALIDATION_ERROR');
    expect(longBio.body.error.message).toContain('bio');

    const tooManySkills = await request(app)
      .patch('/api/users/me')
      .set('Cookie', user.cookie)
      .send({ skills: Array.from({ length: 11 }, (_, index) => `skill-${index}`) });
    expect(tooManySkills.status).toBe(400);
    expect(tooManySkills.body.error.message).toContain('skills');

    const longInterest = await request(app)
      .patch('/api/users/me')
      .set('Cookie', user.cookie)
      .send({ interests: ['x'.repeat(31)] });
    expect(longInterest.status).toBe(400);
    expect(longInterest.body.error.message).toContain('interests');
  });

  it('rejects a wrong current password and revokes all other sessions on success', async () => {
    const user = await createVerifiedUser();
    const secondLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: user.identity.email, password: user.identity.password });
    expect(secondLogin.status).toBe(200);
    const secondCookie = cookieFrom(secondLogin);

    const wrongCurrent = await request(app)
      .post('/api/users/me/change-password')
      .set('Cookie', user.cookie)
      .send({ currentPassword: 'NotThePassword1!', newPassword: 'N3w!Passw0rdLong' });
    expect(wrongCurrent.status).toBe(401);
    expect(wrongCurrent.body.error.code).toBe('INVALID_CURRENT_PASSWORD');

    const weakPassword = await request(app)
      .post('/api/users/me/change-password')
      .set('Cookie', user.cookie)
      .send({ currentPassword: user.identity.password, newPassword: 'weak1!' });
    expect(weakPassword.status).toBe(400);
    expect(weakPassword.body.error.code).toBe('VALIDATION_ERROR');

    const newPassword = 'N3w!Passw0rdLong';
    const changed = await request(app)
      .post('/api/users/me/change-password')
      .set('Cookie', user.cookie)
      .send({ currentPassword: user.identity.password, newPassword });
    expect(changed.status).toBe(200);
    expect(changed.body.data.message).toBe('Password changed successfully.');

    expect((await request(app).get('/api/auth/me').set('Cookie', secondCookie)).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Cookie', user.cookie)).status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: user.identity.email, password: user.identity.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: user.identity.email, password: newPassword });
    expect(newLogin.status).toBe(200);
  });
});
