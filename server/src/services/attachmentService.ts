import path from 'path';
import { randomUUID } from 'crypto';
import {
  QUESTION_ATTACHMENT_EXTENSIONS,
  QUESTION_ATTACHMENT_MAX_BYTES,
  type AttachmentDto,
} from '@structured-qa/shared';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { attachmentRepository, type AttachmentRow } from '../repositories/attachmentRepository';
import { perspectiveRepository } from '../repositories/perspectiveRepository';
import { questionRepository } from '../repositories/questionRepository';
import type { DbHandle } from '../repositories/questionRepository';
import { assertCanContribute } from './accountStatusService';
import { storageService } from './storageService';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.txt': 'text/plain',
  '.log': 'text/plain',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.zip': 'application/zip',
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
}

interface DownloadActor {
  id: string;
  role: 'registered' | 'moderator' | 'admin';
}

function validation(message: string): AppError {
  return new AppError(message, 400, 'VALIDATION_ERROR');
}

function attachmentNotFound(): AppError {
  return new AppError('Attachment not found.', 404, 'ATTACHMENT_NOT_FOUND');
}

function forbidden(): AppError {
  return new AppError('You do not have permission to download this attachment.', 403, 'FORBIDDEN');
}

function extensionOf(name: string): string {
  return path.extname(name).toLowerCase();
}

function hasValidContent(extension: string, buffer: Buffer): boolean {
  switch (extension) {
    case '.pdf':
      return buffer.subarray(0, 4).toString('ascii') === '%PDF';
    case '.png':
      return buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
    case '.jpg':
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case '.zip':
      return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
    case '.txt':
    case '.log':
      return isText(buffer);
    default:
      return false;
  }
}

function isText(buffer: Buffer): boolean {
  if (buffer.includes(0)) {
    return false;
  }
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

function toDto(row: AttachmentRow): AttachmentDto {
  return {
    id: row.id,
    name: row.original_name,
    size: row.size_bytes,
    type: row.mime_type,
  };
}

function groupByParent(
  rows: AttachmentRow[],
  parent: 'question_id' | 'perspective_id',
): Map<string, AttachmentDto[]> {
  const result = new Map<string, AttachmentDto[]>();
  for (const row of rows) {
    const parentId = row[parent];
    if (parentId === null) {
      continue;
    }
    const list = result.get(parentId) ?? [];
    list.push(toDto(row));
    result.set(parentId, list);
  }
  return result;
}

async function listForQuestions(ids: string[], dbi: DbHandle = db) {
  return groupByParent(await attachmentRepository.listByQuestionIds(ids, dbi), 'question_id');
}

async function listForPerspectives(ids: string[], dbi: DbHandle = db) {
  return groupByParent(
    await attachmentRepository.listByPerspectiveIds(ids, dbi),
    'perspective_id',
  );
}

async function upload(file: UploadedFile, uploaderId: string): Promise<AttachmentDto> {
  await assertCanContribute(uploaderId);

  const originalName = path.basename(file.originalname || '');
  const extension = extensionOf(originalName);
  if (!(QUESTION_ATTACHMENT_EXTENSIONS as readonly string[]).includes(extension)) {
    throw validation(
      `Allowed file types: ${QUESTION_ATTACHMENT_EXTENSIONS.join(', ')}.`,
    );
  }

  const size = file.buffer.length;
  if (size === 0) {
    throw validation('File is empty.');
  }
  if (size > QUESTION_ATTACHMENT_MAX_BYTES) {
    throw validation('File must be 10 MB or smaller.');
  }

  if (!hasValidContent(extension, file.buffer)) {
    throw validation('File content does not match its extension.');
  }

  const storedName = randomUUID();
  const mimeType = MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';

  await storageService.save(storedName, file.buffer);
  try {
    const row = await attachmentRepository.insert({
      uploader_id: uploaderId,
      original_name: originalName,
      stored_name: storedName,
      mime_type: mimeType,
      size_bytes: size,
    });
    return toDto(row);
  } catch (err) {
    await storageService.remove(storedName).catch(() => undefined);
    throw err;
  }
}

async function authorizeDownload(
  attachmentId: string,
  actor: DownloadActor | null,
): Promise<{ row: AttachmentRow; filePath: string }> {
  const row = await attachmentRepository.findById(attachmentId);
  if (!row) {
    throw attachmentNotFound();
  }

  let allowed = false;

  if (row.question_id !== null) {
    const question = await questionRepository.findById(row.question_id);
    if (!question) {
      throw attachmentNotFound();
    }
    allowed =
      actor?.role === 'moderator' ||
      actor?.role === 'admin' ||
      question.author_id === actor?.id ||
      question.status === 'approved';
  } else if (row.perspective_id !== null) {
    const perspective = await perspectiveRepository.findById(row.perspective_id);
    if (!perspective) {
      throw attachmentNotFound();
    }
    const visible =
      perspective.status === 'visible' &&
      perspective.deleted_at === null &&
      !perspective.hidden;
    allowed =
      visible || actor?.role === 'moderator' || actor?.role === 'admin';
  } else {
    allowed = row.uploader_id === actor?.id;
  }

  if (!allowed) {
    throw forbidden();
  }

  return { row, filePath: storageService.resolveStoredPath(row.stored_name) };
}

export const attachmentService = {
  upload,
  authorizeDownload,
  listForQuestions,
  listForPerspectives,
  toDto,
};
