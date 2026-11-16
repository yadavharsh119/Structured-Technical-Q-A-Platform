import { sql } from 'kysely';
import { db } from '../config/database';
import type { SearchSort } from '@structured-qa/shared';

// ── Raw row returned by the search query ─────────────────────────────────────

export interface SearchResultRow {
  topic_id: string;
  slug: string;
  title: string;
  description: string;
  category_id: string;
  category_name: string;
  perspective_count: string; // bigint → string from node-postgres
  total_upvotes: string;     // bigint → string from node-postgres
  topic_matched: boolean;
  perspective_matched: boolean;
  rank: number;
  created_at: Date;
}

export interface SearchParams {
  query: string;
  /** Category UUID or slug */
  category?: string;
  /** Tag names to filter by (all must match) */
  tags: string[];
  sort: SearchSort;
  page: number;
  pageSize: number;
  /** Moderators/admins may see hidden topics and perspectives */
  includeHidden: boolean;
}

export interface SearchResultSet {
  rows: SearchResultRow[];
  total: number;
}

// ── UUID regexp (fast path for category param) ────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const searchRepository = {
  /**
   * Fetch tag names for a batch of topic ids.
   * Returns a Map<topicId, tagName[]>.
   */
  async tagsByTopicIds(topicIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (topicIds.length === 0) return map;

    const rows = await db
      .selectFrom('topic_tags')
      .innerJoin('tags', 'tags.id', 'topic_tags.tag_id')
      .select(['topic_tags.topic_id', 'tags.name'])
      .where('topic_tags.topic_id', 'in', topicIds)
      .execute();

    for (const row of rows) {
      const list = map.get(row.topic_id) ?? [];
      list.push(row.name);
      map.set(row.topic_id, list);
    }
    return map;
  },

  /**
   * Full-text search across published topics and their visible perspectives.
   *
   * Returns topics whose own tsvector OR any child perspective tsvector matches
   * the supplied keyword query.  The result set is COUNT-windowed so callers
   * get the total in a single round-trip.
   *
   * All parameterisation is done through Kysely / node-postgres placeholders;
   * no string interpolation of user input is performed.
   */
  async search(params: SearchParams): Promise<SearchResultSet> {
    const { query, category, tags, sort, page, pageSize, includeHidden } = params;

    // Convert the keyword string to a plain tsquery (handles multiple words
    // with implicit AND, safe against special characters).
    // We use plainto_tsquery which is injection-safe with parameterised input.
    const tsQuery = sql`plainto_tsquery('english', ${query})`;

    const offset = (page - 1) * pageSize;

    const visibleTopic = includeHidden ? sql`true` : sql`t.hidden = false`;
    // Soft-deleted perspectives are never searchable, even for moderators.
    const visiblePerspective = includeHidden
      ? sql`p.deleted_at IS NULL`
      : sql`p.hidden = false AND p.deleted_at IS NULL`;
    const visiblePerspectiveP2 = includeHidden
      ? sql`p2.deleted_at IS NULL`
      : sql`p2.hidden = false AND p2.deleted_at IS NULL`;

    // ── Category sub-filter ───────────────────────────────────────────────────
    // Accept both UUID and slug so the caller does not need to pre-resolve it.
    let categoryCondition = sql`true`;
    if (category) {
      if (UUID_RE.test(category)) {
        categoryCondition = sql`t.category_id = ${category}::uuid`;
      } else {
        // slug lookup via a sub-select (parameterised)
        categoryCondition = sql`t.category_id = (
          SELECT id FROM categories WHERE lower(name::text) = lower(${category}) AND is_active = true
          LIMIT 1
        )`;
      }
    }

    // ── Tag sub-filter ────────────────────────────────────────────────────────
    // A topic must have ALL requested tags (ALL-match semantics).
    let tagCondition = sql`true`;
    if (tags.length > 0) {
      // Build an array literal via sql.join so every element is parameterised.
      const tagArray = sql`ARRAY[${sql.join(tags.map((t) => sql`${t}`), sql`, `)}]`;
      tagCondition = sql`(
        SELECT count(*) FROM topic_tags tt
        INNER JOIN tags tg ON tg.id = tt.tag_id
        WHERE tt.topic_id = t.id
          AND tg.name = ANY(${tagArray})
      ) = ${tags.length}`;
    }

    // ── Sort expression ───────────────────────────────────────────────────────
    let orderExpr: ReturnType<typeof sql>;
    switch (sort) {
      case 'newest':
        orderExpr = sql`created_at DESC`;
        break;
      case 'most_upvotes':
        orderExpr = sql`total_upvotes DESC, rank DESC`;
        break;
      case 'most_perspectives':
        orderExpr = sql`perspective_count DESC, rank DESC`;
        break;
      case 'relevance':
      default:
        orderExpr = sql`rank DESC, created_at DESC`;
        break;
    }

    // ── Main query ────────────────────────────────────────────────────────────
    // CTE approach:
    //   matched_topics – topics that have a direct text hit
    //   matched_via_perspective – topics that have a hit in any visible perspective
    //   combined – UNION of both, keeping max rank and two boolean flags
    //   enriched – joins category, counts perspectives + votes
    //
    // COUNT(*) OVER () gives total without a second query.
    const rawResult = await sql<SearchResultRow & { full_count: string }>`
      WITH
        matched_topics AS (
          SELECT
            t.id               AS topic_id,
            ts_rank(t.search_vector, ${tsQuery}) AS rank
          FROM topics t
          WHERE t.status = 'published'
            AND ${visibleTopic}
            AND ${categoryCondition}
            AND ${tagCondition}
            AND t.search_vector @@ ${tsQuery}
        ),
        matched_via_perspective AS (
          SELECT
            t.id               AS topic_id,
            max(ts_rank(p.search_vector, ${tsQuery})) AS rank
          FROM topics t
          INNER JOIN perspectives p ON p.topic_id = t.id
          WHERE t.status = 'published'
            AND ${visibleTopic}
            AND ${categoryCondition}
            AND ${tagCondition}
            AND p.status = 'visible'
            AND ${visiblePerspective}
            AND p.search_vector @@ ${tsQuery}
          GROUP BY t.id
        ),
        combined AS (
          SELECT
            topic_id,
            max(rank)                                                AS rank,
            bool_or(topic_id IN (SELECT topic_id FROM matched_topics))       AS topic_matched,
            bool_or(topic_id IN (SELECT topic_id FROM matched_via_perspective)) AS perspective_matched
          FROM (
            SELECT topic_id, rank FROM matched_topics
            UNION ALL
            SELECT topic_id, rank FROM matched_via_perspective
          ) unioned
          GROUP BY topic_id
        ),
        enriched AS (
          SELECT
            c.topic_id,
            t.slug,
            t.title,
            t.description,
            t.category_id,
            cat.name                                          AS category_name,
            count(DISTINCT p.id)                              AS perspective_count,
            coalesce(sum(DISTINCT pv_counts.vote_count), 0)   AS total_upvotes,
            c.topic_matched,
            c.perspective_matched,
            c.rank,
            t.created_at,
            count(*) OVER ()                                  AS full_count
          FROM combined c
          INNER JOIN topics t   ON t.id  = c.topic_id
          INNER JOIN categories cat ON cat.id = t.category_id
          LEFT  JOIN perspectives p ON p.topic_id = t.id AND p.status = 'visible' AND ${visiblePerspective}
          LEFT  JOIN LATERAL (
            SELECT p2.id AS perspective_id, count(*) AS vote_count
            FROM perspective_votes pv
            INNER JOIN perspectives p2 ON p2.id = pv.perspective_id
            WHERE p2.topic_id = c.topic_id AND p2.status = 'visible' AND ${visiblePerspectiveP2}
            GROUP BY p2.id
          ) pv_counts ON true
          GROUP BY
            c.topic_id, t.slug, t.title, t.description,
            t.category_id, cat.name, c.topic_matched, c.perspective_matched,
            c.rank, t.created_at
        )
      SELECT *
      FROM enriched
      ORDER BY ${orderExpr}
      LIMIT ${pageSize} OFFSET ${offset}
    `.execute(db);

    const rows = rawResult.rows;
    const firstRow = rows[0];
    const total = firstRow !== undefined ? parseInt(firstRow.full_count, 10) : 0;

    // Strip the full_count synthetic column from each row
    const cleanRows: SearchResultRow[] = rows.map(({ full_count: _fc, ...rest }) => rest);

    return { rows: cleanRows, total };
  },
};
