import type { PerspectiveCreateInput } from '@structured-qa/shared';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { userRepository } from '../repositories/userRepository';
import { fingerprintRepository } from '../repositories/fingerprintRepository';
import {
  perspectiveRepository,
  type PerspectiveRow,
} from '../repositories/perspectiveRepository';
import { topicRepository } from '../repositories/topicRepository';

export interface PerspectiveCodeSnippetDto {
  language: string;
  code: string;
}

export interface PerspectiveDto {
  id: string;
  topicId: string;
  authorUsername: string;
  authorTopCategory: string | null;
  proposedSolution: string;
  explanation: string;
  advantages: string[];
  limitations: string[];
  codeSnippets: PerspectiveCodeSnippetDto[];
  references: string[];
  upvoteCount: number;
  hasUpvoted: boolean;
  createdAt: Date;
}

export interface VoteStateDto {
  upvoteCount: number;
  hasUpvoted: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function topicNotFound(): AppError {
  return new AppError('Topic not found.', 404, 'TOPIC_NOT_FOUND');
}

function perspectiveNotFound(): AppError {
  return new AppError('Perspective not found.', 404, 'PERSPECTIVE_NOT_FOUND');
}

function alreadyExists(): AppError {
  return new AppError('You have already shared a perspective on this topic.', 409, 'PERSPECTIVE_ALREADY_EXISTS');
}

function cannotVoteOwn(): AppError {
  return new AppError('You cannot upvote your own perspective.', 403, 'CANNOT_VOTE_OWN');
}

function invalidComparison(message: string): AppError {
  return new AppError(message, 400, 'INVALID_COMPARISON');
}

function validation(message: string): AppError {
  return new AppError(message, 400, 'VALIDATION_ERROR');
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === '23505'
  );
}

async function publishedTopicBySlug(slug: string, includeHidden = false) {
  const topic = await topicRepository.findBySlug(slug);
  if (!topic || topic.status !== 'published' || (!includeHidden && topic.hidden)) {
    throw topicNotFound();
  }
  return topic;
}

function toSnippetDtos(row: PerspectiveRow): PerspectiveCodeSnippetDto[] {
  return row.code_snippets.map((snippet) => ({
    language: String(snippet.language ?? ''),
    code: String(snippet.code ?? ''),
  }));
}

async function toDtos(
  rows: Array<PerspectiveRow & { author_username: string }>,
  viewerId: string | null,
): Promise<PerspectiveDto[]> {
  const ids = rows.map((row) => row.id);
  const counts = await perspectiveRepository.countVotesByPerspectiveIds(ids);
  const voted = viewerId
    ? await perspectiveRepository.votedPerspectiveIds(viewerId, ids)
    : new Set<string>();
  const authorLabels = await fingerprintRepository.topCategoryLabelsByUserIds([
    ...new Set(rows.map((row) => row.author_id)),
  ]);
  return rows.map((row) => ({
    id: row.id,
    topicId: row.topic_id,
    authorUsername: row.author_username,
    authorTopCategory: authorLabels.get(row.author_id) ?? null,
    proposedSolution: row.proposed_solution,
    explanation: row.explanation,
    advantages: row.advantages,
    limitations: row.limitations,
    codeSnippets: toSnippetDtos(row),
    references: row.reference_urls,
    upvoteCount: counts.get(row.id) ?? 0,
    hasUpvoted: voted.has(row.id),
    createdAt: row.created_at,
  }));
}

async function create(
  topicSlug: string,
  input: PerspectiveCreateInput,
  authorId: string,
): Promise<PerspectiveDto> {
  const topic = await publishedTopicBySlug(topicSlug);

  const existing = await perspectiveRepository.findByTopicAndAuthor(topic.id, authorId);
  if (existing) {
    throw alreadyExists();
  }

  let row: PerspectiveRow;
  try {
    row = await perspectiveRepository.create({
      topic_id: topic.id,
      author_id: authorId,
      proposed_solution: input.proposedSolution,
      explanation: input.explanation,
      advantages: input.advantages,
      limitations: input.limitations,
      code_snippets: input.codeSnippets,
      reference_urls: input.references,
    });
  } catch (err) {
    // Race: the same user submitted twice concurrently on the same topic
    if (isUniqueViolation(err)) {
      throw alreadyExists();
    }
    throw err;
  }

  const author = await userRepository.findById(authorId);
  const authorLabels = await fingerprintRepository.topCategoryLabelsByUserIds([authorId]);
  return {
    id: row.id,
    topicId: row.topic_id,
    authorUsername: author?.username ?? '',
    authorTopCategory: authorLabels.get(authorId) ?? null,
    proposedSolution: row.proposed_solution,
    explanation: row.explanation,
    advantages: row.advantages,
    limitations: row.limitations,
    codeSnippets: toSnippetDtos(row),
    references: row.reference_urls,
    upvoteCount: 0,
    hasUpvoted: false,
    createdAt: row.created_at,
  };
}

async function list(
  topicSlug: string,
  sort: 'newest' | 'top',
  viewerId: string | null,
  includeHidden = false,
): Promise<PerspectiveDto[]> {
  const topic = await publishedTopicBySlug(topicSlug, includeHidden);
  const rows = await perspectiveRepository.listVisibleByTopicId(topic.id, includeHidden);
  const dtos = await toDtos(rows, viewerId);
  if (sort === 'top') {
    dtos.sort(
      (a, b) =>
        b.upvoteCount - a.upvoteCount || b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }
  return dtos;
}

async function toggleUpvote(
  perspectiveId: string,
  userId: string,
): Promise<VoteStateDto> {
  return db.transaction().execute(async (trx) => {
    // Lock the perspective row so concurrent toggles serialize (double-click safe)
    const perspective = await perspectiveRepository.findByIdForUpdate(perspectiveId, trx);
    if (!perspective) {
      throw perspectiveNotFound();
    }
    if (perspective.author_id === userId) {
      throw cannotVoteOwn();
    }
    const hasVoted = await perspectiveRepository.hasVote(perspectiveId, userId, trx);
    if (hasVoted) {
      await perspectiveRepository.removeVote(perspectiveId, userId, trx);
    } else {
      await perspectiveRepository.addVote(perspectiveId, userId, trx);
    }
    const counts = await perspectiveRepository.countVotesByPerspectiveIds([perspectiveId], trx);
    return {
      upvoteCount: counts.get(perspectiveId) ?? 0,
      hasUpvoted: !hasVoted,
    };
  });
}

async function compare(
  topicSlug: string,
  idsParam: string,
  viewerId: string | null,
  includeHidden = false,
): Promise<PerspectiveDto[]> {
  const topic = await publishedTopicBySlug(topicSlug, includeHidden);

  const ids = idsParam
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  if (ids.length < 2 || ids.length > 3) {
    throw invalidComparison('Compare exactly two or three perspectives.');
  }
  if (new Set(ids).size !== ids.length) {
    throw invalidComparison('Perspective ids must be distinct.');
  }
  for (const id of ids) {
    if (!UUID_RE.test(id)) {
      throw validation('Each perspective id must be a valid identifier.');
    }
  }

  const rows = await perspectiveRepository.findByIdsVisible(ids, includeHidden);
  if (rows.length !== ids.length || rows.some((row) => row.topic_id !== topic.id)) {
    throw invalidComparison('All perspectives must belong to this topic.');
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((row): row is PerspectiveRow & { author_username: string } => row !== undefined);
  return toDtos(ordered, viewerId);
}

export const perspectiveService = {
  create,
  list,
  toggleUpvote,
  compare,
};
