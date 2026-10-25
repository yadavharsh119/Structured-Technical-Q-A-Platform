import { Link } from 'react-router-dom';
import type { TopicResult } from '../../types/search';

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TopicResultCard({ topic }: { topic: TopicResult }) {
  return (
    <Link
      to={`/topics/${topic.slug}`}
      className="block rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-ink"
    >
      <p className="text-sm font-medium text-muted">{topic.category}</p>
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
      <p className="mt-4 text-sm text-muted">
        {topic.perspectiveCount === 0 ? (
          <span>No Perspectives yet</span>
        ) : (
          <span className="font-medium text-ink">
            {topic.perspectiveCount} Perspectives · {topic.totalUpvotes} upvotes
          </span>
        )}
        <span aria-hidden="true"> · </span>
        <span>@{topic.author}</span>
        <span aria-hidden="true"> · </span>
        <time dateTime={topic.createdAt}>{formatDate(topic.createdAt)}</time>
      </p>
    </Link>
  );
}
