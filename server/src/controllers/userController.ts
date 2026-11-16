import type { Request, Response } from 'express';
import { changePasswordSchema, profileUpdateSchema } from '@structured-qa/shared';
import { AppError } from '../middleware/errorHandler';
import { userService } from '../services/userService';
import {
  asyncHandler,
  parseBody,
  parseUuidParam,
  requireAuthUserId,
} from './requestParsing';

function requireSession(req: Request): { userId: string; sessionId: string } {
  if (!req.auth) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }
  return { userId: req.auth.user.id, sessionId: req.auth.sessionId };
}

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseUuidParam(req.params.id, 'user id');
  const viewerId = req.auth?.user.id ?? null;
  const user = await userService.getProfile(userId, viewerId);
  res.status(200).json({ success: true, data: { user } });
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(profileUpdateSchema, req.body);
  const user = await userService.updateProfile(requireAuthUserId(req), input);
  res.status(200).json({ success: true, data: { user } });
});

export const changeMyPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(changePasswordSchema, req.body);
  const { userId, sessionId } = requireSession(req);
  await userService.changePassword(userId, sessionId, input);
  res.status(200).json({
    success: true,
    data: { message: 'Password changed successfully.' },
  });
});
