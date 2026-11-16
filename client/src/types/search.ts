import type { Topic } from './landing';

export type SortKey = 'relevance' | 'newest' | 'upvotes' | 'perspectives';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'upvotes', label: 'Most Upvotes' },
  { value: 'perspectives', label: 'Most Perspectives' },
];

export interface SearchTopic extends Topic {
  tags: string[];
  author: string;
  createdAt: string;
  totalUpvotes: number;
  perspectiveSnippets: string[];
  status: 'published' | 'archived';
}

export type TopicResult = SearchTopic;

export interface TopicSearchParams {
  q: string;
  category: string;
  tags: string[];
  from: string;
  to: string;
  author: string;
  minUpvotes: number;
  sort: SortKey;
  page: number;
}

export interface TopicSearchResult {
  items: TopicResult[];
  total: number;
  page: number;
  pageSize: number;
}

export const DEFAULT_SEARCH_PARAMS: TopicSearchParams = {
  q: '',
  category: '',
  tags: [],
  from: '',
  to: '',
  author: '',
  minUpvotes: 0,
  sort: 'relevance',
  page: 1,
};
