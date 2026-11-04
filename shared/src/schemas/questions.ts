import { z } from 'zod';
import {
  QUESTION_ATTACHMENTS_MAX,
  QUESTION_DESCRIPTION_MAX,
  QUESTION_TAGS_MAX,
  QUESTION_TITLE_MAX,
} from './index';

// ── Questions and review queue (FR-QST-01 – FR-QST-03, FR-TOP-01) ───────────

export const uuidSchema = z.string().uuid('A valid identifier is required.');

export const questionCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(QUESTION_TITLE_MAX, `Title must be ${QUESTION_TITLE_MAX} characters or fewer.`),
  description: z
    .string()
    .trim()
    .min(1, 'Problem description is required.')
    .max(
      QUESTION_DESCRIPTION_MAX,
      `Description must be ${QUESTION_DESCRIPTION_MAX} characters or fewer.`,
    ),
  categoryId: uuidSchema,
  techStack: z
    .string()
    .trim()
    .max(200, 'Tech stack must be 200 characters or fewer.')
    .optional(),
  tagIds: z
    .array(uuidSchema)
    .max(QUESTION_TAGS_MAX, `Pick up to ${QUESTION_TAGS_MAX} tags.`)
    .default([]),
  attachmentIds: z
    .array(uuidSchema)
    .max(QUESTION_ATTACHMENTS_MAX, `Attach up to ${QUESTION_ATTACHMENTS_MAX} files.`)
    .default([]),
});

export type QuestionCreateInput = z.infer<typeof questionCreateSchema>;

export const questionUpdateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required.')
      .max(QUESTION_TITLE_MAX, `Title must be ${QUESTION_TITLE_MAX} characters or fewer.`)
      .optional(),
    description: z
      .string()
      .trim()
      .min(1, 'Problem description is required.')
      .max(
        QUESTION_DESCRIPTION_MAX,
        `Description must be ${QUESTION_DESCRIPTION_MAX} characters or fewer.`,
      )
      .optional(),
    categoryId: uuidSchema.optional(),
    techStack: z
      .string()
      .trim()
      .max(200, 'Tech stack must be 200 characters or fewer.')
      .optional(),
    tagIds: z
      .array(uuidSchema)
      .max(QUESTION_TAGS_MAX, `Pick up to ${QUESTION_TAGS_MAX} tags.`)
      .optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  });

export type QuestionUpdateInput = z.infer<typeof questionUpdateSchema>;

export const questionRejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'A rejection reason is required.')
    .max(1000, 'Reason must be 1,000 characters or fewer.'),
});

export type QuestionRejectInput = z.infer<typeof questionRejectSchema>;

export const topicFromQuestionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Topic title is required.')
    .max(200, 'Topic title must be 200 characters or fewer.'),
  description: z
    .string()
    .trim()
    .min(1, 'Topic description is required.')
    .max(2000, 'Topic description must be 2,000 characters or fewer.'),
  categoryId: uuidSchema,
  tagIds: z
    .array(uuidSchema)
    .max(QUESTION_TAGS_MAX, `Pick up to ${QUESTION_TAGS_MAX} tags.`)
    .default([]),
});

export type TopicFromQuestionInput = z.infer<typeof topicFromQuestionSchema>;

export const questionApproveSchema = z
  .object({
    linkTopicId: uuidSchema.optional(),
    createTopic: topicFromQuestionSchema.optional(),
  })
  .refine((data) => (data.linkTopicId !== undefined) !== (data.createTopic !== undefined), {
    message: 'Provide either linkTopicId or createTopic, but not both.',
  });

export type QuestionApproveInput = z.infer<typeof questionApproveSchema>;
