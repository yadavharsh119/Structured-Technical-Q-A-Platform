import type { Request, Response } from 'express';
import {
  perspectiveCompareQuerySchema,
  perspectiveCreateSchema,
  perspectiveListQuerySchema,
} from '@structured-qa/shared';
import { perspectiveService } from '../services/perspectiveService';
import {
  asyncHandler,
  canSeeHiddenContent,
  parseBody,
  parseUuidParam,
  requireAuthUserId,
} from './requestParsing';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(perspectiveCreateSchema, req.body);
  const perspective = await perspectiveService.create(
    req.params.slug ?? '',
    input,
    requireAuthUserId(req),
  );
  res.status(201).json({ success: true, data: { perspective } });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = parseBody(perspectiveListQuerySchema, req.query);
  const viewerId = req.auth?.user.id ?? null;
  const perspectives = await perspectiveService.list(
    req.params.slug ?? '',
    query.sort,
    viewerId,
    canSeeHiddenContent(req),
  );
  res.status(200).json({ success: true, data: { perspectives } });
});

export const toggleUpvote = asyncHandler(async (req: Request, res: Response) => {
  const perspectiveId = parseUuidParam(req.params.id, 'perspective id');
  const voteState = await perspectiveService.toggleUpvote(perspectiveId, requireAuthUserId(req));
  res.status(200).json({ success: true, data: voteState });
});

export const compare = asyncHandler(async (req: Request, res: Response) => {
  const query = parseBody(perspectiveCompareQuerySchema, req.query);
  const viewerId = req.auth?.user.id ?? null;
  const perspectives = await perspectiveService.compare(
    req.params.slug ?? '',
    query.ids,
    viewerId,
    canSeeHiddenContent(req),
  );
  res.status(200).json({ success: true, data: { perspectives } });
});
