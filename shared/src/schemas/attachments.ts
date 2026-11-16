import { z } from 'zod';
import { QUESTION_ATTACHMENTS_MAX, uuidSchema } from './index';

// FR-QST-01, FR-PSP-01, SEC-09: files are uploaded first, then linked on create.
export const attachmentIdsSchema = z
  .array(uuidSchema)
  .max(QUESTION_ATTACHMENTS_MAX, `Attach up to ${QUESTION_ATTACHMENTS_MAX} files.`)
  .default([]);

export type AttachmentIdsInput = z.infer<typeof attachmentIdsSchema>;

export const attachmentDtoSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  size: z.number().int().nonnegative(),
  type: z.string(),
});

export type AttachmentDto = z.infer<typeof attachmentDtoSchema>;
