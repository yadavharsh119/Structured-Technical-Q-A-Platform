import { AppError } from '../middleware/errorHandler';
import { questionRepository } from '../repositories/questionRepository';
import { tagRepository } from '../repositories/tagRepository';
import { topicRepository } from '../repositories/topicRepository';
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

async function list(): Promise<TopicDto[]> {
  const rows = await topicRepository.listPublished();
  const tagNames = await tagRepository.namesByTopicIds(rows.map((row) => row.id));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    categoryId: row.category_id,
    isCurated: row.is_curated,
    status: row.status,
    createdAt: row.created_at,
    tags: tagNames.get(row.id) ?? [],
  }));
}

async function getBySlug(slug: string): Promise<TopicDetailDto> {
  const row = await topicRepository.findBySlug(slug);
  if (!row || row.status !== 'published') {
    throw new AppError('Topic not found.', 404, 'TOPIC_NOT_FOUND');
  }

  const [topicTagNames, questionRows] = await Promise.all([
    tagRepository.namesByTopicIds([row.id]),
    questionRepository.listApprovedByTopicId(row.id),
  ]);
  const questionTagNames = await tagRepository.namesByQuestionIds(
    questionRows.map((question) => question.id),
  );

  const topic: TopicDto = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    categoryId: row.category_id,
    isCurated: row.is_curated,
    status: row.status,
    createdAt: row.created_at,
    tags: topicTagNames.get(row.id) ?? [],
  };

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

export const topicService = {
  list,
  getBySlug,
};
