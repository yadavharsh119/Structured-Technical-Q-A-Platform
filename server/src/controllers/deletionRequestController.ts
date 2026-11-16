import type { Request, Response } from 'express';
import {
  adminPerspectiveDeleteQuerySchema,
  adminPerspectiveDeleteSchema,
  deletionRequestCreateSchema,
  deletionRequestDecisionSchema,
  deletionRequestListQuerySchema,
} from '@structured-qa/shared';
import { deletionRequestService } from '../services/deletionRequestService';
import {
  asyncHandler,
  parseBody,
  parseUuidParam,
  requireAuthUserId,
} from './requestParsing';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const perspectiveId = parseUuidParam(req.params.id, 'perspective id');
  const input = parseBody(deletionRequestCreateSchema, req.body);
  const deletionRequest = await deletionRequestService.requestDeletion(
    perspectiveId,
    requireAuthUserId(req),
    input,
    req.ip ?? null,
  );
  res.status(201).json({ success: true, data: { deletionRequest } });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = parseBody(deletionRequestListQuerySchema, req.query);
  const deletionRequests = await deletionRequestService.list(query.status);
  res.status(200).json({ success: true, data: { deletionRequests } });
});

export const decide = asyncHandler(async (req: Request, res: Response) => {
  const requestId = parseUuidParam(req.params.id, 'deletion request id');
  const input = parseBody(deletionRequestDecisionSchema, req.body);
  const deletionRequest = await deletionRequestService.decide(
    requestId,
    requireAuthUserId(req),
    input,
    req.ip ?? null,
  );
  res.status(200).json({ success: true, data: { deletionRequest } });
});

export const removePerspective = asyncHandler(async (req: Request, res: Response) => {
  const perspectiveId = parseUuidParam(req.params.id, 'perspective id');
  const input = parseBody(adminPerspectiveDeleteSchema, req.body);
  const query = parseBody(adminPerspectiveDeleteQuerySchema, req.query);
  const result = await deletionRequestService.adminDelete(
    perspectiveId,
    requireAuthUserId(req),
    input,
    query.hard === 'true',
    req.ip ?? null,
  );
  res.status(200).json({ success: true, data: result });
});
