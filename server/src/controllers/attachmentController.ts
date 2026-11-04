import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { QUESTION_ATTACHMENT_MAX_BYTES } from '@structured-qa/shared';
import { AppError } from '../middleware/errorHandler';
import { attachmentService } from '../services/attachmentService';
import { storageService } from '../services/storageService';
import { asyncHandler, parseUuidParam, requireAuthUserId } from './requestParsing';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: QUESTION_ATTACHMENT_MAX_BYTES, files: 1 },
});

export function uploadSingleFile(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File must be 10 MB or smaller.'
          : 'Invalid file upload. Send one file in the "file" field.';
      next(new AppError(message, 400, 'VALIDATION_ERROR'));
      return;
    }
    next(err);
  });
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('Attach a file using the "file" field.', 400, 'VALIDATION_ERROR');
  }
  const attachment = await attachmentService.upload(req.file, requireAuthUserId(req));
  res.status(201).json({ success: true, data: attachment });
});

export const download = asyncHandler(async (req: Request, res: Response) => {
  const attachmentId = parseUuidParam(req.params.id, 'attachment id');
  const actor = req.auth
    ? { id: req.auth.user.id, role: req.auth.user.role }
    : null;
  const { row, filePath } = await attachmentService.authorizeDownload(attachmentId, actor);

  if (!(await storageService.exists(row.stored_name))) {
    throw new AppError('Attachment file is missing.', 404, 'ATTACHMENT_NOT_FOUND');
  }

  const fallbackName = row.original_name.replace(/["\\\r\n]/g, '_');
  res.setHeader('Content-Type', row.mime_type);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(row.original_name)}`,
  );
  res.sendFile(filePath);
});
