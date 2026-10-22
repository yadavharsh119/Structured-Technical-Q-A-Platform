import type { Request, Response } from 'express';
import { topicService } from '../services/topicService';
import { asyncHandler } from './requestParsing';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const topics = await topicService.list();
  res.status(200).json({ success: true, data: { topics } });
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { topic, questions } = await topicService.getBySlug(req.params.slug ?? '');
  res.status(200).json({ success: true, data: { topic, questions } });
});
