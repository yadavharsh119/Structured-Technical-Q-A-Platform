import type { Request, Response } from 'express';
import {
  questionApproveSchema,
  questionCreateSchema,
  questionRejectSchema,
  questionUpdateSchema,
} from '@structured-qa/shared';
import { questionService } from '../services/questionService';
import { asyncHandler, parseBody, parseUuidParam, requireAuthUserId } from './requestParsing';

function questionId(req: Request): string {
  return parseUuidParam(req.params.id, 'question id');
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(questionCreateSchema, req.body);
  const question = await questionService.create(input, requireAuthUserId(req));
  res.status(201).json({ success: true, data: { question } });
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const questions = await questionService.listMine(requireAuthUserId(req));
  res.status(200).json({ success: true, data: { questions } });
});

export const listPending = asyncHandler(async (_req: Request, res: Response) => {
  const questions = await questionService.listPending();
  res.status(200).json({ success: true, data: { questions } });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(questionUpdateSchema, req.body);
  const question = await questionService.update(questionId(req), requireAuthUserId(req), input);
  res.status(200).json({ success: true, data: { question } });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await questionService.remove(questionId(req), requireAuthUserId(req));
  res.status(200).json({ success: true, data: { message: 'Question deleted.' } });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(questionRejectSchema, req.body);
  const question = await questionService.reject(questionId(req), requireAuthUserId(req), input);
  res.status(200).json({ success: true, data: { question } });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(questionApproveSchema, req.body);
  const result = await questionService.approve(questionId(req), requireAuthUserId(req), input);
  res.status(200).json({ success: true, data: result });
});
