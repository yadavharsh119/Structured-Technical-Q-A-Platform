import { ArrowUp } from 'lucide-react';
import type { Topic } from '../../types/landing';

export function TopicCard({ topic }: { topic: Topic }) {
  return (
    <a
      href={`/topics/${topic.slug}`}
      className="flex h-full flex-col rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-ink"
    >
      <p className="text-sm font-medium text-muted">{topic.category}</p>
      <h3 className="mt-2 font-serif text-xl font-medium leading-snug text-ink">
        {topic.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-base text-body">{topic.description}</p>
      <p className="mt-4 inline-flex items-center gap-1 pt-2 text-sm font-medium text-ink">
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
        {topic.perspectiveCount} Perspectives
      </p>
    </a>
  );
}
