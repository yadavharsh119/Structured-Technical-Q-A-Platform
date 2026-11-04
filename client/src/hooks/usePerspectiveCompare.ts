import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { comparePerspectives } from '../api/perspectives';
import { getTopic } from '../api/topics';
import { listCategories } from '../api/taxonomy';
import type { Perspective, Topic } from '../api/types';

export interface UsePerspectiveCompareState {
  perspectives: Perspective[];
  topic: Topic | null;
  categoryName: string;
  error: string | null;
  isLoading: boolean;
}

const INVALID_SELECTION = 'Select two or three perspectives from the same topic to compare.';

export function usePerspectiveCompare(): UsePerspectiveCompareState {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicSlug = (searchParams.get('topic') ?? '').trim();
  const rawIds = searchParams.get('ids') ?? '';

  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [categoryName, setCategoryName] = useState('Uncategorized');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const ids = rawIds
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    setError(null);

    if (!topicSlug || ids.length < 2 || ids.length > 3) {
      setPerspectives([]);
      setTopic(null);
      setCategoryName('Uncategorized');
      setError(INVALID_SELECTION);
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);

    Promise.all([
      comparePerspectives(topicSlug, ids),
      getTopic(topicSlug),
      listCategories(),
    ]).then(([compareResponse, topicResponse, categoriesResponse]) => {
      if (cancelled) return;

      if (!compareResponse.success) {
        setPerspectives([]);
        setTopic(null);
        setCategoryName('Uncategorized');
        setError(compareResponse.error.message);
        setIsLoading(false);
        return;
      }

      if (!topicResponse.success) {
        setPerspectives([]);
        setTopic(null);
        setCategoryName('Uncategorized');
        setError(topicResponse.error.message);
        setIsLoading(false);
        return;
      }

      if ('redirectTo' in topicResponse.data) {
        navigate(
          `/compare?topic=${encodeURIComponent(topicResponse.data.redirectTo.slug)}&ids=${encodeURIComponent(ids.join(','))}`,
          { replace: true },
        );
        setIsLoading(false);
        return;
      }

      const loadedTopic = topicResponse.data.topic;
      if (loadedTopic.slug !== topicSlug) {
        navigate(
          `/compare?topic=${encodeURIComponent(loadedTopic.slug)}&ids=${encodeURIComponent(ids.join(','))}`,
          { replace: true },
        );
        setIsLoading(false);
        return;
      }

      setPerspectives(compareResponse.data.perspectives);
      setTopic(loadedTopic);
      if (categoriesResponse.success) {
        const category = categoriesResponse.data.categories.find(
          (item) => item.id === loadedTopic.categoryId,
        );
        setCategoryName(category?.name ?? 'Uncategorized');
      } else {
        setCategoryName('Uncategorized');
      }
      setError(null);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [topicSlug, rawIds, navigate]);

  return { perspectives, topic, categoryName, error, isLoading };
}
