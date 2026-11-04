import { z } from 'zod';
import {
  PERSPECTIVE_ADVANTAGES_MAX,
  PERSPECTIVE_EXPLANATION_MAX,
  PERSPECTIVE_ITEM_MAX,
  PERSPECTIVE_LIMITATIONS_MAX,
  PERSPECTIVE_REFERENCES_MAX,
  PERSPECTIVE_SNIPPETS_MAX,
  PERSPECTIVE_SOLUTION_MAX,
  perspectiveCodeSnippetSchema,
} from './index';

// FR-PSP-01: one immutable perspective per user per topic.
export const perspectiveCreateSchema = z.object({
  proposedSolution: z
    .string()
    .trim()
    .min(1, 'Proposed solution is required.')
    .max(PERSPECTIVE_SOLUTION_MAX, `Solution must be ${PERSPECTIVE_SOLUTION_MAX} characters or fewer.`),
  explanation: z
    .string()
    .trim()
    .min(1, 'Explanation is required.')
    .max(PERSPECTIVE_EXPLANATION_MAX, `Explanation must be ${PERSPECTIVE_EXPLANATION_MAX} characters or fewer.`),
  advantages: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Advantage cannot be empty.')
        .max(PERSPECTIVE_ITEM_MAX, `Each advantage must be ${PERSPECTIVE_ITEM_MAX} characters or fewer.`),
    )
    .min(1, 'At least one advantage is required.')
    .max(PERSPECTIVE_ADVANTAGES_MAX, `Add up to ${PERSPECTIVE_ADVANTAGES_MAX} advantages.`),
  limitations: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Limitation cannot be empty.')
        .max(PERSPECTIVE_ITEM_MAX, `Each limitation must be ${PERSPECTIVE_ITEM_MAX} characters or fewer.`),
    )
    .min(1, 'At least one limitation is required.')
    .max(PERSPECTIVE_LIMITATIONS_MAX, `Add up to ${PERSPECTIVE_LIMITATIONS_MAX} limitations.`),
  codeSnippets: z
    .array(perspectiveCodeSnippetSchema)
    .max(PERSPECTIVE_SNIPPETS_MAX, `Add up to ${PERSPECTIVE_SNIPPETS_MAX} code snippets.`)
    .default([]),
  references: z
    .array(
      z
        .string()
        .trim()
        .url('References must be valid URLs.')
        .max(500, 'Each reference URL must be 500 characters or fewer.'),
    )
    .max(PERSPECTIVE_REFERENCES_MAX, `Add up to ${PERSPECTIVE_REFERENCES_MAX} references.`)
    .default([]),
});

export type PerspectiveCreateInput = z.infer<typeof perspectiveCreateSchema>;

// FR-PSP-01: public listing with newest/top ordering
export const perspectiveListQuerySchema = z.object({
  sort: z
    .enum(['newest', 'top'], {
      errorMap: () => ({ message: 'Sort must be either newest or top.' }),
    })
    .default('newest'),
});

export type PerspectiveListQuery = z.infer<typeof perspectiveListQuerySchema>;

// FR-CMP-01: comma-separated perspective ids, split and count-checked by the service
export const perspectiveCompareQuerySchema = z.object({
  ids: z.string().trim().min(1, 'Provide two or three perspective ids separated by commas.'),
});

export type PerspectiveCompareQuery = z.infer<typeof perspectiveCompareQuerySchema>;

// FR-PSP-03: author deletion requests and administrative removal.
export const DELETION_REASON_MAX = 2000;
export const DELETION_NOTE_MAX = 2000;

export const deletionRequestCreateSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required.')
    .max(DELETION_REASON_MAX, `Reason must be ${DELETION_REASON_MAX} characters or fewer.`),
});

export type DeletionRequestCreateInput = z.infer<typeof deletionRequestCreateSchema>;

export const deletionRequestListQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export type DeletionRequestListQuery = z.infer<typeof deletionRequestListQuerySchema>;

export const deletionRequestDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Decision must be either approve or reject.' }),
  }),
  note: z
    .string()
    .trim()
    .max(DELETION_NOTE_MAX, `Note must be ${DELETION_NOTE_MAX} characters or fewer.`)
    .optional(),
});

export type DeletionRequestDecisionInput = z.infer<typeof deletionRequestDecisionSchema>;

export const adminPerspectiveDeleteSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required.')
    .max(DELETION_REASON_MAX, `Reason must be ${DELETION_REASON_MAX} characters or fewer.`),
});

export type AdminPerspectiveDeleteInput = z.infer<typeof adminPerspectiveDeleteSchema>;

export const adminPerspectiveDeleteQuerySchema = z.object({
  hard: z.enum(['true', 'false']).optional(),
});

export type AdminPerspectiveDeleteQuery = z.infer<typeof adminPerspectiveDeleteQuerySchema>;
