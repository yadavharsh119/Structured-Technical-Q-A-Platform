import { z } from 'zod';

// ── Search endpoint (FR-SRCH-01, FR-SRCH-02) ─────────────────────────────────

export const SEARCH_QUERY_MIN = 2;
export const SEARCH_PAGE_SIZE = 20;

export const searchSortSchema = z.enum(
  ['relevance', 'newest', 'most_upvotes', 'most_perspectives'],
  {
    errorMap: () => ({
      message: 'sort must be one of: relevance, newest, most_upvotes, most_perspectives.',
    }),
  },
);

export type SearchSort = z.infer<typeof searchSortSchema>;

/**
 * Zod schema for GET /api/search query parameters.
 *
 * - q: required keyword, minimum 2 characters after trimming
 * - category: optional category id (UUID) or slug
 * - tag: zero or more tag names (repeatable: ?tag=foo&tag=bar)
 * - sort: relevance | newest | most_upvotes | most_perspectives  (default: relevance)
 * - page: positive integer (default: 1); page size is fixed at SEARCH_PAGE_SIZE
 */
export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(SEARCH_QUERY_MIN, `Search query must be at least ${SEARCH_QUERY_MIN} characters.`),
  category: z.string().trim().min(1).optional(),
  tag: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .pipe(z.array(z.string().trim().min(1)))
    .optional(),
  sort: searchSortSchema.default('relevance'),
  page: z.coerce.number().int().positive('page must be a positive integer.').default(1),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

// ── Response types ────────────────────────────────────────────────────────────

export interface SearchTopicResult {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  category: {
    id: string;
    name: string;
  };
  tags: string[];
  perspectiveCount: number;
  totalUpvotes: number;
  /** Whether the keyword hit was in the topic's own text or in a perspective */
  matchedIn: 'topic' | 'perspective' | 'both';
}

export interface SearchResponse {
  results: SearchTopicResult[];
  total: number;
  page: number;
  pageSize: number;
  filters: {
    q: string;
    category?: string;
    tags: string[];
    sort: SearchSort;
  };
}
