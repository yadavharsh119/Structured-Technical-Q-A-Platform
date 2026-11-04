import { questionService } from '../src/services/questionService';
import { topicService } from '../src/services/topicService';
import { categoryRepository } from '../src/repositories/categoryRepository';
import { questionRepository } from '../src/repositories/questionRepository';
import { tagRepository } from '../src/repositories/tagRepository';
import { topicRepository } from '../src/repositories/topicRepository';
import type { QuestionRow } from '../src/repositories/questionRepository';
import type { TopicRow } from '../src/repositories/topicRepository';

jest.mock('../src/config/database', () => ({
  db: {
    transaction: () => ({
      execute: (cb: (trx: unknown) => Promise<unknown>) => cb({ isTrx: true }),
    }),
  },
}));

jest.mock('../src/repositories/categoryRepository', () => ({
  categoryRepository: { listActive: jest.fn(), findById: jest.fn() },
}));

jest.mock('../src/repositories/tagRepository', () => ({
  tagRepository: {
    listActive: jest.fn(),
    findByIds: jest.fn(),
    namesByQuestionIds: jest.fn(),
    namesByTopicIds: jest.fn(),
  },
}));

jest.mock('../src/repositories/questionRepository', () => ({
  questionRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForUpdate: jest.fn(),
    update: jest.fn(),
    replaceTags: jest.fn(),
    remove: jest.fn(),
    listByAuthor: jest.fn(),
    listPending: jest.fn(),
    listApprovedByTopicId: jest.fn(),
    markApproved: jest.fn(),
    markRejected: jest.fn(),
  },
}));

jest.mock('../src/repositories/topicRepository', () => ({
  topicRepository: {
    listPublished: jest.fn(),
    findBySlug: jest.fn(),
    findById: jest.fn(),
    existsBySlug: jest.fn(),
    existsByTitle: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../src/services/accountStatusService', () => ({
  assertCanContribute: jest.fn().mockResolvedValue(undefined),
}));

const mockedCategory = categoryRepository as jest.Mocked<typeof categoryRepository>;
const mockedTag = tagRepository as jest.Mocked<typeof tagRepository>;
const mockedQuestion = questionRepository as jest.Mocked<typeof questionRepository>;
const mockedTopic = topicRepository as jest.Mocked<typeof topicRepository>;

const AUTHOR = '11111111-1111-4111-8111-111111111111';
const REVIEWER = '22222222-2222-4222-8222-222222222222';
const CATEGORY_ID = '33333333-3333-4333-8333-333333333333';
const TAG_A = '44444444-4444-4444-8444-444444444444';
const TAG_B = '55555555-5555-4555-8555-555555555555';

function questionRow(overrides: Partial<QuestionRow> = {}): QuestionRow {
  return {
    id: '66666666-6666-4666-8666-666666666666',
    author_id: AUTHOR,
    title: 'How do I debug a deadlock?',
    description: 'Deadlock description',
    category_id: CATEGORY_ID,
    tech_stack: null,
    status: 'pending',
    rejection_reason: null,
    reviewed_by: null,
    reviewed_at: null,
    topic_id: null,
    flagged: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function topicRow(overrides: Partial<TopicRow> = {}): TopicRow {
  return {
    id: '77777777-7777-4777-8777-777777777777',
    title: 'Debugging Deadlocks',
    slug: 'debugging-deadlocks',
    description: 'Topic about deadlocks',
    category_id: CATEGORY_ID,
    is_curated: false,
    status: 'published',
    created_by: REVIEWER,
    merged_into_topic_id: null,
    hidden: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    search_vector: '',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedCategory.findById.mockResolvedValue({
    id: CATEGORY_ID,
    name: 'Debugging',
    description: null,
    parent_id: null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  });
  mockedTag.findByIds.mockImplementation(async (ids: string[]) =>
    [
      { id: TAG_A, name: 'react', is_active: true, created_at: new Date() },
      { id: TAG_B, name: 'nodejs', is_active: true, created_at: new Date() },
    ].filter((tag) => ids.includes(tag.id)),
  );
  mockedTag.namesByQuestionIds.mockResolvedValue(new Map());
  mockedTag.namesByTopicIds.mockResolvedValue(new Map());
  mockedTopic.existsBySlug.mockResolvedValue(false);
  mockedTopic.existsByTitle.mockResolvedValue(false);
});

describe('questionService.create', () => {
  it('creates a pending question with deduplicated existing tags', async () => {
    mockedQuestion.create.mockResolvedValue(questionRow());

    const question = await questionService.create(
      {
        title: 'How do I debug a deadlock?',
        description: 'Deadlock description',
        categoryId: CATEGORY_ID,
        tagIds: [TAG_A, TAG_A, TAG_B],
      },
      AUTHOR,
    );

    expect(question.status).toBe('pending');
    expect(question.tags).toEqual(['react', 'nodejs']);
    expect(mockedQuestion.create).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: AUTHOR, category_id: CATEGORY_ID }),
      [TAG_A, TAG_B],
    );
  });

  it('rejects an unknown category with VALIDATION_ERROR', async () => {
    mockedCategory.findById.mockResolvedValue(undefined);

    await expect(
      questionService.create(
        { title: 'T', description: 'D', categoryId: CATEGORY_ID, tagIds: [] },
        AUTHOR,
      ),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    expect(mockedQuestion.create).not.toHaveBeenCalled();
  });

  it('rejects unknown tags with VALIDATION_ERROR', async () => {
    mockedTag.findByIds.mockResolvedValue([]);

    await expect(
      questionService.create(
        { title: 'T', description: 'D', categoryId: CATEGORY_ID, tagIds: [TAG_A] },
        AUTHOR,
      ),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    expect(mockedQuestion.create).not.toHaveBeenCalled();
  });
});

describe('questionService.update', () => {
  it('throws QUESTION_NOT_FOUND when the question does not exist', async () => {
    mockedQuestion.findById.mockResolvedValue(undefined);

    await expect(
      questionService.update('missing', AUTHOR, { title: 'New title' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'QUESTION_NOT_FOUND' });
  });

  it('throws FORBIDDEN when the caller is not the owner', async () => {
    mockedQuestion.findById.mockResolvedValue(questionRow());

    await expect(
      questionService.update('q', REVIEWER, { title: 'New title' }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('throws QUESTION_NOT_PENDING once the question is approved', async () => {
    mockedQuestion.findById.mockResolvedValue(questionRow({ status: 'approved' }));

    await expect(
      questionService.update('q', AUTHOR, { title: 'New title' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'QUESTION_NOT_PENDING' });
  });

  it('updates only the provided fields and replaces tags', async () => {
    mockedQuestion.findById.mockResolvedValue(questionRow());
    mockedQuestion.update.mockResolvedValue(questionRow({ title: 'New title' }));

    const question = await questionService.update('q', AUTHOR, {
      title: 'New title',
      tagIds: [TAG_A],
    });

    expect(question.title).toBe('New title');
    expect(mockedQuestion.update).toHaveBeenCalledWith('q', { title: 'New title' });
    expect(mockedQuestion.replaceTags).toHaveBeenCalledWith('q', [TAG_A]);
  });
});

describe('questionService.remove', () => {
  it('deletes a pending question owned by the caller', async () => {
    mockedQuestion.findById.mockResolvedValue(questionRow());
    mockedQuestion.remove.mockResolvedValue(undefined);

    await questionService.remove('q', AUTHOR);

    expect(mockedQuestion.remove).toHaveBeenCalledWith('q');
  });

  it('throws QUESTION_NOT_PENDING for a rejected question', async () => {
    mockedQuestion.findById.mockResolvedValue(questionRow({ status: 'rejected' }));

    await expect(questionService.remove('q', AUTHOR)).rejects.toMatchObject({
      statusCode: 409,
      code: 'QUESTION_NOT_PENDING',
    });
  });

  it('throws FORBIDDEN for another user question', async () => {
    mockedQuestion.findById.mockResolvedValue(questionRow());

    await expect(questionService.remove('q', REVIEWER)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });
});

describe('questionService.reject', () => {
  it('rejects a pending question with reason and reviewer', async () => {
    mockedQuestion.findById.mockResolvedValue(questionRow());
    mockedQuestion.markRejected.mockResolvedValue(
      questionRow({ status: 'rejected', rejection_reason: 'Off topic' }),
    );

    const question = await questionService.reject('q', REVIEWER, { reason: 'Off topic' });

    expect(question.status).toBe('rejected');
    expect(question.rejectionReason).toBe('Off topic');
    expect(mockedQuestion.markRejected).toHaveBeenCalledWith('q', 'Off topic', REVIEWER);
  });

  it('throws QUESTION_NOT_PENDING when rejecting twice', async () => {
    mockedQuestion.findById.mockResolvedValue(questionRow({ status: 'rejected' }));

    await expect(questionService.reject('q', REVIEWER, { reason: 'again' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'QUESTION_NOT_PENDING',
    });
    expect(mockedQuestion.markRejected).not.toHaveBeenCalled();
  });
});

describe('questionService.approve', () => {
  it('links a pending question to an existing topic', async () => {
    mockedQuestion.findByIdForUpdate.mockResolvedValue(questionRow());
    mockedTopic.findById.mockResolvedValue(topicRow());
    mockedQuestion.markApproved.mockResolvedValue(questionRow({ status: 'approved' }));

    const result = await questionService.approve('q', REVIEWER, {
      linkTopicId: topicRow().id,
    });

    expect(result.question.status).toBe('approved');
    expect(result.topic.slug).toBe('debugging-deadlocks');
    expect(mockedQuestion.markApproved).toHaveBeenCalledWith('q', topicRow().id, REVIEWER, expect.anything());
    expect(mockedTopic.create).not.toHaveBeenCalled();
  });

  it('throws TOPIC_NOT_FOUND when the linked topic does not exist', async () => {
    mockedQuestion.findByIdForUpdate.mockResolvedValue(questionRow());
    mockedTopic.findById.mockResolvedValue(undefined);

    await expect(
      questionService.approve('q', REVIEWER, { linkTopicId: 'missing' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'TOPIC_NOT_FOUND' });
  });

  it('creates a published topic with a slug derived from the title', async () => {
    mockedQuestion.findByIdForUpdate.mockResolvedValue(questionRow());
    mockedTopic.existsBySlug.mockResolvedValue(false);
    mockedTopic.create.mockResolvedValue(topicRow({ title: 'New Topic', slug: 'new-topic' }));
    mockedQuestion.markApproved.mockResolvedValue(questionRow({ status: 'approved' }));

    const result = await questionService.approve('q', REVIEWER, {
      createTopic: { title: 'New Topic', description: 'Desc', categoryId: CATEGORY_ID, tagIds: [TAG_A] },
    });

    expect(result.topic.slug).toBe('new-topic');
    expect(result.topic.isCurated).toBe(false);
    expect(mockedTopic.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'new-topic', status: 'published', created_by: REVIEWER }),
      [TAG_A],
      expect.anything(),
    );
  });

  it('appends a numeric suffix when the slug collides', async () => {
    mockedQuestion.findByIdForUpdate.mockResolvedValue(questionRow());
    mockedTopic.existsBySlug.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockedTopic.create.mockResolvedValue(topicRow({ slug: 'new-topic-2' }));
    mockedQuestion.markApproved.mockResolvedValue(questionRow({ status: 'approved' }));

    await questionService.approve('q', REVIEWER, {
      createTopic: { title: 'New Topic', description: 'Desc', categoryId: CATEGORY_ID, tagIds: [] },
    });

    expect(mockedTopic.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'new-topic-2' }),
      [],
      expect.anything(),
    );
  });

  it('throws VALIDATION_ERROR when the topic title is already taken', async () => {
    mockedQuestion.findByIdForUpdate.mockResolvedValue(questionRow());
    mockedTopic.existsByTitle.mockResolvedValue(true);

    await expect(
      questionService.approve('q', REVIEWER, {
        createTopic: { title: 'New Topic', description: 'Desc', categoryId: CATEGORY_ID, tagIds: [] },
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    expect(mockedTopic.create).not.toHaveBeenCalled();
  });

  it('throws QUESTION_NOT_PENDING when approving an already approved question', async () => {
    mockedQuestion.findByIdForUpdate.mockResolvedValue(questionRow({ status: 'approved' }));

    await expect(
      questionService.approve('q', REVIEWER, { linkTopicId: topicRow().id }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'QUESTION_NOT_PENDING' });
  });

  it('throws QUESTION_NOT_FOUND for an unknown question', async () => {
    mockedQuestion.findByIdForUpdate.mockResolvedValue(undefined);

    await expect(
      questionService.approve('q', REVIEWER, { linkTopicId: topicRow().id }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'QUESTION_NOT_FOUND' });
  });
});

describe('topicService', () => {
  it('getBySlug throws TOPIC_NOT_FOUND for an unknown slug', async () => {
    mockedTopic.findBySlug.mockResolvedValue(undefined);

    await expect(topicService.getBySlug('nope')).rejects.toMatchObject({
      statusCode: 404,
      code: 'TOPIC_NOT_FOUND',
    });
  });

  it('getBySlug hides non-published topics', async () => {
    mockedTopic.findBySlug.mockResolvedValue(topicRow({ status: 'archived' }));

    await expect(topicService.getBySlug('debugging-deadlocks')).rejects.toMatchObject({
      statusCode: 404,
      code: 'TOPIC_NOT_FOUND',
    });
  });

  it('getBySlug returns the topic with its approved questions', async () => {
    mockedTopic.findBySlug.mockResolvedValue(topicRow());
    mockedQuestion.listApprovedByTopicId.mockResolvedValue([
      { ...questionRow({ status: 'approved', topic_id: topicRow().id }), author_username: 'alice' },
    ]);
    mockedTag.namesByTopicIds.mockResolvedValue(new Map([[topicRow().id, ['react']]]));
    mockedTag.namesByQuestionIds.mockResolvedValue(
      new Map([[questionRow().id, ['nodejs']]]),
    );

    const detail = await topicService.getBySlug('debugging-deadlocks');

    expect(detail.topic.tags).toEqual(['react']);
    expect(detail.questions).toHaveLength(1);
    expect(detail.questions[0]?.authorUsername).toBe('alice');
    expect(detail.questions[0]?.tags).toEqual(['nodejs']);
  });

  it('list returns only published topics with their tags', async () => {
    mockedTopic.listPublished.mockResolvedValue([topicRow()]);
    mockedTag.namesByTopicIds.mockResolvedValue(new Map([[topicRow().id, ['react']]]));

    const topics = await topicService.list();

    expect(topics).toHaveLength(1);
    expect(topics[0]?.slug).toBe('debugging-deadlocks');
    expect(topics[0]?.tags).toEqual(['react']);
  });
});
