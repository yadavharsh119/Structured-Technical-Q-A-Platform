import { Link } from 'react-router-dom';
import type { SourceQuestion } from '../../types/topic';

interface Props {
  source?: SourceQuestion | null;
  questions?: SourceQuestion[];
}

export function SourceQuestionCard({ source, questions }: Props) {
  const list = questions && questions.length > 0 ? questions : source ? [source] : [];
  if (list.length === 0) return null;

  return (
    <section aria-labelledby="source-questions-heading" className="mt-6 rounded-xl border border-line bg-tint/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <h2 id="source-questions-heading" className="text-xs font-semibold uppercase tracking-wider text-muted">
        Source Question{list.length > 1 ? 's' : ''}
      </h2>
      <ul className="mt-3 divide-y divide-line/60">
        {list.map((q, idx) => {
          const href = q.link ?? `/questions/${q.id ?? idx + 1}`;
          return (
            <li key={q.id ?? q.title} className="py-2 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <Link
                to={href}
                className="text-base font-medium text-ink underline decoration-line hover:decoration-ink hover:text-black transition-colors"
              >
                {q.title}
              </Link>
              <span className="text-xs text-muted shrink-0">asked by @{q.askedBy}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
