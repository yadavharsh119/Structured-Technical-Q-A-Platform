import { Selectable } from 'kysely';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AttachmentsTable } from '../types/database';
import type { DbHandle } from './questionRepository';

export type AttachmentRow = Selectable<AttachmentsTable>;

export type NewAttachment = Pick<
  AttachmentsTable,
  'uploader_id' | 'original_name' | 'stored_name' | 'mime_type' | 'size_bytes'
>;

function invalidAttachment(): AppError {
  return new AppError(
    'One or more attachments are invalid or already linked.',
    400,
    'VALIDATION_ERROR',
  );
}

async function assertLinkable(
  dbi: DbHandle,
  attachmentIds: string[],
  uploaderId: string,
): Promise<string[]> {
  const ids = Array.from(new Set(attachmentIds));
  if (ids.length === 0) {
    return ids;
  }

  const rows = await dbi
    .selectFrom('attachments')
    .select(['id', 'uploader_id', 'question_id', 'perspective_id'])
    .where('id', 'in', ids)
    .forUpdate()
    .execute();

  const valid =
    rows.length === ids.length &&
    rows.every(
      (row) =>
        row.uploader_id === uploaderId &&
        row.question_id === null &&
        row.perspective_id === null,
    );
  if (!valid) {
    throw invalidAttachment();
  }
  return ids;
}

export const attachmentRepository = {
  insert(data: NewAttachment, dbi: DbHandle = db): Promise<AttachmentRow> {
    return dbi.insertInto('attachments').values(data).returningAll().executeTakeFirstOrThrow();
  },

  findById(id: string, dbi: DbHandle = db): Promise<AttachmentRow | undefined> {
    return dbi.selectFrom('attachments').selectAll().where('id', '=', id).executeTakeFirst();
  },

  listByQuestionIds(ids: string[], dbi: DbHandle = db): Promise<AttachmentRow[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return dbi
      .selectFrom('attachments')
      .selectAll()
      .where('question_id', 'in', ids)
      .orderBy('created_at', 'asc')
      .execute();
  },

  listByPerspectiveIds(ids: string[], dbi: DbHandle = db): Promise<AttachmentRow[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return dbi
      .selectFrom('attachments')
      .selectAll()
      .where('perspective_id', 'in', ids)
      .orderBy('created_at', 'asc')
      .execute();
  },

  async linkToQuestion(
    questionId: string,
    attachmentIds: string[],
    uploaderId: string,
    dbi: DbHandle = db,
  ): Promise<void> {
    const ids = await assertLinkable(dbi, attachmentIds, uploaderId);
    if (ids.length === 0) {
      return;
    }
    await dbi
      .updateTable('attachments')
      .set({ question_id: questionId })
      .where('id', 'in', ids)
      .execute();
  },

  async linkToPerspective(
    perspectiveId: string,
    attachmentIds: string[],
    uploaderId: string,
    dbi: DbHandle = db,
  ): Promise<void> {
    const ids = await assertLinkable(dbi, attachmentIds, uploaderId);
    if (ids.length === 0) {
      return;
    }
    await dbi
      .updateTable('attachments')
      .set({ perspective_id: perspectiveId })
      .where('id', 'in', ids)
      .execute();
  },

  async deleteByPerspectiveId(perspectiveId: string, dbi: DbHandle = db): Promise<string[]> {
    const rows = await dbi
      .deleteFrom('attachments')
      .where('perspective_id', '=', perspectiveId)
      .returning('stored_name')
      .execute();
    return rows.map((row) => row.stored_name);
  },
};
