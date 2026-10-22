import { perspectiveService } from '../src/services/perspectiveService';
import { perspectiveRepository } from '../src/repositories/perspectiveRepository';
import { topicRepository } from '../src/repositories/topicRepository';
import { userRepository } from '../src/repositories/userRepository';
import type { PerspectiveRow } from '../src/repositories/perspectiveRepository';
import type { TopicRow } from '../src/repositories/topicRepository';

jest.mock('../src/config/database', () => ({
  db: {
    transaction: () => ({
      execute: (cb: (trx: unknown) => Promise<unknown>) => cb({ isTrx: true }),
    }),
  },
}));

jest.mock('../src/repositories/perspectiveRepository', () => ({
  perspectiveRepository: {
    create: jest.fn(),
    findByTopicAndAuthor: jest.fn(),
    findById: jest.fn(),
    findByIdForUpdate: jest.fn(),
    listVisibleByTopicId: jest.fn(),
    findByIdsVisible: jest.fn(),
    hasVote: jest.fn(),
    addVote: jest.fn(),
    removeVote: jest.fn(),
    countVotesByPerspectiveIds: jest.fn(),
    votedPerspectiveIds: jest.fn(),
  },
}));

jest.mock('../src/repositories/topicRepository', () => ({
  topicRepository: {
    findBySlug: jest.fn(),
    findById: jest.fn(),
    existsBySlug: jest.fn(),
    existsByTitle: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../src/repositories/userRepository', () => ({
  userRepository: { findById: jest.fn() },
}));

const mockedPerspective = perspectiveRepository as jest.Mocked<typeof perspectiveRepository>;
const mockedTopic = topicRepository as jest.Mocked<typeof topicRepository>;
const mockedUser = userRepository as jest.Mocked<typeof userRepository>;

const AUTHOR = '11111111-1111-4111-8111-111111111111';
const VOTER = '22222222-2222-4222-8222-222222222222';
const TOPIC_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_TOPIC_ID = '44444444-4444-4444-8444-444444444444';

function topicRow(overrides: Partial<TopicRow> = {}): TopicRow {
  return {
    id: TOPIC_ID,
    title: 'Debugging Deadlocks',
    slug: 'debugging-deadlocks',
    description: 'Topic about deadlocks',
    category_id: '55555555-5555-4555-8555-555555555555',
    is_curated: false,
    status: 'published',
    created_by: '66666666-6666-4666-8666-666666666666',
    merged_into_topic_id: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    search_vector: '',
    ...overrides,
  };
}

function perspectiveRow(overrides: Partial<PerspectiveRow> = {}): PerspectiveRow {
  return {
    id: '77777777-7777-4777-8777-777777777777',
    topic_id: TOPIC_ID,
    author_id: AUTHOR,
    proposed_solution: 'Use a worker pool',
    explanation: 'Move JSON parsing off the event loop',
    advantages: ['Keeps the loop responsive'],
    limitations: ['Adds worker overhead'],
    code_snippets: [{ language: 'javascript', code: 'console.log(1)' }],
    reference_urls: ['https://example.com/benchmark'],
    status: 'visible',
    flagged: false,
    deleted_at: null,
    created_at: new Date('2026-01-02T00:00:00Z'),
    search_vector: '',
    ...overrides,
  };
}

function createInput() {
  return {
    proposedSolution: 'Use a worker pool',
    explanation: 'Move JSON parsing off the event loop',
    advantages: ['Keeps the loop responsive'],
    limitations: ['Adds worker overhead'],
    codeSnippets: [{ language: 'javascript', code: 'console.log(1)' }],
    references: ['https://example.com/benchmark'],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedTopic.findBySlug.mockResolvedValue(topicRow());
  mockedPerspective.findByTopicAndAuthor.mockResolvedValue(undefined);
  mockedPerspective.listVisibleByTopicId.mockResolvedValue([]);
  mockedPerspective.findByIdsVisible.mockResolvedValue([]);
  mockedPerspective.countVotesByPerspectiveIds.mockResolvedValue(new Map());
  mockedPerspective.votedPerspectiveIds.mockResolvedValue(new Set());
  mockedUser.findById.mockResolvedValue({
    id: AUTHOR,
    username: 'alice',
  } as Awaited<ReturnType<typeof userRepository.findById>>);
});

describe('perspectiveService.create', () => {
  it('creates a perspective on a published topic', async () => {
    mockedPerspective.create.mockResolvedValue(perspectiveRow());

    const perspective = await perspectiveService.create('debugging-deadlocks', createInput(), AUTHOR);

    expect(perspective.authorUsername).toBe('alice');
    expect(perspective.proposedSolution).toBe('Use a worker pool');
    expect(perspective.upvoteCount).toBe(0);
    expect(perspective.hasUpvoted).toBe(false);
    expect(perspective.codeSnippets).toEqual([{ language: 'javascript', code: 'console.log(1)' }]);
    expect(perspective.references).toEqual(['https://example.com/benchmark']);
    expect(mockedPerspective.create).toHaveBeenCalledWith(
      expect.objectContaining({ topic_id: TOPIC_ID, author_id: AUTHOR }),
    );
  });

  it('throws TOPIC_NOT_FOUND for an unknown slug', async () => {
    mockedTopic.findBySlug.mockResolvedValue(undefined);

    await expect(
      perspectiveService.create('nope', createInput(), AUTHOR),
    ).rejects.toMatchObject({ statusCode: 404, code: 'TOPIC_NOT_FOUND' });
    expect(mockedPerspective.create).not.toHaveBeenCalled();
  });

  it('throws TOPIC_NOT_FOUND when the topic is not published', async () => {
    mockedTopic.findBySlug.mockResolvedValue(topicRow({ status: 'archived' }));

    await expect(
      perspectiveService.create('debugging-deadlocks', createInput(), AUTHOR),
    ).rejects.toMatchObject({ statusCode: 404, code: 'TOPIC_NOT_FOUND' });
  });

  it('throws PERSPECTIVE_ALREADY_EXISTS on a second attempt by the same user', async () => {
    mockedPerspective.findByTopicAndAuthor.mockResolvedValue(perspectiveRow());

    await expect(
      perspectiveService.create('debugging-deadlocks', createInput(), AUTHOR),
    ).rejects.toMatchObject({ statusCode: 409, code: 'PERSPECTIVE_ALREADY_EXISTS' });
    expect(mockedPerspective.create).not.toHaveBeenCalled();
  });

  it('maps a unique-constraint race to PERSPECTIVE_ALREADY_EXISTS', async () => {
    mockedPerspective.create.mockRejectedValue(
      Object.assign(new Error('duplicate key'), { code: '23505' }),
    );

    await expect(
      perspectiveService.create('debugging-deadlocks', createInput(), AUTHOR),
    ).rejects.toMatchObject({ statusCode: 409, code: 'PERSPECTIVE_ALREADY_EXISTS' });
  });
});

describe('perspectiveService.list', () => {
  it('throws TOPIC_NOT_FOUND for an unknown slug', async () => {
    mockedTopic.findBySlug.mockResolvedValue(undefined);

    await expect(
      perspectiveService.list('nope', 'newest', null),
    ).rejects.toMatchObject({ statusCode: 404, code: 'TOPIC_NOT_FOUND' });
  });

  it('returns perspectives with counts and the caller vote state', async () => {
    const first = perspectiveRow({ id: '77777777-7777-4777-8777-777777777777' });
    const second = perspectiveRow({
      id: '88888888-8888-4888-8888-888888888888',
      created_at: new Date('2026-01-03T00:00:00Z'),
    });
    mockedPerspective.listVisibleByTopicId.mockResolvedValue([
      { ...first, author_username: 'alice' },
      { ...second, author_username: 'bob' },
    ]);
    mockedPerspective.countVotesByPerspectiveIds.mockResolvedValue(
      new Map([
        [first.id, 3],
        [second.id, 0],
      ]),
    );
    mockedPerspective.votedPerspectiveIds.mockResolvedValue(new Set([first.id]));

    const perspectives = await perspectiveService.list('debugging-deadlocks', 'newest', VOTER);

    expect(perspectives).toHaveLength(2);
    expect(perspectives[0]?.authorUsername).toBe('alice');
    expect(perspectives[0]?.upvoteCount).toBe(3);
    expect(perspectives[0]?.hasUpvoted).toBe(true);
    expect(perspectives[1]?.upvoteCount).toBe(0);
    expect(perspectives[1]?.hasUpvoted).toBe(false);
  });

  it('sorts by upvote count when sort is top', async () => {
    const low = perspectiveRow({ id: '77777777-7777-4777-8777-777777777777' });
    const high = perspectiveRow({ id: '88888888-8888-4888-8888-888888888888' });
    mockedPerspective.listVisibleByTopicId.mockResolvedValue([
      { ...low, author_username: 'alice' },
      { ...high, author_username: 'bob' },
    ]);
    mockedPerspective.countVotesByPerspectiveIds.mockResolvedValue(
      new Map([
        [low.id, 1],
        [high.id, 7],
      ]),
    );

    const perspectives = await perspectiveService.list('debugging-deadlocks', 'top', null);

    expect(perspectives[0]?.id).toBe(high.id);
    expect(perspectives[1]?.id).toBe(low.id);
  });
});

describe('perspectiveService.toggleUpvote', () => {
  it('throws PERSPECTIVE_NOT_FOUND for an unknown perspective', async () => {
    mockedPerspective.findByIdForUpdate.mockResolvedValue(undefined);

    await expect(perspectiveService.toggleUpvote('missing', VOTER)).rejects.toMatchObject({
      statusCode: 404,
      code: 'PERSPECTIVE_NOT_FOUND',
    });
  });

  it('throws CANNOT_VOTE_OWN for the author', async () => {
    mockedPerspective.findByIdForUpdate.mockResolvedValue(perspectiveRow());

    await expect(perspectiveService.toggleUpvote(perspectiveRow().id, AUTHOR)).rejects.toMatchObject({
      statusCode: 403,
      code: 'CANNOT_VOTE_OWN',
    });
    expect(mockedPerspective.addVote).not.toHaveBeenCalled();
    expect(mockedPerspective.removeVote).not.toHaveBeenCalled();
  });

  it('adds a vote and returns the new state', async () => {
    mockedPerspective.findByIdForUpdate.mockResolvedValue(perspectiveRow());
    mockedPerspective.hasVote.mockResolvedValue(false);
    mockedPerspective.countVotesByPerspectiveIds.mockResolvedValue(
      new Map([[perspectiveRow().id, 4]]),
    );

    const state = await perspectiveService.toggleUpvote(perspectiveRow().id, VOTER);

    expect(mockedPerspective.addVote).toHaveBeenCalledWith(perspectiveRow().id, VOTER, expect.anything());
    expect(mockedPerspective.removeVote).not.toHaveBeenCalled();
    expect(state).toEqual({ upvoteCount: 4, hasUpvoted: true });
  });

  it('removes an existing vote and returns the new state', async () => {
    mockedPerspective.findByIdForUpdate.mockResolvedValue(perspectiveRow());
    mockedPerspective.hasVote.mockResolvedValue(true);
    mockedPerspective.countVotesByPerspectiveIds.mockResolvedValue(
      new Map([[perspectiveRow().id, 2]]),
    );

    const state = await perspectiveService.toggleUpvote(perspectiveRow().id, VOTER);

    expect(mockedPerspective.removeVote).toHaveBeenCalledWith(perspectiveRow().id, VOTER, expect.anything());
    expect(mockedPerspective.addVote).not.toHaveBeenCalled();
    expect(state).toEqual({ upvoteCount: 2, hasUpvoted: false });
  });
});

describe('perspectiveService.compare', () => {
  const FIRST = '77777777-7777-4777-8777-777777777777';
  const SECOND = '88888888-8888-4888-8888-888888888888';

  it('throws TOPIC_NOT_FOUND for an unknown slug', async () => {
    mockedTopic.findBySlug.mockResolvedValue(undefined);

    await expect(
      perspectiveService.compare('nope', `${FIRST},${SECOND}`, null),
    ).rejects.toMatchObject({ statusCode: 404, code: 'TOPIC_NOT_FOUND' });
  });

  it('rejects a single id with INVALID_COMPARISON', async () => {
    await expect(perspectiveService.compare('debugging-deadlocks', FIRST, null)).rejects.toMatchObject(
      { statusCode: 400, code: 'INVALID_COMPARISON' },
    );
  });

  it('rejects four ids with INVALID_COMPARISON', async () => {
    await expect(
      perspectiveService.compare('debugging-deadlocks', `${FIRST},${FIRST},${FIRST},${FIRST}`, null),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_COMPARISON' });
  });

  it('rejects duplicate ids with INVALID_COMPARISON', async () => {
    await expect(
      perspectiveService.compare('debugging-deadlocks', `${FIRST},${FIRST}`, null),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_COMPARISON' });
  });

  it('rejects a malformed id with VALIDATION_ERROR', async () => {
    await expect(
      perspectiveService.compare('debugging-deadlocks', `${FIRST},not-a-uuid`, null),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('rejects ids from another topic with INVALID_COMPARISON', async () => {
    mockedPerspective.findByIdsVisible.mockResolvedValue([
      { ...perspectiveRow({ id: FIRST }), author_username: 'alice' },
      { ...perspectiveRow({ id: SECOND, topic_id: OTHER_TOPIC_ID }), author_username: 'bob' },
    ]);

    await expect(
      perspectiveService.compare('debugging-deadlocks', `${FIRST},${SECOND}`, null),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_COMPARISON' });
  });

  it('rejects unknown ids with INVALID_COMPARISON', async () => {
    mockedPerspective.findByIdsVisible.mockResolvedValue([
      { ...perspectiveRow({ id: FIRST }), author_username: 'alice' },
    ]);

    await expect(
      perspectiveService.compare('debugging-deadlocks', `${FIRST},${SECOND}`, null),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_COMPARISON' });
  });

  it('returns the perspectives in the requested order with scores', async () => {
    mockedPerspective.findByIdsVisible.mockResolvedValue([
      { ...perspectiveRow({ id: SECOND }), author_username: 'bob' },
      { ...perspectiveRow({ id: FIRST }), author_username: 'alice' },
    ]);
    mockedPerspective.countVotesByPerspectiveIds.mockResolvedValue(
      new Map([
        [FIRST, 5],
        [SECOND, 1],
      ]),
    );

    const perspectives = await perspectiveService.compare(
      'debugging-deadlocks',
      `${FIRST},${SECOND}`,
      null,
    );

    expect(perspectives).toHaveLength(2);
    expect(perspectives[0]?.id).toBe(FIRST);
    expect(perspectives[0]?.upvoteCount).toBe(5);
    expect(perspectives[1]?.id).toBe(SECOND);
    expect(perspectives[1]?.upvoteCount).toBe(1);
    expect(perspectives[1]?.authorUsername).toBe('bob');
  });
});
