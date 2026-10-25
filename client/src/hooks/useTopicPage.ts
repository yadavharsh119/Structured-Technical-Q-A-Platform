import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchTopicBySlug } from '../api/topics';
import { fetchPerspectives } from '../api/perspectives';
import { PERSPECTIVE_PAGE_SIZE } from '../lib/getTopic';
import type { PerspectivePage, PerspectiveSort, TopicDetail } from '../types/topic';

export function useTopicPage(slug: string): {
  topic: TopicDetail | null;
  perspectives: PerspectivePage;
  sort: PerspectiveSort;
  onlyWithCode: boolean;
  update: (patch: { sort?: PerspectiveSort; onlyWithCode?: boolean; page?: number }, resetPage?: boolean) => void;
  isLoading: boolean;
} {
  const [sp, setSp] = useSearchParams();
  const rawSort = sp.get('sort');
  const sort: PerspectiveSort = rawSort === 'upvotes' ? 'upvotes' : 'newest';
  const onlyWithCode = sp.get('code') === 'true';
  const rawPage = Number(sp.get('page'));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [perspectives, setPerspectives] = useState<PerspectivePage>({
    items: [],
    total: 0,
    page: 1,
    pageSize: PERSPECTIVE_PAGE_SIZE,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    setIsLoading(true);

    Promise.all([
      fetchTopicBySlug(slug),
      fetchPerspectives({ slug, sort, onlyWithCode, page, pageSize: PERSPECTIVE_PAGE_SIZE }),
    ])
      .then(([t, p]) => {
        if (!canceled) {
          setTopic(t);
          setPerspectives(p);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!canceled) {
          setTopic(null);
          setIsLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [slug, sort, onlyWithCode, page]);

  const update = (
    patch: { sort?: PerspectiveSort; onlyWithCode?: boolean; page?: number },
    resetPage = true,
  ) => {
    const next = new URLSearchParams();
    const s = patch.sort ?? sort;
    const c = patch.onlyWithCode ?? onlyWithCode;
    const p = patch.page ?? (resetPage ? 1 : page);
    if (s !== 'newest') next.set('sort', s);
    if (c) next.set('code', 'true');
    if (p > 1) next.set('page', String(p));
    setSp(next);
  };

  return { topic, perspectives, sort, onlyWithCode, update, isLoading };
}
