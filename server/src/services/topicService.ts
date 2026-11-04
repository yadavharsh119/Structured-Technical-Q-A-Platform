import type { TopicCreateInput, TopicMergeInput, TopicUpdateInput } from '@structured-qa/shared';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { categoryRepository } from '../repositories/categoryRepository';
import { perspectiveRepository } from '../repositories/perspectiveRepository';
import { questionRepository } from '../repositories/questionRepository';
import { tagRepository } from '../repositories/tagRepository';
import { topicRepository, type TopicRow } from '../repositories/topicRepository';
import { auditService } from './auditService';
import type { QuestionDto } from './questionService';

export interface TopicDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  isCurated: boolean;
  status: 'published' | 'archived' | 'hidden';
  createdAt: Date;
  tags: string[];
}

export interface TopicDetailDto {
  topic: TopicDto;
  questions: QuestionDto[];
}

export interface TopicRedirectDto {
  redirectTo: { id: string; slug: string };
}

export type TopicLookupDto = TopicDetailDto | TopicRedirectDto;

export interface TopicCreateResult {
  topic: TopicDto;
  created: boolean;
}

export interface TopicMergeResult {
  source: TopicDto;
  destination: TopicDto;
}

function notFound(): AppError {
  return new AppError('Topic not found.', 404, 'TOPIC_NOT_FOUND');
}

function validation(message: string): AppError {
  return new AppError(message, 400, 'VALIDATION_ERROR');
}

function conflict(code: string, message: string): AppError {
  return new AppError(message, 409, code);
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === '23505'
  );
}

function errorCode(err: unknown): string {
  return err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR';
}

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
  return slug.length > 0 ? slug : 'topic';
}

function toDto(row: TopicRow, tags: string[]): TopicDto {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    categoryId: row.category_id,
    isCurated: row.is_curated,
    status: row.status,
    createdAt: row.created_at,
    tags,
  };
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  const category = await categoryRepository.findById(categoryId);
  if (!category || !category.is_active) {
    throw validation('Category not found.');
  }
}

async function assertTagsExist(tagIds: string[]): Promise<void> {
  if (tagIds.length === 0) {
    return;
  }
  const found = await tagRepository.findByIds(tagIds);
  if (found.length !== tagIds.length) {
    throw validation('One or more tags do not exist.');
  }
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;
  while (await topicRepository.existsBySlug(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function tagNamesFor(topicId: string): Promise<string[]> {
  return (await tagRepository.namesByTopicIds([topicId])).get(topicId) ?? [];
}

async function resolveRedirect(slug: string): Promise<{ id: string; slug: string } | null> {
  let current = slug;
  let target: TopicRow | undefined;
  const seen = new Set<string>();

  for (let hops = 0; hops < 10; hops += 1) {
    if (seen.has(current)) {
      throw notFound();
    }
    seen.add(current);

    const redirect = await topicRepository.findRedirect(current);
    if (!redirect) {
      return target ? { id: target.id, slug: target.slug } : null;
    }

    const found = await topicRepository.findById(redirect.topic_id);
    if (!found) {
      throw notFound();
    }
    target = found;
    current = found.slug;
  }

  throw notFound();
}

async function list(includeHidden = false): Promise<TopicDto[]> {
  const rows = await topicRepository.listPublished(includeHidden);
  const tagNames = await tagRepository.namesByTopicIds(rows.map((row) => row.id));
  return rows.map((row) => toDto(row, tagNames.get(row.id) ?? []));
}

async function getBySlug(slug: string, includeHidden = false): Promise<TopicLookupDto> {
  const redirectTo = await resolveRedirect(slug);
  if (redirectTo) {
    return { redirectTo };
  }

  const row = await topicRepository.findBySlug(slug);
  if (
    !row ||
    (row.status !== 'published' && row.status !== 'archived') ||
    (!includeHidden && row.hidden)
  ) {
    throw notFound();
  }

  const [topicTagNames, questionRows] = await Promise.all([
    tagRepository.namesByTopicIds([row.id]),
    questionRepository.listApprovedByTopicId(row.id),
  ]);
  const questionTagNames = await tagRepository.namesByQuestionIds(
    questionRows.map((question) => question.id),
  );

  const topic = toDto(row, topicTagNames.get(row.id) ?? []);

  const questions: QuestionDto[] = questionRows.map((question) => ({
    id: question.id,
    title: question.title,
    description: question.description,
    categoryId: question.category_id,
    techStack: question.tech_stack,
    status: question.status,
    rejectionReason: question.rejection_reason,
    topicId: question.topic_id,
    createdAt: question.created_at,
    tags: questionTagNames.get(question.id) ?? [],
    authorUsername: question.author_username,
  }));

  return { topic, questions };
}

async function create(
  input: TopicCreateInput,
  actorId: string,
  ip?: string,
): Promise<TopicCreateResult> {
  try {
    await assertCategoryExists(input.categoryId);
    const tagIds = Array.from(new Set(input.tagIds));
    await assertTagsExist(tagIds);

    const existing = await topicRepository.findByTitle(input.title);
    if (existing) {
      await auditService.log({
        actorUserId: actorId,
        action: 'topic.create',
        targetType: 'topic',
        targetId: existing.id,
        ip,
        result: 'success',
        metadata: { slug: existing.slug, skipped: true },
      });
      return { topic: toDto(existing, await tagNamesFor(existing.id)), created: false };
    }

    const slug = await uniqueSlug(input.title);
    let row: TopicRow;
    try {
      row = await topicRepository.create(
        {
          title: input.title,
          slug,
          description: input.description,
          category_id: input.categoryId,
          is_curated: true,
          status: 'published',
          created_by: actorId,
        },
        tagIds,
      );
    } catch (err) {
      // Race with another moderator creating the same title.
      if (isUniqueViolation(err)) {
        const raced = await topicRepository.findByTitle(input.title);
        if (raced) {
          return { topic: toDto(raced, await tagNamesFor(raced.id)), created: false };
        }
      }
      throw err;
    }

    await auditService.log({
      actorUserId: actorId,
      action: 'topic.create',
      targetType: 'topic',
      targetId: row.id,
      ip,
      result: 'success',
      metadata: { slug: row.slug, isCurated: true },
    });
    return { topic: toDto(row, await tagNamesFor(row.id)), created: true };
  } catch (err) {
    await auditService.log({
      actorUserId: actorId,
      action: 'topic.create',
      targetType: 'topic',
      ip,
      result: 'failure',
      metadata: { title: input.title, error: errorCode(err) },
    });
    throw err;
  }
}

async function update(
  topicId: string,
  actorId: string,
  input: TopicUpdateInput,
  ip?: string,
): Promise<TopicDto> {
  try {
    const topic = await topicRepository.findById(topicId);
    if (!topic) {
      throw notFound();
    }

    if (input.categoryId !== undefined) {
      await assertCategoryExists(input.categoryId);
    }

    const tagIds = input.tagIds !== undefined ? Array.from(new Set(input.tagIds)) : undefined;
    if (tagIds !== undefined) {
      await assertTagsExist(tagIds);
    }

    if (input.title !== undefined) {
      const sameTitle = await topicRepository.findByTitle(input.title);
      if (sameTitle && sameTitle.id !== topicId) {
        throw conflict('TOPIC_TITLE_EXISTS', 'A topic with this title already exists.');
      }
    }

    let nextSlug: string | undefined;
    if (input.slug !== undefined) {
      const normalized = slugify(input.slug);
      if (normalized !== topic.slug) {
        if (await topicRepository.existsBySlug(normalized)) {
          throw conflict('TOPIC_SLUG_EXISTS', 'A topic with this slug already exists.');
        }
        nextSlug = normalized;
      }
    }

    const updated = await db.transaction().execute(async (trx) => {
      if (nextSlug !== undefined) {
        await topicRepository.upsertRedirect(topic.slug, topicId, trx);
        await topicRepository.deleteRedirect(nextSlug, trx);
      }

      const row = await topicRepository.update(
        topicId,
        {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.categoryId !== undefined ? { category_id: input.categoryId } : {}),
          ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        },
        trx,
      );

      if (tagIds !== undefined) {
        await topicRepository.replaceTags(topicId, tagIds, trx);
      }
      return row;
    });

    await auditService.log({
      actorUserId: actorId,
      action: 'topic.update',
      targetType: 'topic',
      targetId: topicId,
      ip,
      result: 'success',
      metadata: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(nextSlug !== undefined ? { oldSlug: topic.slug, newSlug: nextSlug } : {}),
      },
    });

    const tagNames = await tagRepository.namesByTopicIds([topicId]);
    return toDto(updated, tagNames.get(topicId) ?? []);
  } catch (err) {
    await auditService.log({
      actorUserId: actorId,
      action: 'topic.update',
      targetType: 'topic',
      targetId: topicId,
      ip,
      result: 'failure',
      metadata: { error: errorCode(err) },
    });
    throw err;
  }
}

async function archive(topicId: string, actorId: string, ip?: string): Promise<TopicDto> {
  try {
    const topic = await topicRepository.findById(topicId);
    if (!topic) {
      throw notFound();
    }

    const archivedRow = topic.status === 'archived'
      ? topic
      : await topicRepository.archive(topicId);

    await auditService.log({
      actorUserId: actorId,
      action: 'topic.archive',
      targetType: 'topic',
      targetId: topicId,
      ip,
      result: 'success',
      metadata: { slug: archivedRow.slug },
    });

    return toDto(archivedRow, await tagNamesFor(topicId));
  } catch (err) {
    await auditService.log({
      actorUserId: actorId,
      action: 'topic.archive',
      targetType: 'topic',
      targetId: topicId,
      ip,
      result: 'failure',
      metadata: { error: errorCode(err) },
    });
    throw err;
  }
}

async function merge(
  input: TopicMergeInput,
  actorId: string,
  ip?: string,
): Promise<TopicMergeResult> {
  const { sourceId, destinationId } = input;

  try {
    return await db.transaction().execute(async (trx) => {
      const source = await topicRepository.findById(sourceId, trx);
      if (!source) {
        throw new AppError('Source topic not found.', 404, 'TOPIC_NOT_FOUND');
      }
      const destination = await topicRepository.findById(destinationId, trx);
      if (!destination) {
        throw new AppError('Destination topic not found.', 404, 'TOPIC_NOT_FOUND');
      }

      const conflictingUserIds = await perspectiveRepository.conflictingAuthorIds(
        sourceId,
        destinationId,
        trx,
      );
      if (conflictingUserIds.length > 0) {
        throw new AppError(
          'Cannot merge: one or more users already have a perspective in both topics.',
          409,
          'TOPIC_MERGE_CONFLICT',
          { conflictingUserIds },
        );
      }

      await perspectiveRepository.moveToTopic(sourceId, destinationId, trx);
      await questionRepository.moveToTopic(sourceId, destinationId, trx);
      await topicRepository.moveLinkedQuestions(sourceId, destinationId, trx);

      const archivedSource = await topicRepository.markMerged(sourceId, destinationId, trx);
      await topicRepository.upsertRedirect(source.slug, destinationId, trx);

      await auditService.log(
        {
          actorUserId: actorId,
          action: 'topic.merge',
          targetType: 'topic',
          targetId: sourceId,
          ip,
          result: 'success',
          metadata: {
            destinationId,
            sourceSlug: source.slug,
            destinationSlug: destination.slug,
          },
        },
        trx,
      );

      const tagNames = await tagRepository.namesByTopicIds([sourceId, destinationId], trx);
      return {
        source: toDto(archivedSource, tagNames.get(sourceId) ?? []),
        destination: toDto(destination, tagNames.get(destinationId) ?? []),
      };
    });
  } catch (err) {
    await auditService.log({
      actorUserId: actorId,
      action: 'topic.merge',
      targetType: 'topic',
      targetId: sourceId,
      ip,
      result: 'failure',
      metadata: {
        sourceId,
        destinationId,
        ...(err instanceof AppError && err.details !== undefined ? { details: err.details } : {}),
        error: errorCode(err),
      },
    });
    throw err;
  }
}

export const topicService = {
  list,
  getBySlug,
  create,
  update,
  archive,
  merge,
};
