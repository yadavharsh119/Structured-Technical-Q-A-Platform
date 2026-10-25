import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchPerspectivesByIds } from '../api/perspectives';
import type { Perspective, TopicDetail } from '../types/topic';

export interface UsePerspectiveCompareState {
  perspectives: Perspective[];
  topic: TopicDetail | null;
  error: string | null;
  isLoading: boolean;
}

export function usePerspectiveCompare(): UsePerspectiveCompareState {
  const [sp] = useSearchParams();
  const rawIds = sp.get('ids') ?? '';
  const ids = rawIds
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    setIsLoading(true);
    setError(null);

    if (ids.length < 2 || ids.length > 3) {
      setIsLoading(false);
      setPerspectives([]);
      setTopic(null);
      setError('Please select exactly 2 or 3 perspectives to compare.');
      return;
    }

    fetchPerspectivesByIds(ids)
      .then((res) => {
        if (canceled) return;
        if (res.error) {
          setError(res.error);
          setPerspectives([]);
          setTopic(null);
        } else {
          setPerspectives(res.perspectives);
          setTopic(res.topic);
          setError(null);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (canceled) return;
        setError(err instanceof Error ? err.message : 'Failed to load perspectives for comparison.');
        setPerspectives([]);
        setTopic(null);
        setIsLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [rawIds]);

  return { perspectives, topic, error, isLoading };
}
