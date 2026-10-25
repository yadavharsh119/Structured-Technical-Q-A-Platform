import {
  QUESTION_ATTACHMENTS_MAX,
  QUESTION_ATTACHMENT_EXTENSIONS,
  QUESTION_ATTACHMENT_MAX_BYTES,
  QUESTION_CATEGORIES,
  QUESTION_DESCRIPTION_MAX,
  QUESTION_TAGS,
  QUESTION_TAGS_MAX,
  QUESTION_TITLE_MAX,
  questionSubmissionSchema,
} from '@structured-qa/shared';
import type { QuestionSubmission } from '@structured-qa/shared';

export type { QuestionSubmission };

export interface QuestionDraft {
  title: string;
  description: string;
  category: string;
  techStack: string;
  tags: string[];
}

export interface DraftAttachment {
  name: string;
  size: number;
}

export interface SubmittedQuestion {
  id: string;
  status: 'Pending';
}

const LATENCY_MS = 600;

function mockId(): string {
  return `q-${Date.now().toString(36)}`;
}

export async function submitQuestion(
  payload: QuestionSubmission,
  files: File[],
): Promise<SubmittedQuestion> {
  // Mock backend: validate with the shared schema, then return a fake ID.
  // When the real endpoint exists, POST to /api/questions here instead.
  const parsed = questionSubmissionSchema.safeParse({
    ...payload,
    attachments: files.map((f) => ({ name: f.name, size: f.size })),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid question.');
  }
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  return { id: mockId(), status: 'Pending' };
}

export {
  QUESTION_ATTACHMENTS_MAX,
  QUESTION_ATTACHMENT_EXTENSIONS,
  QUESTION_ATTACHMENT_MAX_BYTES,
  QUESTION_CATEGORIES,
  QUESTION_DESCRIPTION_MAX,
  QUESTION_TAGS,
  QUESTION_TAGS_MAX,
  QUESTION_TITLE_MAX,
  questionSubmissionSchema,
};
