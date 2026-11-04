import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { createApp } from '../src/app';
import { closeDatabaseConnection, pool } from '../src/config/database';
import { emailService } from '../src/services/emailService';

jest.mock('../src/services/emailService', () => ({
  emailService: { sendVerificationEmail: jest.fn() },
}));

const app = createApp();
const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const uploadDir = process.env.UPLOAD_DIR ?? '';
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
  const username = `at${runId}${seq}`.slice(0, 30);
  return {
    fullName: `Attachment Test ${seq}`,
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

function uploadFile(
  cookie: string,
  filename: string,
  content: Buffer,
  contentType = 'application/octet-stream',
) {
  return request(app)
    .post('/api/attachments')
    .set('Cookie', cookie)
    .attach('file', content, { filename, contentType });
}

async function uploadText(cookie: string, name = 'notes.txt'): Promise<string> {
  const res = await uploadFile(cookie, name, Buffer.from('hello from the test\n'), 'text/plain');
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

let categoryId = '';
let moderator: TestUser;
let admin: TestUser;
let topicSlug = '';

function questionPayload(attachmentIds: string[]) {
  return {
    title: `Attachment question ${runId}-${seq}`,
    description: 'Question with an attached file.',
    categoryId,
    tagIds: [],
    attachmentIds,
  };
}

async function createTopic(title: string): Promise<string> {
  const author = await createVerifiedUser();
  const question = await request(app).post('/api/questions').set('Cookie', author.cookie).send({
    title: `Topic scaffold ${title}`,
    description: 'Scaffold question for attachment tests.',
    categoryId,
    tagIds: [],
  });
  expect(question.status).toBe(201);
  const approve = await request(app)
    .post(`/api/questions/${question.body.data.question.id}/approve`)
    .set('Cookie', moderator.cookie)
    .send({
      createTopic: {
        title,
        description: 'Topic used by attachment tests.',
        categoryId,
        tagIds: [],
      },
    });
  expect(approve.status).toBe(200);
  return approve.body.data.topic.slug as string;
}

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('png-body'),
]);

describe('Attachment upload and download API', () => {
  beforeAll(async () => {
    const category = await pool.query("SELECT id FROM categories WHERE name = 'Debugging'");
    categoryId = category.rows[0].id;
    moderator = await createVerifiedUser('moderator');
    admin = await createVerifiedUser('admin');
    topicSlug = await createTopic(`Attachment Topic ${runId}`);
  });

  afterAll(async () => {
    const emailPattern = [`at${runId}%@example.com`];
    await pool.query(
      'DELETE FROM attachments WHERE uploader_id IN (SELECT id FROM users WHERE email LIKE $1)',
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
    if (uploadDir) {
      await fs.promises.rm(uploadDir, { recursive: true, force: true });
    }
    await closeDatabaseConnection();
  });

  it('uploads a valid file with a generated stored name', async () => {
    const user = await createVerifiedUser();
    const res = await uploadFile(user.cookie, 'notes.txt', Buffer.from('plain text'), 'text/plain');

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'notes.txt',
      size: 10,
      type: 'text/plain',
    });
    expect(typeof res.body.data.id).toBe('string');

    const row = await pool.query('SELECT stored_name FROM attachments WHERE id = $1', [
      res.body.data.id,
    ]);
    expect(row.rows[0].stored_name).not.toBe('notes.txt');
    expect(fs.existsSync(path.join(uploadDir, row.rows[0].stored_name))).toBe(true);
  });

  it('accepts real PNG content', async () => {
    const user = await createVerifiedUser();
    const res = await uploadFile(user.cookie, 'screenshot.png', PNG, 'image/png');
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('image/png');
  });

  it('rejects files over 10 MB', async () => {
    const user = await createVerifiedUser();
    const res = await uploadFile(
      user.cookie,
      'large.txt',
      Buffer.alloc(10 * 1024 * 1024 + 1, 0x61),
      'text/plain',
    );
    expect(res.status).toBe(400);
  });

  it('rejects a disallowed extension', async () => {
    const user = await createVerifiedUser();
    const res = await uploadFile(user.cookie, 'malware.exe', Buffer.from('MZ...'));
    expect(res.status).toBe(400);
  });

  it('rejects a fake extension with the wrong content', async () => {
    const user = await createVerifiedUser();
    const res = await uploadFile(user.cookie, 'fake.pdf', Buffer.from('not a real pdf'));
    expect(res.status).toBe(400);
  });

  it('rejects more than three attachments', async () => {
    const user = await createVerifiedUser();
    const ids: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      ids.push(await uploadText(user.cookie, `file-${i}.txt`));
    }
    const res = await request(app)
      .post('/api/questions')
      .set('Cookie', user.cookie)
      .send(questionPayload(ids));
    expect(res.status).toBe(400);
  });

  it('rejects someone else attachment id', async () => {
    const owner = await createVerifiedUser();
    const other = await createVerifiedUser();
    const attachmentId = await uploadText(owner.cookie);

    const res = await request(app)
      .post('/api/questions')
      .set('Cookie', other.cookie)
      .send(questionPayload([attachmentId]));
    expect(res.status).toBe(400);
  });

  it('enforces download permissions for pending and approved questions', async () => {
    const submitter = await createVerifiedUser();
    const stranger = await createVerifiedUser();
    const attachmentId = await uploadText(submitter.cookie);

    const created = await request(app)
      .post('/api/questions')
      .set('Cookie', submitter.cookie)
      .send(questionPayload([attachmentId]));
    expect(created.status).toBe(201);
    expect(created.body.data.question.attachments).toHaveLength(1);
    expect(created.body.data.question.attachments[0].id).toBe(attachmentId);
    const questionId = created.body.data.question.id as string;

    const denied = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set('Cookie', stranger.cookie);
    expect(denied.status).toBe(403);

    const own = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set('Cookie', submitter.cookie);
    expect(own.status).toBe(200);
    expect(own.headers['content-disposition']).toMatch(/^attachment;/);
    expect(own.headers['x-content-type-options']).toBe('nosniff');

    const moderatorDownload = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set('Cookie', moderator.cookie);
    expect(moderatorDownload.status).toBe(200);

    const approved = await request(app)
      .post(`/api/questions/${questionId}/approve`)
      .set('Cookie', moderator.cookie)
      .send({
        createTopic: {
          title: `Approved attachment question ${runId}-${seq}`,
          description: 'Topic created while approving the attachment question.',
          categoryId,
          tagIds: [],
        },
      });
    expect(approved.status).toBe(200);

    const publicDownload = await request(app).get(
      `/api/attachments/${attachmentId}/download`,
    );
    expect(publicDownload.status).toBe(200);
  });

  it('blocks suspended users from uploading', async () => {
    const user = await createVerifiedUser();
    await pool.query(
      "UPDATE users SET status = 'suspended', suspended_until = now() + interval '1 day' WHERE id = $1",
      [user.userId],
    );

    const res = await uploadFile(user.cookie, 'blocked.txt', Buffer.from('no'));
    expect(res.status).toBe(403);
  });

  it('hard-deleting a perspective removes its attachment file', async () => {
    const author = await createVerifiedUser();
    const attachmentId = await uploadText(author.cookie, 'evidence.log');

    const created = await request(app)
      .post(`/api/topics/${topicSlug}/perspectives`)
      .set('Cookie', author.cookie)
      .send({
        proposedSolution: 'Attach the evidence.',
        explanation: 'The log file proves the behaviour.',
        advantages: ['Concrete evidence'],
        limitations: ['Log is short'],
        codeSnippets: [],
        references: [],
        attachmentIds: [attachmentId],
      });
    expect(created.status).toBe(201);
    expect(created.body.data.perspective.attachments).toHaveLength(1);
    const perspectiveId = created.body.data.perspective.id as string;

    const row = await pool.query('SELECT stored_name FROM attachments WHERE id = $1', [
      attachmentId,
    ]);
    const storedName = row.rows[0].stored_name as string;
    expect(fs.existsSync(path.join(uploadDir, storedName))).toBe(true);

    const deleted = await request(app)
      .delete(`/api/admin/perspectives/${perspectiveId}?hard=true`)
      .set('Cookie', admin.cookie)
      .send({ reason: 'Attachment cleanup test' });
    expect(deleted.status).toBe(200);

    expect(fs.existsSync(path.join(uploadDir, storedName))).toBe(false);
    const remaining = await pool.query('SELECT id FROM attachments WHERE id = $1', [
      attachmentId,
    ]);
    expect(remaining.rowCount).toBe(0);
  });
});
