import { z } from 'zod';
import { QUESTION_TAGS_MAX } from './index';
import { uuidSchema } from './questions';

// Topic administration (FR-TOP-01 - FR-TOP-04).

export const TOPIC_TITLE_MAX = 200;
export const TOPIC_DESCRIPTION_MAX = 2000;
export const TOPIC_SLUG_MAX = 200;

const topicTitleSchema = z
  .string()
  .trim()
  .min(1, 'Topic title is required.')
  .max(TOPIC_TITLE_MAX, `Topic title must be ${TOPIC_TITLE_MAX} characters or fewer.`);

const topicDescriptionSchema = z
  .string()
  .trim()
  .min(1, 'Topic description is required.')
  .max(TOPIC_DESCRIPTION_MAX, `Topic description must be ${TOPIC_DESCRIPTION_MAX} characters or fewer.`);

const topicSlugSchema = z
  .string()
  .trim()
  .min(1, 'Slug is required.')
  .max(TOPIC_SLUG_MAX, `Slug must be ${TOPIC_SLUG_MAX} characters or fewer.`);

// Route param /topics/:slug and /topics/:slug/perspectives
export const topicSlugParamSchema = z.object({ slug: topicSlugSchema });

export type TopicSlugParam = z.infer<typeof topicSlugParamSchema>;

const topicTagIdsSchema = z
  .array(uuidSchema)
  .max(QUESTION_TAGS_MAX, `Pick up to ${QUESTION_TAGS_MAX} tags.`)
  .default([]);

export const topicCreateSchema = z.object({
  title: topicTitleSchema,
  description: topicDescriptionSchema,
  categoryId: uuidSchema,
  tagIds: topicTagIdsSchema,
});

export type TopicCreateInput = z.infer<typeof topicCreateSchema>;

export const topicUpdateSchema = z
  .object({
    title: topicTitleSchema.optional(),
    description: topicDescriptionSchema.optional(),
    categoryId: uuidSchema.optional(),
    tagIds: topicTagIdsSchema.optional(),
    slug: topicSlugSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  });

export type TopicUpdateInput = z.infer<typeof topicUpdateSchema>;

export const topicMergeSchema = z
  .object({
    sourceId: uuidSchema,
    destinationId: uuidSchema,
  })
  .refine((data) => data.sourceId !== data.destinationId, {
    message: 'Source and destination topics must be different.',
    path: ['destinationId'],
  });

export type TopicMergeInput = z.infer<typeof topicMergeSchema>;
