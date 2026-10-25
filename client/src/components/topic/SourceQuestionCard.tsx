interface LinkedQuestion {
  id: string;
  title: string;
  authorUsername?: string | null;
}

export function SourceQuestionCard({ questions }: { questions: LinkedQuestion[] }) {
  if (questions.length === 0) return null;

  return (
    <section
      aria-labelledby="source-questions-heading"
      className="mt-6 rounded-xl border border-line bg-tint/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <h2
        id="source-questions-heading"
        className="text-xs font-semibold uppercase tracking-wider text-muted"
      >
        Source Question{questions.length > 1 ? 's' : ''}
      </h2>
      <ul className="mt-3 divide-y divide-line/60">
        {questions.map((q) => (
          <li
            key={q.id}
            data-testid="topic-question-item"
            className="py-2 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
          >
            <span className="text-base font-medium text-ink">{q.title}</span>
            {q.authorUsername && (
              <span className="text-xs text-muted shrink-0">asked by @{q.authorUsername}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
