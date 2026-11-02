import type { Request, Response } from 'express';
import { searchQuerySchema } from '@structured-qa/shared';
import { asyncHandler, parseBody } from './requestParsing';
import { searchService } from '../services/searchService';

/**
 * GET /api/search
 *
 * Public endpoint — no authentication required (FR-SRCH-01).
 * Query params are parsed and validated via the shared Zod schema.
 */
export const search = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(searchQuerySchema, req.query);
  const response = await searchService.search(input);
  res.status(200).json({ success: true, data: response });
});
