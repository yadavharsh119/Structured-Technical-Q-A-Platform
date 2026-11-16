import { Link } from 'react-router-dom';
import type { Topic } from '../../api/types';

interface Props {
  topic: Topic;
  categoryName: string;
}

export function TopicResultCard({ topic, categoryName }: Props) {
  return (
    <Link
      to={`/topics/${topic.slug}`}
      data-testid="topic-card"
      className="block rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-ink"
    >
      <p className="text-sm font-medium text-muted">{categoryName}</p>
      <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">{topic.title}</h3>
      <p className="mt-2 line-clamp-2 text-base text-body">{topic.description}</p>
      {topic.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
          {topic.tags.map((t) => (
            <li key={t} className="rounded-md bg-tint px-2 py-0.5 text-xs text-body">
              {t}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
