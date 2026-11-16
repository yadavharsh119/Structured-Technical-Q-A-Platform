import type { Request, Response } from 'express';
import { fingerprintVisibilitySchema } from '@structured-qa/shared';
import { fingerprintService } from '../services/fingerprintService';
import {
  asyncHandler,
  parseBody,
  parseUuidParam,
  requireAuthUserId,
} from './requestParsing';

export const getFingerprint = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseUuidParam(req.params.id, 'user id');
  const fingerprint = await fingerprintService.getForUser(userId, req.auth?.user.id ?? null);
  res.status(200).json({ success: true, data: { fingerprint } });
});

export const updateFingerprintVisibility = asyncHandler(
  async (req: Request, res: Response) => {
    const input = parseBody(fingerprintVisibilitySchema, req.body);
    const visibility = await fingerprintService.setVisibility(requireAuthUserId(req), input);
    res.status(200).json({ success: true, data: visibility });
  },
);
