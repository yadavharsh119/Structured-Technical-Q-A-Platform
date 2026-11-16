import type { Request, Response } from 'express';
import {
  topicCreateSchema,
  topicMergeSchema,
  topicSlugParamSchema,
  topicUpdateSchema,
} from '@structured-qa/shared';
import { topicService } from '../services/topicService';
import {
  asyncHandler,
  canSeeHiddenContent,
  parseBody,
  parseUuidParam,
  requireAuthUserId,
} from './requestParsing';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const topics = await topicService.list(canSeeHiddenContent(req));
  res.status(200).json({ success: true, data: { topics } });
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = parseBody(topicSlugParamSchema, req.params);
  const result = await topicService.getBySlug(slug, canSeeHiddenContent(req));
  if ('redirectTo' in result) {
    res
      .status(301)
      .location(`/api/topics/${encodeURIComponent(result.redirectTo.slug)}`)
      .json({ success: true, data: { redirectTo: result.redirectTo } });
    return;
  }
  res.status(200).json({ success: true, data: { topic: result.topic, questions: result.questions } });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(topicCreateSchema, req.body);
  const result = await topicService.create(input, requireAuthUserId(req), req.ip);
  res
    .status(result.created ? 201 : 200)
    .json({ success: true, data: { topic: result.topic } });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const topicId = parseUuidParam(req.params.id, 'topic id');
  const input = parseBody(topicUpdateSchema, req.body);
  const topic = await topicService.update(topicId, requireAuthUserId(req), input, req.ip);
  res.status(200).json({ success: true, data: { topic } });
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  const topicId = parseUuidParam(req.params.id, 'topic id');
  const topic = await topicService.archive(topicId, requireAuthUserId(req), req.ip);
  res.status(200).json({ success: true, data: { topic } });
});

export const merge = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(topicMergeSchema, req.body);
  const result = await topicService.merge(input, requireAuthUserId(req), req.ip);
  res.status(200).json({ success: true, data: result });
});
