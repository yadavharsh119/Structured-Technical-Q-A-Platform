import type { Request, Response } from 'express';
import { reportActionRequestSchema, reportCreateSchema, reportListQuerySchema } from '@structured-qa/shared';
import { reportService } from '../services/reportService';
import {
  asyncHandler,
  parseBody,
  parseUuidParam,
  requireAuthUserId,
} from './requestParsing';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(reportCreateSchema, req.body);
  const report = await reportService.create(input, requireAuthUserId(req));
  res.status(201).json({ success: true, data: { report } });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = parseBody(reportListQuerySchema, req.query);
  const reports = await reportService.list(query);
  res.status(200).json({ success: true, data: { reports } });
});

export const action = asyncHandler(async (req: Request, res: Response) => {
  const reportId = parseUuidParam(req.params.id, 'report id');
  const input = parseBody(reportActionRequestSchema, req.body);
  const report = await reportService.act(reportId, input.action, requireAuthUserId(req));
  res.status(200).json({ success: true, data: { report } });
});
