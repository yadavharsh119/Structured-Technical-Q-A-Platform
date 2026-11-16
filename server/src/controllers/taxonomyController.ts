import type { Request, Response } from 'express';
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  tagCreateSchema,
  tagMergeSchema,
  tagUpdateSchema,
} from '@structured-qa/shared';
import { taxonomyService } from '../services/taxonomyService';
import {
  asyncHandler,
  parseBody,
  parseUuidParam,
  requireAuthUserId,
} from './requestParsing';

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await taxonomyService.listCategories();
  res.status(200).json({ success: true, data: { categories } });
});

export const listAdminCategories = asyncHandler(async (_req, res) => {
  const categories = await taxonomyService.listAdminCategories();
  res.status(200).json({ success: true, data: { categories } });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(categoryCreateSchema, req.body);
  const category = await taxonomyService.createCategory(
    input,
    requireAuthUserId(req),
    req.ip,
  );
  res.status(201).json({ success: true, data: { category } });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const categoryId = parseUuidParam(req.params.id, 'category id');
  const input = parseBody(categoryUpdateSchema, req.body);
  const category = await taxonomyService.updateCategory(
    categoryId,
    input,
    requireAuthUserId(req),
    req.ip,
  );
  res.status(200).json({ success: true, data: { category } });
});

export const listTags = asyncHandler(async (_req, res) => {
  const tags = await taxonomyService.listTags();
  res.status(200).json({ success: true, data: { tags } });
});

export const listAdminTags = asyncHandler(async (_req, res) => {
  const tags = await taxonomyService.listAdminTags();
  res.status(200).json({ success: true, data: { tags } });
});

export const createTag = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(tagCreateSchema, req.body);
  const tag = await taxonomyService.createTag(input, requireAuthUserId(req), req.ip);
  res.status(201).json({ success: true, data: { tag } });
});

export const updateTag = asyncHandler(async (req: Request, res: Response) => {
  const tagId = parseUuidParam(req.params.id, 'tag id');
  const input = parseBody(tagUpdateSchema, req.body);
  const tag = await taxonomyService.updateTag(tagId, input, requireAuthUserId(req), req.ip);
  res.status(200).json({ success: true, data: { tag } });
});

export const mergeTags = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(tagMergeSchema, req.body);
  const result = await taxonomyService.mergeTags(input, requireAuthUserId(req), req.ip);
  res.status(200).json({ success: true, data: result });
});
