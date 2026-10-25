import { getTopicBySlug } from '../lib/getTopic';
import type { TopicDetail } from '../types/topic';

// Mock API layer — when the backend exists, replace the bodies of these
// functions with real fetch calls. Nothing else should need to change.
const LATENCY_MS = 250;

export function fetchTopicBySlug(slug: string): Promise<TopicDetail | null> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(getTopicBySlug(slug)), LATENCY_MS),
  );
}
