import { useMemo } from 'react';
import { searchTopics } from '../lib/searchTopics';
import type { TopicSearchParams, TopicSearchResult } from '../types/search';

export function useTopicSearch(params: TopicSearchParams): { data: TopicSearchResult; isLoading: boolean } {
  const data = useMemo(() => searchTopics(params), [params]);
  return { data, isLoading: false };
}
