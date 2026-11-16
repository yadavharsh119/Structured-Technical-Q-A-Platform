import { SEARCH_TOPICS } from '../data/mockTopics';
import type { TopicResult, TopicSearchParams, TopicSearchResult } from '../types/search';

export const PAGE_SIZE = 20;

function words(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean);
}

// Placeholder scoring for real full-text ranking on the backend:
// title match 3, description 2, snippet 1 per word, high to low.
function score(title: string, desc: string, snippets: string[], ws: string[]): number {
  const t = title.toLowerCase();
  const d = desc.toLowerCase();
  const s = snippets.join(' ').toLowerCase();
  return ws.reduce((n, w) => n + (t.includes(w) ? 3 : 0) + (d.includes(w) ? 2 : 0) + (s.includes(w) ? 1 : 0), 0);
}

function haystack(title: string, desc: string, snippets: string[]): string {
  return `${title} ${desc} ${snippets.join(' ')}`.toLowerCase();
}

export function searchTopics(params: TopicSearchParams): TopicSearchResult {
  const ws = words(params.q);
  const scored: { topic: TopicResult; rank: number }[] = [];

  for (const topic of SEARCH_TOPICS) {
    if (topic.status !== 'published') continue;
    if (params.category && topic.category !== params.category) continue;
    if (params.tags.length > 0 && !params.tags.every((t) => topic.tags.includes(t))) continue;
    if (params.from && topic.createdAt < params.from) continue;
    if (params.to && topic.createdAt > params.to) continue;
    if (params.author && !topic.author.toLowerCase().includes(params.author.toLowerCase())) continue;
    if (topic.totalUpvotes < params.minUpvotes) continue;
    const rank = ws.length > 0 ? score(topic.title, topic.description, topic.perspectiveSnippets, ws) : 0;
    if (ws.length > 0 && !ws.every((w) => haystack(topic.title, topic.description, topic.perspectiveSnippets).includes(w))) continue;
    scored.push({ topic, rank });
  }

  const sorted = [...scored];
  switch (params.sort) {
    case 'newest':
      sorted.sort((a, b) => b.topic.createdAt.localeCompare(a.topic.createdAt));
      break;
    case 'upvotes':
      sorted.sort((a, b) => b.topic.totalUpvotes - a.topic.totalUpvotes);
      break;
    case 'perspectives':
      sorted.sort((a, b) => b.topic.perspectiveCount - a.topic.perspectiveCount);
      break;
    default:
      if (ws.length > 0) sorted.sort((a, b) => b.rank - a.rank);
      else sorted.sort((a, b) => b.topic.createdAt.localeCompare(a.topic.createdAt));
  }

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page), pages);
  const items = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => s.topic);
  return { items, total, page, pageSize: PAGE_SIZE };
}
