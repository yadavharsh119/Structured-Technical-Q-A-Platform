import { AppError } from '../middleware/errorHandler';
import { searchRepository } from '../repositories/searchRepository';
import type { SearchQuery, SearchResponse, SearchTopicResult } from '@structured-qa/shared';
import { SEARCH_PAGE_SIZE } from '@structured-qa/shared';

async function search(input: SearchQuery, includeHidden = false): Promise<SearchResponse> {
  const { q, category, tag, sort, page } = input;

  const tags = tag ?? [];

  const { rows, total } = await searchRepository.search({
    query: q,
    category,
    tags,
    sort,
    page,
    pageSize: SEARCH_PAGE_SIZE,
    includeHidden,
  });

  const results: SearchTopicResult[] = rows.map((row) => {
    const topicMatched = row.topic_matched;
    const perspectiveMatched = row.perspective_matched;

    let matchedIn: SearchTopicResult['matchedIn'];
    if (topicMatched && perspectiveMatched) {
      matchedIn = 'both';
    } else if (perspectiveMatched) {
      matchedIn = 'perspective';
    } else {
      matchedIn = 'topic';
    }

    return {
      id: row.topic_id,
      slug: row.slug,
      title: row.title,
      shortDescription: row.description,
      category: {
        id: row.category_id,
        name: row.category_name,
      },
      tags: [], // populated below
      perspectiveCount: parseInt(row.perspective_count, 10),
      totalUpvotes: parseInt(row.total_upvotes, 10),
      matchedIn,
    };
  });

  // Enrich with tags in a second pass (avoids N+1 by batching)
  if (results.length > 0) {
    const topicIds = results.map((r) => r.id);
    const tagMap = await searchRepository.tagsByTopicIds(topicIds);
    for (const result of results) {
      result.tags = tagMap.get(result.id) ?? [];
    }
  }

  return {
    results,
    total,
    page,
    pageSize: SEARCH_PAGE_SIZE,
    filters: {
      q,
      ...(category !== undefined ? { category } : {}),
      tags,
      sort,
    },
  };
}

function invalidQuery(message: string): AppError {
  return new AppError(message, 400, 'VALIDATION_ERROR');
}

export const searchService = { search, invalidQuery };
