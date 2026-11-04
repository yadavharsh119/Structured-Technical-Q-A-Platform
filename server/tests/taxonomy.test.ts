import request from 'supertest';
import { createApp } from '../src/app';
import { closeDatabaseConnection, pool } from '../src/config/database';
import { categoryRepository } from '../src/repositories/categoryRepository';
import { tagRepository } from '../src/repositories/tagRepository';
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

const createdUserIds: string[] = [];
const createdCategoryIds: string[] = [];
const createdTagIds: string[] = [];

function uniqueIdentity(): Identity {
  seq += 1;
  const password = 'Str0ng!Passw0rd';
  const username = `tx${runId}${seq}`.slice(0, 30);
  return {
    fullName: `Taxonomy Test ${seq}`,
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
  createdUserIds.push(userId);
  return { cookie: cookieFrom(login), userId };
}

async function createCategory(cookie: string, name: string, parentId?: string) {
  const res = await request(app)
    .post('/api/admin/categories')
    .set('Cookie', cookie)
    .send({
      name,
      description: `Description for ${name}`,
      ...(parentId !== undefined ? { parentId } : {}),
    });
  expect(res.status).toBe(201);
  const category = res.body.data.category as {
    id: string;
    name: string;
    parentId: string | null;
    isActive: boolean;
  };
  createdCategoryIds.push(category.id);
  return category;
}

async function createTag(cookie: string, name: string) {
  const res = await request(app)
    .post('/api/admin/tags')
    .set('Cookie', cookie)
    .send({ name });
  expect(res.status).toBe(201);
  const tag = res.body.data.tag as { id: string; name: string; isActive: boolean };
  createdTagIds.push(tag.id);
  return tag;
}

async function createTopic(
  cookie: string,
  title: string,
  categoryId: string,
  tagIds: string[] = [],
) {
  const res = await request(app)
    .post('/api/topics')
    .set('Cookie', cookie)
    .send({ title, description: `Description for ${title}`, categoryId, tagIds });
  expect([200, 201]).toContain(res.status);
  return res.body.data.topic as { id: string; slug: string; categoryId: string };
}

async function createQuestion(
  cookie: string,
  title: string,
  categoryId: string,
  tagIds: string[] = [],
) {
  return request(app)
    .post('/api/questions')
    .set('Cookie', cookie)
    .send({ title, description: `Description for ${title}`, categoryId, tagIds });
}

describe('Category and tag management API', () => {
  let moderator: TestUser;
  let admin: TestUser;
  let regular: TestUser;
  let seedCategoryId = '';

  beforeAll(async () => {
    const seed = await pool.query("SELECT id FROM categories WHERE name = 'Debugging'");
    seedCategoryId = seed.rows[0].id as string;

    moderator = await createVerifiedUser('moderator');
    admin = await createVerifiedUser('admin');
    regular = await createVerifiedUser();
  });

  afterAll(async () => {
    const userIds = createdUserIds;
    const categoryIds = createdCategoryIds;
    const tagIds = createdTagIds;
    const emailPattern = `tx${runId}%@example.com`;
    const users = 'SELECT id FROM users WHERE email LIKE $1';
    const topics = `SELECT id FROM topics WHERE created_by IN (${users})`;
    const questions = `SELECT id FROM questions WHERE author_id IN (${users})`;

    await pool.query(`DELETE FROM topic_slug_redirects WHERE topic_id IN (${topics})`, [emailPattern]);
    await pool.query(
      `DELETE FROM perspective_votes WHERE user_id IN (${users}) OR perspective_id IN (SELECT id FROM perspectives WHERE topic_id IN (${topics}))`,
      [emailPattern],
    );
    await pool.query(`DELETE FROM perspectives WHERE topic_id IN (${topics})`, [emailPattern]);
    await pool.query(
      `DELETE FROM topic_questions WHERE topic_id IN (${topics}) OR question_id IN (${questions})`,
      [emailPattern],
    );
    await pool.query(`DELETE FROM question_tags WHERE question_id IN (${questions})`, [emailPattern]);
    await pool.query(`DELETE FROM questions WHERE id IN (${questions})`, [emailPattern]);
    await pool.query(`DELETE FROM topic_tags WHERE topic_id IN (${topics})`, [emailPattern]);
    await pool.query(`DELETE FROM topics WHERE id IN (${topics})`, [emailPattern]);

    if (categoryIds.length > 0) {
      await pool.query('UPDATE categories SET parent_id = NULL WHERE id = ANY($1::uuid[])', [
        categoryIds,
      ]);
      await pool.query('DELETE FROM categories WHERE id = ANY($1::uuid[])', [categoryIds]);
    }
    if (tagIds.length > 0) {
      await pool.query('DELETE FROM tags WHERE id = ANY($1::uuid[])', [tagIds]);
    }
    if (userIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
    }
    await closeDatabaseConnection();
  });

  it('creates and edits categories and tags, exposing active rows publicly', async () => {
    const category = await createCategory(moderator.cookie, `Category ${runId}`);
    const child = await createCategory(admin.cookie, `Child ${runId}`, category.id);
    expect(child.parentId).toBe(category.id);

    const categoryEdit = await request(app)
      .patch(`/api/admin/categories/${category.id}`)
      .set('Cookie', moderator.cookie)
      .send({ name: `Category Edited ${runId}`, description: 'Updated description.' });
    expect(categoryEdit.status).toBe(200);
    expect(categoryEdit.body.data.category.name).toBe(`Category Edited ${runId}`);

    const publicCategories = await request(app).get('/api/categories');
    expect(publicCategories.status).toBe(200);
    const publicCategory = publicCategories.body.data.categories.find(
      (row: { id: string }) => row.id === category.id,
    );
    expect(publicCategory.name).toBe(`Category Edited ${runId}`);
    expect(publicCategory).toHaveProperty('parentId');
    expect(publicCategory.isActive).toBe(true);

    const adminCategories = await request(app)
      .get('/api/admin/categories')
      .set('Cookie', moderator.cookie);
    expect(adminCategories.status).toBe(200);
    expect(
      adminCategories.body.data.categories.map((row: { id: string }) => row.id),
    ).toEqual(expect.arrayContaining([category.id, child.id]));

    const tag = await createTag(moderator.cookie, `Tag${runId}`);
    const tagEdit = await request(app)
      .patch(`/api/admin/tags/${tag.id}`)
      .set('Cookie', admin.cookie)
      .send({ name: `TagEdited${runId}` });
    expect(tagEdit.status).toBe(200);
    expect(tagEdit.body.data.tag.name).toBe(`TagEdited${runId}`);

    const publicTags = await request(app).get('/api/tags');
    expect(publicTags.status).toBe(200);
    expect(publicTags.body.data.tags.map((row: { id: string }) => row.id)).toContain(tag.id);

    const adminTags = await request(app)
      .get('/api/admin/tags')
      .set('Cookie', moderator.cookie);
    expect(adminTags.status).toBe(200);
    expect(adminTags.body.data.tags.map((row: { id: string }) => row.id)).toContain(tag.id);

    const categoryAudit = await pool.query(
      'SELECT action FROM audit_logs WHERE target_id = $1 ORDER BY id',
      [category.id],
    );
    expect(categoryAudit.rows.map((row: { action: string }) => row.action)).toEqual(
      expect.arrayContaining(['category.create', 'category.update']),
    );
    const tagAudit = await pool.query('SELECT action FROM audit_logs WHERE target_id = $1', [
      tag.id,
    ]);
    expect(tagAudit.rows.map((row: { action: string }) => row.action)).toEqual(
      expect.arrayContaining(['tag.create', 'tag.update']),
    );
  });

  it('rejects self-parenting and circular parent chains', async () => {
    const first = await createCategory(moderator.cookie, `Cycle A ${runId}`);
    const second = await createCategory(moderator.cookie, `Cycle B ${runId}`);

    const self = await request(app)
      .patch(`/api/admin/categories/${first.id}`)
      .set('Cookie', moderator.cookie)
      .send({ parentId: first.id });
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe('VALIDATION_ERROR');

    const firstLink = await request(app)
      .patch(`/api/admin/categories/${second.id}`)
      .set('Cookie', moderator.cookie)
      .send({ parentId: first.id });
    expect(firstLink.status).toBe(200);

    const circular = await request(app)
      .patch(`/api/admin/categories/${first.id}`)
      .set('Cookie', moderator.cookie)
      .send({ parentId: second.id });
    expect(circular.status).toBe(400);
    expect(circular.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('deactivates a category without deleting or modifying its topics or questions', async () => {
    const category = await createCategory(moderator.cookie, `Deactivate ${runId}`);
    const topic = await createTopic(moderator.cookie, `Kept Topic ${runId}`, category.id);
    const question = await createQuestion(
      regular.cookie,
      `Kept Question ${runId}`,
      category.id,
    );
    expect(question.status).toBe(201);

    const deactivate = await request(app)
      .patch(`/api/admin/categories/${category.id}`)
      .set('Cookie', moderator.cookie)
      .send({ isActive: false });
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.category.isActive).toBe(false);

    const topicRow = await pool.query('SELECT category_id, status FROM topics WHERE id = $1', [
      topic.id,
    ]);
    expect(topicRow.rows[0].category_id).toBe(category.id);
    expect(topicRow.rows[0].status).toBe('published');

    const topicView = await request(app).get(`/api/topics/${topic.slug}`);
    expect(topicView.status).toBe(200);
    expect(topicView.body.data.topic.categoryId).toBe(category.id);

    const mine = await request(app).get('/api/questions/mine').set('Cookie', regular.cookie);
    expect(mine.status).toBe(200);
    const keptQuestion = mine.body.data.questions.find(
      (row: { id: string }) => row.id === question.body.data.question.id,
    );
    expect(keptQuestion.categoryId).toBe(category.id);

    const publicCategories = await request(app).get('/api/categories');
    expect(publicCategories.body.data.categories.map((row: { id: string }) => row.id)).not.toContain(
      category.id,
    );

    const adminCategories = await request(app)
      .get('/api/admin/categories')
      .set('Cookie', moderator.cookie);
    const adminRow = adminCategories.body.data.categories.find(
      (row: { id: string }) => row.id === category.id,
    );
    expect(adminRow.isActive).toBe(false);

    const audit = await pool.query('SELECT action FROM audit_logs WHERE target_id = $1', [
      category.id,
    ]);
    expect(audit.rows.map((row: { action: string }) => row.action)).toContain(
      'category.deactivate',
    );
  });

  it('rejects a duplicate tag name that differs only by case', async () => {
    const tag = await createTag(moderator.cookie, `CaseTag${runId}`);

    const duplicate = await request(app)
      .post('/api/admin/tags')
      .set('Cookie', moderator.cookie)
      .send({ name: `casetag${runId}` });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('TAG_NAME_EXISTS');

    const stillPublic = await request(app).get('/api/tags');
    expect(stillPublic.body.data.tags.filter((row: { id: string }) => row.id === tag.id)).toHaveLength(
      1,
    );
  });

  it('returns 403 when a regular user calls admin taxonomy endpoints', async () => {
    const listCategories = await request(app)
      .get('/api/admin/categories')
      .set('Cookie', regular.cookie);
    expect(listCategories.status).toBe(403);
    expect(listCategories.body.error.code).toBe('FORBIDDEN');

    const listTags = await request(app).get('/api/admin/tags').set('Cookie', regular.cookie);
    expect(listTags.status).toBe(403);

    const create = await request(app)
      .post('/api/admin/categories')
      .set('Cookie', regular.cookie)
      .send({ name: `Forbidden ${runId}` });
    expect(create.status).toBe(403);

    const createTagRes = await request(app)
      .post('/api/admin/tags')
      .set('Cookie', regular.cookie)
      .send({ name: `ForbiddenTag${runId}` });
    expect(createTagRes.status).toBe(403);

    const merge = await request(app)
      .post('/api/admin/tags/merge')
      .set('Cookie', regular.cookie)
      .send({
        sourceId: '00000000-0000-4000-8000-000000000001',
        destinationId: '00000000-0000-4000-8000-000000000002',
      });
    expect(merge.status).toBe(403);
  });

  it('merges tags by moving links without duplicates and deactivating the source', async () => {
    const source = await createTag(moderator.cookie, `MergeSource${runId}`);
    const destination = await createTag(moderator.cookie, `MergeDestination${runId}`);
    const topic = await createTopic(
      moderator.cookie,
      `Merge Tag Topic ${runId}`,
      seedCategoryId,
      [source.id, destination.id],
    );
    const question = await createQuestion(
      regular.cookie,
      `Merge Tag Question ${runId}`,
      seedCategoryId,
      [source.id, destination.id],
    );
    expect(question.status).toBe(201);
    const questionId = question.body.data.question.id as string;

    const merge = await request(app)
      .post('/api/admin/tags/merge')
      .set('Cookie', moderator.cookie)
      .send({ sourceId: source.id, destinationId: destination.id });
    expect(merge.status).toBe(200);
    expect(merge.body.data.source.isActive).toBe(false);
    expect(merge.body.data.destination.id).toBe(destination.id);

    const topicLinks = await pool.query(
      'SELECT tag_id FROM topic_tags WHERE topic_id = $1',
      [topic.id],
    );
    expect(topicLinks.rows.map((row: { tag_id: string }) => row.tag_id)).toEqual([
      destination.id,
    ]);

    const questionLinks = await pool.query(
      'SELECT tag_id FROM question_tags WHERE question_id = $1',
      [questionId],
    );
    expect(questionLinks.rows.map((row: { tag_id: string }) => row.tag_id)).toEqual([
      destination.id,
    ]);

    const sourceRow = await pool.query('SELECT is_active FROM tags WHERE id = $1', [source.id]);
    expect(sourceRow.rows[0].is_active).toBe(false);

    const publicTags = await request(app).get('/api/tags');
    const publicIds = publicTags.body.data.tags.map((row: { id: string }) => row.id);
    expect(publicIds).not.toContain(source.id);
    expect(publicIds).toContain(destination.id);

    const audit = await pool.query('SELECT action FROM audit_logs WHERE target_id = $1', [
      source.id,
    ]);
    expect(audit.rows.map((row: { action: string }) => row.action)).toContain('tag.merge');
  });

  it('rolls tag link moves back when the merge fails partway through', async () => {
    const source = await createTag(moderator.cookie, `AtomicSource${runId}`);
    const destination = await createTag(moderator.cookie, `AtomicDestination${runId}`);
    const topic = await createTopic(
      moderator.cookie,
      `Atomic Tag Topic ${runId}`,
      seedCategoryId,
      [source.id],
    );

    const spy = jest
      .spyOn(tagRepository, 'deactivate')
      .mockRejectedValueOnce(new Error('forced tag merge failure'));

    try {
      const merge = await request(app)
        .post('/api/admin/tags/merge')
        .set('Cookie', moderator.cookie)
        .send({ sourceId: source.id, destinationId: destination.id });
      expect(merge.status).toBe(500);
    } finally {
      spy.mockRestore();
    }

    const links = await pool.query('SELECT tag_id FROM topic_tags WHERE topic_id = $1', [
      topic.id,
    ]);
    expect(links.rows.map((row: { tag_id: string }) => row.tag_id)).toEqual([source.id]);

    const sourceRow = await pool.query('SELECT is_active FROM tags WHERE id = $1', [source.id]);
    expect(sourceRow.rows[0].is_active).toBe(true);
  });

  it('returns conflicts and 404s for duplicate, missing and raced taxonomy writes', async () => {
    const category = await createCategory(moderator.cookie, `Dup Category ${runId}`);
    const otherCategory = await createCategory(moderator.cookie, `Other Category ${runId}`);

    const duplicateCategory = await request(app)
      .post('/api/admin/categories')
      .set('Cookie', moderator.cookie)
      .send({ name: `dup category ${runId}` });
    expect(duplicateCategory.status).toBe(409);
    expect(duplicateCategory.body.error.code).toBe('CATEGORY_NAME_EXISTS');

    const categoryClash = await request(app)
      .patch(`/api/admin/categories/${otherCategory.id}`)
      .set('Cookie', moderator.cookie)
      .send({ name: category.name.toUpperCase() });
    expect(categoryClash.status).toBe(409);
    expect(categoryClash.body.error.code).toBe('CATEGORY_NAME_EXISTS');

    const missingCategory = await request(app)
      .patch('/api/admin/categories/00000000-0000-4000-8000-000000000001')
      .set('Cookie', moderator.cookie)
      .send({ description: 'nope' });
    expect(missingCategory.status).toBe(404);
    expect(missingCategory.body.error.code).toBe('CATEGORY_NOT_FOUND');

    const tag = await createTag(moderator.cookie, `DupTag${runId}`);
    const otherTag = await createTag(moderator.cookie, `OtherTag${runId}`);

    const tagClash = await request(app)
      .patch(`/api/admin/tags/${otherTag.id}`)
      .set('Cookie', moderator.cookie)
      .send({ name: tag.name.toUpperCase() });
    expect(tagClash.status).toBe(409);
    expect(tagClash.body.error.code).toBe('TAG_NAME_EXISTS');

    const missingTag = await request(app)
      .patch('/api/admin/tags/00000000-0000-4000-8000-000000000002')
      .set('Cookie', moderator.cookie)
      .send({ isActive: false });
    expect(missingTag.status).toBe(404);
    expect(missingTag.body.error.code).toBe('TAG_NOT_FOUND');

    const missingSource = await request(app)
      .post('/api/admin/tags/merge')
      .set('Cookie', moderator.cookie)
      .send({
        sourceId: '00000000-0000-4000-8000-000000000003',
        destinationId: tag.id,
      });
    expect(missingSource.status).toBe(404);
    expect(missingSource.body.error.code).toBe('TAG_NOT_FOUND');

    const missingDestination = await request(app)
      .post('/api/admin/tags/merge')
      .set('Cookie', moderator.cookie)
      .send({
        sourceId: tag.id,
        destinationId: '00000000-0000-4000-8000-000000000004',
      });
    expect(missingDestination.status).toBe(404);
    expect(missingDestination.body.error.code).toBe('TAG_NOT_FOUND');

    // Simulate a concurrent writer winning the unique-index race after our
    // pre-check, which the services must still translate into a 409.
    const createCategorySpy = jest
      .spyOn(categoryRepository, 'create')
      .mockRejectedValueOnce({ code: '23505' });
    try {
      const racedCategory = await request(app)
        .post('/api/admin/categories')
        .set('Cookie', moderator.cookie)
        .send({ name: `Raced Category ${runId}` });
      expect(racedCategory.status).toBe(409);
      expect(racedCategory.body.error.code).toBe('CATEGORY_NAME_EXISTS');
    } finally {
      createCategorySpy.mockRestore();
    }

    const updateCategorySpy = jest
      .spyOn(categoryRepository, 'update')
      .mockRejectedValueOnce({ code: '23505' });
    try {
      const racedCategoryUpdate = await request(app)
        .patch(`/api/admin/categories/${category.id}`)
        .set('Cookie', moderator.cookie)
        .send({ description: 'raced' });
      expect(racedCategoryUpdate.status).toBe(409);
    } finally {
      updateCategorySpy.mockRestore();
    }

    const createTagSpy = jest
      .spyOn(tagRepository, 'create')
      .mockRejectedValueOnce({ code: '23505' });
    try {
      const racedTag = await request(app)
        .post('/api/admin/tags')
        .set('Cookie', moderator.cookie)
        .send({ name: `RacedTag${runId}` });
      expect(racedTag.status).toBe(409);
      expect(racedTag.body.error.code).toBe('TAG_NAME_EXISTS');
    } finally {
      createTagSpy.mockRestore();
    }

    const updateTagSpy = jest
      .spyOn(tagRepository, 'update')
      .mockRejectedValueOnce({ code: '23505' });
    try {
      const racedTagUpdate = await request(app)
        .patch(`/api/admin/tags/${tag.id}`)
        .set('Cookie', moderator.cookie)
        .send({ name: `RacedTagUpdate${runId}` });
      expect(racedTagUpdate.status).toBe(409);
    } finally {
      updateTagSpy.mockRestore();
    }
  });

  it('rejects inactive categories and tags when a new question is submitted', async () => {
    const category = await createCategory(moderator.cookie, `Inactive ${runId}`);
    const tag = await createTag(moderator.cookie, `InactiveTag${runId}`);

    await request(app)
      .patch(`/api/admin/categories/${category.id}`)
      .set('Cookie', moderator.cookie)
      .send({ isActive: false })
      .expect(200);
    await request(app)
      .patch(`/api/admin/tags/${tag.id}`)
      .set('Cookie', moderator.cookie)
      .send({ isActive: false })
      .expect(200);

    const inactiveCategory = await createQuestion(
      regular.cookie,
      `Inactive Category Question ${runId}`,
      category.id,
    );
    expect(inactiveCategory.status).toBe(400);
    expect(inactiveCategory.body.error.code).toBe('VALIDATION_ERROR');
    expect(inactiveCategory.body.error.message).toMatch(/inactive/i);

    const inactiveTag = await createQuestion(
      regular.cookie,
      `Inactive Tag Question ${runId}`,
      seedCategoryId,
      [tag.id],
    );
    expect(inactiveTag.status).toBe(400);
    expect(inactiveTag.body.error.code).toBe('VALIDATION_ERROR');
    expect(inactiveTag.body.error.message).toMatch(/inactive/i);

    const inactiveTopic = await request(app)
      .post('/api/topics')
      .set('Cookie', moderator.cookie)
      .send({
        title: `Inactive Tag Topic ${runId}`,
        description: 'Should be rejected.',
        categoryId: seedCategoryId,
        tagIds: [tag.id],
      });
    expect(inactiveTopic.status).toBe(400);
    expect(inactiveTopic.body.error.message).toMatch(/inactive/i);
  });
});
