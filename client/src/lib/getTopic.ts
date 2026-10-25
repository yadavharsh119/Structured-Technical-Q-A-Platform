import { ARCHIVED_SOURCE, ARCHIVED_TOPIC, SEARCH_TOPICS, SOURCE_BY_SLUG } from '../data/mockTopics';
import { PERSPECTIVES } from '../data/mockPerspectives';
import type { PerspectivePage, PerspectiveQuery, TopicDetail } from '../types/topic';

export const PERSPECTIVE_PAGE_SIZE = 10;

export function getTopicBySlug(slug: string): TopicDetail | null {
  if (slug === ARCHIVED_TOPIC.slug) {
    return { ...ARCHIVED_TOPIC, sourceQuestion: { ...ARCHIVED_SOURCE }, sourceQuestions: [{ ...ARCHIVED_SOURCE }] };
  }
  const found = SEARCH_TOPICS.find((t) => t.slug === slug);
  if (!found) return null;
  const src = SOURCE_BY_SLUG[slug];
  return {
    ...found,
    sourceQuestion: src ? { ...src } : null,
    sourceQuestions: src ? [{ ...src }] : [],
  };
}

export function getPerspectives(query: PerspectiveQuery): PerspectivePage {
  const all = PERSPECTIVES.filter((p) => p.topicSlug === query.slug);
  const filtered = query.onlyWithCode ? all.filter((p) => p.codeSnippets.length > 0) : all;
  const sorted = [...filtered];
  if (query.sort === 'newest') sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else sorted.sort((a, b) => b.upvotes - a.upvotes);

  const total = sorted.length;
  const pageSize = query.pageSize;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, query.page), pages);
  const items = sorted.slice((page - 1) * pageSize, page * pageSize);
  return { items, total, page, pageSize };
}
