import type {
  AttachmentDto,
  QuestionApproveInput,
  QuestionCreateInput,
  QuestionRejectInput,
  QuestionUpdateInput,
} from '@structured-qa/shared';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { categoryRepository } from '../repositories/categoryRepository';
import {
  questionRepository,
  type QuestionRow,
} from '../repositories/questionRepository';
import { tagRepository } from '../repositories/tagRepository';
import { topicRepository, type TopicRow } from '../repositories/topicRepository';
import { assertCanContribute } from './accountStatusService';
import { attachmentService } from './attachmentService';
import type { TopicDto } from './topicService';

export interface QuestionDto {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  techStack: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  topicId: string | null;
  createdAt: Date;
  tags: string[];
  attachments: AttachmentDto[];
  authorUsername?: string;
}

export interface QuestionWithTopicDto {
  question: QuestionDto;
  topic: TopicDto;
}

function notFound(): AppError {
  return new AppError('Question not found.', 404, 'QUESTION_NOT_FOUND');
}

function notPending(): AppError {
  return new AppError('Only pending questions can be edited, deleted, approved, or rejected.', 409, 'QUESTION_NOT_PENDING');
}

function forbidden(action: string): AppError {
  return new AppError(`You can only ${action} your own questions.`, 403, 'FORBIDDEN');
}

function validation(message: string): AppError {
  return new AppError(message, 400, 'VALIDATION_ERROR');
}

function toDto(
  row: QuestionRow & { author_username?: string },
  tagNames: string[],
  attachments: AttachmentDto[],
): QuestionDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    techStack: row.tech_stack,
    status: row.status,
    rejectionReason: row.rejection_reason,
    topicId: row.topic_id,
    createdAt: row.created_at,
    tags: tagNames,
    attachments,
    ...(row.author_username !== undefined ? { authorUsername: row.author_username } : {}),
  };
}

async function withRelations(
  rows: Array<QuestionRow & { author_username?: string }>,
): Promise<QuestionDto[]> {
  const ids = rows.map((row) => row.id);
  const tagNames = await tagRepository.namesByQuestionIds(ids);
  const attachments = await attachmentService.listForQuestions(ids);
  return rows.map((row) =>
    toDto(row, tagNames.get(row.id) ?? [], attachments.get(row.id) ?? []),
  );
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  const category = await categoryRepository.findById(categoryId);
  if (!category) {
    throw validation('Category not found.');
  }
  if (!category.is_active) {
    throw validation('Category is inactive and cannot be selected.');
  }
}

// tagIds must be a deduplicated list of existing, active tag ids
async function assertTagsExist(tagIds: string[]): Promise<void> {
  const found = await tagRepository.findByIds(tagIds);
  if (found.length !== tagIds.length) {
    throw validation('One or more tags do not exist.');
  }
  if (found.some((tag) => !tag.is_active)) {
    throw validation('One or more tags are inactive and cannot be selected.');
  }
}

async function create(input: QuestionCreateInput, authorId: string): Promise<QuestionDto> {
  await assertCanContribute(authorId);
  await assertCategoryExists(input.categoryId);
  const tagIds = Array.from(new Set(input.tagIds));
  await assertTagsExist(tagIds);

  const row = await questionRepository.create(
    {
      author_id: authorId,
      title: input.title,
      description: input.description,
      category_id: input.categoryId,
      tech_stack: input.techStack ?? null,
    },
    tagIds,
    input.attachmentIds,
  );
  const tagRows = await tagRepository.findByIds(tagIds);
  const attachments = await attachmentService.listForQuestions([row.id]);
  return toDto(
    row,
    tagRows.map((tag) => tag.name),
    attachments.get(row.id) ?? [],
  );
}

async function listMine(userId: string): Promise<QuestionDto[]> {
  const rows = await questionRepository.listByAuthor(userId);
  return withRelations(rows);
}

async function listPending(): Promise<QuestionDto[]> {
  const rows = await questionRepository.listPending();
  return withRelations(rows);
}

async function update(
  questionId: string,
  actorId: string,
  input: QuestionUpdateInput,
): Promise<QuestionDto> {
  const question = await questionRepository.findById(questionId);
  if (!question) {
    throw notFound();
  }
  if (question.author_id !== actorId) {
    throw forbidden('edit');
  }
  if (question.status !== 'pending') {
    throw notPending();
  }

  if (input.categoryId !== undefined) {
    await assertCategoryExists(input.categoryId);
  }
  const tagIds = input.tagIds !== undefined ? Array.from(new Set(input.tagIds)) : undefined;
  if (tagIds !== undefined) {
    await assertTagsExist(tagIds);
  }

  const updated = await questionRepository.update(questionId, {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.categoryId !== undefined ? { category_id: input.categoryId } : {}),
    ...(input.techStack !== undefined ? { tech_stack: input.techStack } : {}),
  });
  if (tagIds !== undefined) {
    await questionRepository.replaceTags(questionId, tagIds);
  }

  const tagNames = await tagRepository.namesByQuestionIds([questionId]);
  const attachments = await attachmentService.listForQuestions([questionId]);
  return toDto(updated, tagNames.get(questionId) ?? [], attachments.get(questionId) ?? []);
}

async function remove(questionId: string, actorId: string): Promise<void> {
  const question = await questionRepository.findById(questionId);
  if (!question) {
    throw notFound();
  }
  if (question.author_id !== actorId) {
    throw forbidden('delete');
  }
  if (question.status !== 'pending') {
    throw notPending();
  }
  await questionRepository.remove(questionId);
}

async function reject(
  questionId: string,
  reviewerId: string,
  input: QuestionRejectInput,
): Promise<QuestionDto> {
  const question = await questionRepository.findById(questionId);
  if (!question) {
    throw notFound();
  }
  if (question.status !== 'pending') {
    throw notPending();
  }
  const row = await questionRepository.markRejected(questionId, input.reason, reviewerId);
  return toDto(
    row,
    (await tagRepository.namesByQuestionIds([questionId])).get(questionId) ?? [],
    (await attachmentService.listForQuestions([questionId])).get(questionId) ?? [],
  );
}

async function approve(
  questionId: string,
  reviewerId: string,
  input: QuestionApproveInput,
): Promise<QuestionWithTopicDto> {
  return db.transaction().execute(async (trx) => {
    // Lock the question row so two moderators cannot approve concurrently
    const question = await questionRepository.findByIdForUpdate(questionId, trx);
    if (!question) {
      throw notFound();
    }
    if (question.status !== 'pending') {
      throw notPending();
    }

    let topic: TopicRow;
    if (input.linkTopicId !== undefined) {
      const linked = await topicRepository.findById(input.linkTopicId, trx);
      if (!linked) {
        throw new AppError('Topic not found.', 404, 'TOPIC_NOT_FOUND');
      }
      topic = linked;
    } else if (input.createTopic !== undefined) {
      const createInput = input.createTopic;
      const category = await categoryRepository.findById(createInput.categoryId);
      if (!category) {
        throw validation('Category not found.');
      }
      if (!category.is_active) {
        throw validation('Category is inactive and cannot be selected.');
      }
      const tagIds = Array.from(new Set(createInput.tagIds));
      if (tagIds.length > 0) {
        const found = await tagRepository.findByIds(tagIds);
        if (found.length !== tagIds.length) {
          throw validation('One or more tags do not exist.');
        }
        if (found.some((tag) => !tag.is_active)) {
          throw validation('One or more tags are inactive and cannot be selected.');
        }
      }

      // topics.title is UNIQUE; the slug suffix alone would not rescue a duplicate title
      if (await topicRepository.existsByTitle(createInput.title, trx)) {
        throw validation('A topic with this title already exists.');
      }

      const base = slugify(createInput.title);
      let slug = base;
      let suffix = 2;
      while (await topicRepository.existsBySlug(slug, trx)) {
        slug = `${base}-${suffix}`;
        suffix += 1;
      }

      topic = await topicRepository.create(
        {
          title: createInput.title,
          slug,
          description: createInput.description,
          category_id: createInput.categoryId,
          is_curated: false,
          status: 'published',
          created_by: reviewerId,
        },
        tagIds,
        trx,
      );
    } else {
      // Unreachable when routed through questionApproveSchema; kept for type safety
      throw validation('Provide either linkTopicId or createTopic.');
    }

    const updated = await questionRepository.markApproved(questionId, topic.id, reviewerId, trx);
    const tagNames = await tagRepository.namesByQuestionIds([questionId], trx);
    return {
      question: toDto(
        updated,
        tagNames.get(questionId) ?? [],
        (await attachmentService.listForQuestions([questionId], trx)).get(questionId) ?? [],
      ),
      topic: {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        description: topic.description,
        categoryId: topic.category_id,
        isCurated: topic.is_curated,
        status: topic.status,
        createdAt: topic.created_at,
        tags: (await tagRepository.namesByTopicIds([topic.id], trx)).get(topic.id) ?? [],
      },
    };
  });
}

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
  return slug.length > 0 ? slug : 'topic';
}

export const questionService = {
  create,
  listMine,
  listPending,
  update,
  remove,
  reject,
  approve,
};
