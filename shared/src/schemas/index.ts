import { z } from 'zod';
import { UserRole, UserStatus } from '../constants';
import { REPORT_REASONS } from '../types';
import { passwordSchema } from './auth';

export const userRoleSchema = z.nativeEnum(UserRole);
export const userStatusSchema = z.nativeEnum(UserStatus);

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const healthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  environment: z.string(),
  database: z.object({
    connected: z.boolean(),
    latencyMs: z.number().optional(),
    error: z.string().optional(),
  }),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export const QUESTION_TITLE_MAX = 200;
export const QUESTION_DESCRIPTION_MAX = 5000;
export const QUESTION_TAGS_MAX = 5;
export const QUESTION_ATTACHMENTS_MAX = 3;
export const QUESTION_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const QUESTION_CATEGORIES = [
  'Architecture',
  'Databases',
  'Backend',
  'Security',
  'Frontend',
  'DevOps',
  'Testing',
] as const;

export const QUESTION_TAGS = [
  'caching',
  'redis',
  'postgres',
  'jwt',
  'authentication',
  'react',
  'performance',
  'docker',
  'kubernetes',
  'api-design',
  'microservices',
  'testing',
] as const;

export const QUESTION_ATTACHMENT_EXTENSIONS = ['.txt', '.log', '.pdf', '.png', '.jpg', '.zip'] as const;

export const questionAttachmentSchema = z.object({
  name: z.string().min(1, 'Attachment name is required.').refine(
    (name) => {
      const dot = name.lastIndexOf('.');
      if (dot < 0) return false;
      const ext = name.slice(dot).toLowerCase();
      return (QUESTION_ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext);
    },
    `Allowed types: ${QUESTION_ATTACHMENT_EXTENSIONS.join(', ')}.`,
  ),
  size: z
    .number()
    .max(QUESTION_ATTACHMENT_MAX_BYTES, 'Each file must be 10 MB or smaller.'),
});

export const questionSubmissionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(QUESTION_TITLE_MAX, `Title must be ${QUESTION_TITLE_MAX} characters or fewer.`),
  description: z
    .string()
    .trim()
    .min(1, 'Problem description is required.')
    .max(QUESTION_DESCRIPTION_MAX, `Description must be ${QUESTION_DESCRIPTION_MAX} characters or fewer.`),
  category: z.enum(QUESTION_CATEGORIES, {
    errorMap: () => ({ message: 'Category is required.' }),
  }),
  techStack: z.string().trim().max(200, 'Tech stack must be 200 characters or fewer.').optional(),
  tags: z
    .array(z.enum(QUESTION_TAGS))
    .max(QUESTION_TAGS_MAX, `Pick up to ${QUESTION_TAGS_MAX} tags.`)
    .default([]),
  attachments: z
    .array(questionAttachmentSchema)
    .max(QUESTION_ATTACHMENTS_MAX, `Attach up to ${QUESTION_ATTACHMENTS_MAX} files.`)
    .default([]),
});

export type QuestionSubmission = z.infer<typeof questionSubmissionSchema>;

// ── Perspective submission ──────────────────────────────────────────────────

export const PERSPECTIVE_SOLUTION_MAX = 300;
export const PERSPECTIVE_EXPLANATION_MAX = 3000;
export const PERSPECTIVE_ITEM_MAX = 100;
export const PERSPECTIVE_ADVANTAGES_MAX = 5;
export const PERSPECTIVE_LIMITATIONS_MAX = 5;
export const PERSPECTIVE_SNIPPETS_MAX = 3;
export const PERSPECTIVE_REFERENCES_MAX = 5;

export const perspectiveCodeSnippetSchema = z.object({
  language: z.string().trim().min(1, 'Language is required.').max(50, 'Language too long.'),
  code: z.string().min(1, 'Code is required.').max(5000, 'Code must be 5 000 characters or fewer.'),
});

export const perspectiveReferenceSchema = z.object({
  label: z.string().trim().min(1, 'Label is required.').max(200, 'Label too long.'),
  url: z.string().trim().url('Must be a valid URL.').max(500, 'URL too long.'),
});

export const perspectiveSubmissionSchema = z.object({
  solution: z
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
    .array(z.string().trim().min(1, 'Advantage cannot be empty.').max(PERSPECTIVE_ITEM_MAX, `Each advantage must be ${PERSPECTIVE_ITEM_MAX} characters or fewer.`))
    .min(1, 'At least one advantage is required.')
    .max(PERSPECTIVE_ADVANTAGES_MAX, `Add up to ${PERSPECTIVE_ADVANTAGES_MAX} advantages.`),
  limitations: z
    .array(z.string().trim().min(1, 'Limitation cannot be empty.').max(PERSPECTIVE_ITEM_MAX, `Each limitation must be ${PERSPECTIVE_ITEM_MAX} characters or fewer.`))
    .min(1, 'At least one limitation is required.')
    .max(PERSPECTIVE_LIMITATIONS_MAX, `Add up to ${PERSPECTIVE_LIMITATIONS_MAX} limitations.`),
  codeSnippets: z
    .array(perspectiveCodeSnippetSchema)
    .max(PERSPECTIVE_SNIPPETS_MAX, `Add up to ${PERSPECTIVE_SNIPPETS_MAX} code snippets.`)
    .default([]),
  references: z
    .array(perspectiveReferenceSchema)
    .max(PERSPECTIVE_REFERENCES_MAX, `Add up to ${PERSPECTIVE_REFERENCES_MAX} references.`)
    .default([]),
  anonymous: z.boolean().default(false),
});

export type PerspectiveSubmission = z.infer<typeof perspectiveSubmissionSchema>;
 
export const reportPerspectiveSchema = z.object({
  perspectiveId: z.string().min(1, 'Perspective ID is required.'),
  reason: z.enum(REPORT_REASONS, {
    errorMap: () => ({ message: 'Please select a reason.' }),
  }),
  details: z.string().trim().max(1000, 'Details must be 1,000 characters or fewer.').optional(),
});

export type ReportPerspectiveInput = z.infer<typeof reportPerspectiveSchema>;

// ── Auth schemas ────────────────────────────────────────────────────────────
// Core auth schemas (passwordSchema, registerSchema, loginSchema,
// verifyEmailSchema, resendVerificationSchema) live in ./auth.
export * from './auth';

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address.').toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'Reset token is invalid.'),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Questions, review queue and question-derived topics (FR-QST-01 – FR-QST-03,
// FR-TOP-01). Kept last: ./questions imports the QUESTION_* constants above.
export * from './questions';

// Perspectives, upvotes and comparison (FR-PSP-01, FR-VOTE-01, FR-CMP-01).
// Kept last: ./perspectives imports the PERSPECTIVE_* constants and the
// perspectiveCodeSnippetSchema defined above.
export * from './perspectives';

// Search and filter (FR-SRCH-01, FR-SRCH-02).
export * from './search';

// Content reporting and the moderator queue (FR-MOD-01, FR-MOD-02).
export * from './reports';

// Expert fingerprint visibility (FR-EXP-01, FR-EXP-02).
export * from './fingerprint';

// Profile management and privacy settings (FR-PROF-01, FR-PROF-02).
export * from './profile';

// Admin user management and audit log viewer (FR-MOD-03, FR-ADM-01, FR-ADM-03).
export * from './admin';

// Topic administration: create, edit, archive and merge (FR-TOP-01 - FR-TOP-04).
export * from './topics';

// Category and tag management (FR-TOP-05, FR-TOP-06).
export * from './taxonomy';
