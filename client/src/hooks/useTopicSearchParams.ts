import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_SEARCH_PARAMS, type SortKey, type TopicSearchParams } from '../types/search';

const SORTS: SortKey[] = ['relevance', 'newest', 'upvotes', 'perspectives'];

function parse(sp: URLSearchParams): TopicSearchParams {
  const sort = sp.get('sort');
  const page = Number(sp.get('page'));
  return {
    q: sp.get('q') ?? '',
    category: sp.get('category') ?? '',
    tags: (sp.get('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    from: sp.get('from') ?? '',
    to: sp.get('to') ?? '',
    author: sp.get('author') ?? '',
    minUpvotes: Number(sp.get('minUpvotes')) || 0,
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : 'relevance',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

function serialize(p: TopicSearchParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (p.q) sp.set('q', p.q);
  if (p.category) sp.set('category', p.category);
  if (p.tags.length > 0) sp.set('tags', p.tags.join(','));
  if (p.from) sp.set('from', p.from);
  if (p.to) sp.set('to', p.to);
  if (p.author) sp.set('author', p.author);
  if (p.minUpvotes > 0) sp.set('minUpvotes', String(p.minUpvotes));
  if (p.sort !== 'relevance') sp.set('sort', p.sort);
  if (p.page > 1) sp.set('page', String(p.page));
  return sp;
}

export function useTopicSearchParams(): {
  params: TopicSearchParams;
  update: (patch: Partial<TopicSearchParams>, resetPage?: boolean) => void;
  clearAll: () => void;
} {
  const [sp, setSp] = useSearchParams();
  const params = useMemo(() => ({ ...DEFAULT_SEARCH_PARAMS, ...parse(sp) }), [sp]);

  const update = (patch: Partial<TopicSearchParams>, resetPage = true) => {
    const next = { ...parse(sp), ...patch };
    if (resetPage && patch.page === undefined) next.page = 1;
    setSp(serialize(next));
  };

  const clearAll = () => setSp(new URLSearchParams());

  return { params, update, clearAll };
}
