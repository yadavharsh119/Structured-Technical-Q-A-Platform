import { taxonomyService } from '../services/taxonomyService';
import { asyncHandler } from './requestParsing';

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await taxonomyService.listCategories();
  res.status(200).json({ success: true, data: { categories } });
});

export const listTags = asyncHandler(async (_req, res) => {
  const tags = await taxonomyService.listTags();
  res.status(200).json({ success: true, data: { tags } });
});
