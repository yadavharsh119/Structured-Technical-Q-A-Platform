import { z } from 'zod';

// FR-MOD-01: content reporting
export const MODERATION_REPORT_REASONS = [
  'spam',
  'abusive',
  'duplicate',
  'misleading',
  'plagiarism',
  'other',
] as const;

export const REPORT_TARGET_TYPES = ['topic', 'perspective'] as const;

export const REPORT_STATUSES = ['open', 'under_review', 'resolved', 'dismissed'] as const;

export const REPORT_ACTIONS = ['dismiss', 'hide', 'escalate'] as const;

export const reportTargetTypeSchema = z.enum(REPORT_TARGET_TYPES);
export const reportReasonSchema = z.enum(MODERATION_REPORT_REASONS);
export const reportStatusSchema = z.enum(REPORT_STATUSES);
export const reportActionSchema = z.enum(REPORT_ACTIONS);

export const reportCreateSchema = z
  .object({
    targetType: reportTargetTypeSchema,
    targetId: z.string().uuid('Target id must be a valid identifier.'),
    reason: reportReasonSchema,
    comment: z
      .string()
      .trim()
      .max(1000, 'Comment must be 1,000 characters or fewer.')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reason === 'other' && (!data.comment || data.comment.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['comment'],
        message: 'A comment is required when the reason is other.',
      });
    }
  });

export type ReportCreateInput = z.infer<typeof reportCreateSchema>;

export const reportListQuerySchema = z.object({
  status: reportStatusSchema.optional(),
});

export type ReportListQuery = z.infer<typeof reportListQuerySchema>;

export const reportActionRequestSchema = z.object({
  action: reportActionSchema,
});

export type ReportActionRequest = z.infer<typeof reportActionRequestSchema>;

export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;
export type ModerationReportReason = z.infer<typeof reportReasonSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type ReportAction = z.infer<typeof reportActionSchema>;
