import { Link } from 'react-router-dom';
import type { TopicDetail } from '../../types/topic';
import { ArchivedNotice } from './ArchivedNotice';
import { SourceQuestionCard } from './SourceQuestionCard';

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TopicHeader({ topic }: { topic: TopicDetail }) {
  const archived = topic.status === 'archived';

  return (
    <div>
      <nav aria-label="Breadcrumb">
        <p className="text-sm text-muted">
          <Link to="/topics" className="hover:text-black">Topics</Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page" className="text-ink">{topic.category}</span>
        </p>
      </nav>

      {archived && (
        <div className="mt-4">
          <ArchivedNotice />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted">{topic.category}</span>
        {archived && (
          <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
            Archived
          </span>
        )}
      </div>

      <h1 className="mt-2 font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]">{topic.title}</h1>
      <p className="mt-4 max-w-2xl text-[20px] text-body">{topic.description}</p>

      {topic.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
          {topic.tags.map((t) => (
            <li key={t} className="rounded-md bg-tint px-2.5 py-1 text-xs font-medium text-body">
              #{t}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-sm text-muted">
        Created <time dateTime={topic.createdAt}>{formatDate(topic.createdAt)}</time>
        <span aria-hidden="true"> · </span>
        {topic.perspectiveCount} Perspectives
      </p>

      <SourceQuestionCard source={topic.sourceQuestion} questions={topic.sourceQuestions} />
    </div>
  );
}
