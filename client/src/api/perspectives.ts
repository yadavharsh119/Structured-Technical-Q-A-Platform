import {
  PERSPECTIVE_ADVANTAGES_MAX,
  PERSPECTIVE_EXPLANATION_MAX,
  PERSPECTIVE_ITEM_MAX,
  PERSPECTIVE_LIMITATIONS_MAX,
  PERSPECTIVE_REFERENCES_MAX,
  PERSPECTIVE_SNIPPETS_MAX,
  PERSPECTIVE_SOLUTION_MAX,
  perspectiveSubmissionSchema,
  reportPerspectiveSchema,
} from '@structured-qa/shared';
import type {
  PerspectiveSubmission,
  ReportPerspectivePayload,
  ReportPerspectiveResult,
} from '@structured-qa/shared';
import { getPerspectives, getTopicBySlug } from '../lib/getTopic';
import type { Perspective, PerspectivePage, PerspectiveQuery, TopicDetail } from '../types/topic';

export type { PerspectiveSubmission, ReportPerspectivePayload, ReportPerspectiveResult };

export {
  PERSPECTIVE_ADVANTAGES_MAX,
  PERSPECTIVE_EXPLANATION_MAX,
  PERSPECTIVE_ITEM_MAX,
  PERSPECTIVE_LIMITATIONS_MAX,
  PERSPECTIVE_REFERENCES_MAX,
  PERSPECTIVE_SNIPPETS_MAX,
  PERSPECTIVE_SOLUTION_MAX,
  perspectiveSubmissionSchema,
};

export interface SubmittedPerspective {
  id: string;
  status: 'Pending';
}

const LATENCY_MS = 600;

function mockId(): string {
  return `p-${Date.now().toString(36)}`;
}

import { SEARCH_TOPICS } from '../data/mockTopics';
import { PERSPECTIVES } from '../data/mockPerspectives';

export const PERSPECTIVE_TEMPLATES = [
  {
    id: 'debugging',
    name: 'Debugging',
    solution: 'Identify and resolve the root cause in the execution path.',
    explanation: 'Root Cause Analysis:\n1. Reproduction steps and observed symptoms\n2. Underlying mechanism failure\n3. Verification and prevention steps',
    advantages: ['Directly resolves symptom without regression', 'Minimal blast radius'],
    limitations: ['May require downtime or configuration restart', 'Does not address adjacent architectural bottlenecks'],
  },
  {
    id: 'system-design',
    name: 'System Design',
    solution: 'Decouple state and scale using asynchronous event-driven pipelines.',
    explanation: 'Architecture Overview:\n1. Ingress and validation layer\n2. Partitioned message bus for durable delivery\n3. Horizontally scaled consumers and read caches',
    advantages: ['High throughput and resilience against bursts', 'Independent scalability of components'],
    limitations: ['Introduces eventual consistency latency', 'Increased operational complexity and monitoring overhead'],
  },
  {
    id: 'tech-comparison',
    name: 'Technology Comparison',
    solution: 'Select the optimal technology based on access patterns and team constraints.',
    explanation: 'Comparative Evaluation:\n1. Performance under high concurrency\n2. Developer ergonomics and maintenance cost\n3. Integration with existing stack',
    advantages: ['Proven reliability and rich community ecosystem', 'Clear migration and rollback paths'],
    limitations: ['Higher licensing or infrastructure costs', 'Steeper initial learning curve'],
  },
] as const;

export async function hasUserSubmittedPerspective(
  topicSlug: string,
  username: string,
): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return PERSPECTIVES.some((p) => p.topicSlug === topicSlug && p.author === username);
}

export async function submitPerspective(
  topicSlug: string,
  payload: PerspectiveSubmission,
  authorUsername?: string,
): Promise<SubmittedPerspective> {
  const parsed = perspectiveSubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid perspective.');
  }

  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  const newId = mockId();
  const author = payload.anonymous ? null : (authorUsername ?? 'you');

  PERSPECTIVES.unshift({
    id: newId,
    topicSlug,
    author,
    authorTopDomain: null,
    solution: payload.solution,
    explanation: payload.explanation,
    advantages: payload.advantages,
    limitations: payload.limitations,
    codeSnippets: payload.codeSnippets ?? [],
    references: payload.references ?? [],
    upvotes: 0,
    createdAt: new Date().toISOString().split('T')[0],
  });

  const topic = SEARCH_TOPICS.find((t) => t.slug === topicSlug);
  if (topic) {
    topic.perspectiveCount += 1;
  }

  return { id: newId, status: 'Pending' };
}

export function fetchPerspectives(query: PerspectiveQuery): Promise<PerspectivePage> {
  // Mock API: fetch perspectives matching the query
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getPerspectives(query));
    }, 250);
  });
}

export async function reportPerspective(
  payload: ReportPerspectivePayload,
): Promise<ReportPerspectiveResult> {
  const parsed = reportPerspectiveSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid report submission.');
  }
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  return {
    reportId: `rep-${mockId()}`,
    status: 'received',
  };
}

export async function upvotePerspective(
  perspectiveId: string,
  delta: 1 | -1,
): Promise<{ success: boolean; id: string; delta: number }> {
  void perspectiveId;
  void delta;
  await new Promise((resolve) => setTimeout(resolve, 150));
  return { success: true, id: perspectiveId, delta };
}

export interface ComparePerspectivesResult {
  perspectives: Perspective[];
  topic: TopicDetail | null;
  error?: string;
}

export async function fetchPerspectivesByIds(
  ids: string[],
): Promise<ComparePerspectivesResult> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  if (!ids || ids.length < 2 || ids.length > 3) {
    return {
      perspectives: [],
      topic: null,
      error: 'Please select exactly 2 or 3 perspectives to compare.',
    };
  }

  const found: Perspective[] = [];
  for (const id of ids) {
    const item = PERSPECTIVES.find((p) => p.id === id);
    if (!item) {
      return {
        perspectives: [],
        topic: null,
        error: `Perspective "${id}" was not found.`,
      };
    }
    found.push(item);
  }

  const topicSlug = found[0].topicSlug;
  const isSameTopic = found.every((p) => p.topicSlug === topicSlug);
  if (!isSameTopic) {
    return {
      perspectives: [],
      topic: null,
      error: 'Cannot compare perspectives from different topics.',
    };
  }

  const topic = getTopicBySlug(topicSlug);
  if (!topic) {
    return {
      perspectives: [],
      topic: null,
      error: 'Topic for the selected perspectives was not found.',
    };
  }

  return {
    perspectives: found,
    topic,
  };
}
