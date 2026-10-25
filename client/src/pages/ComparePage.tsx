import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Share2 } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { Button, LinkButton } from '../components/ui/Button';
import { usePerspectiveCompare } from '../hooks/usePerspectiveCompare';

function initials(name: string): string {
  const parts = name.split(/[_\s]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const rowHeaderClass =
  'w-40 shrink-0 bg-tint/60 p-4 text-xs font-semibold uppercase tracking-wider text-muted border-b border-line';
const rowCellClass = 'p-4 text-sm text-body border-b border-line align-top min-w-[280px]';

export function ComparePage() {
  const { perspectives, topic, error, isLoading } = usePerspectiveCompare();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-content px-6 py-16 md:py-24" role="status" aria-live="polite">
          <div className="animate-pulse space-y-6">
            <div className="h-4 w-28 rounded bg-tint" />
            <div className="h-10 w-2/3 rounded bg-tint" />
            <div className="h-6 w-full max-w-md rounded bg-tint" />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-96 rounded-xl border border-line bg-tint/40" />
              <div className="h-96 rounded-xl border border-line bg-tint/40" />
              <div className="h-96 rounded-xl border border-line bg-tint/40" />
            </div>
          </div>
          <span className="sr-only">Loading comparison...</span>
        </div>
      </PageShell>
    );
  }

  if (error || !topic || perspectives.length < 2 || perspectives.length > 3) {
    return (
      <PageShell>
        <section aria-labelledby="compare-error-heading" className="bg-white">
          <div className="mx-auto max-w-content px-6 py-16 text-center md:py-24">
            <p className="text-sm font-medium text-muted">Comparison</p>
            <h1
              id="compare-error-heading"
              className="mx-auto mt-3 max-w-xl font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
            >
              Comparison Unavailable
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-body">
              {error ?? 'You must select exactly 2 or 3 perspectives belonging to the same topic.'}
            </p>
            <div className="mt-8">
              <LinkButton href="/topics">Back to topics list</LinkButton>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="pb-28">
        {/* Header */}
        <section aria-labelledby="compare-heading" className="bg-white border-b border-line">
          <div className="mx-auto max-w-content px-6 py-12 md:py-16">
            <Link
              to={`/topics/${topic.slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to topic
            </Link>

            <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted">{topic.category}</p>
                <h1
                  id="compare-heading"
                  className="mt-2 font-serif text-[28px] leading-[1.2] text-ink md:text-[38px]"
                >
                  Comparing Perspectives
                </h1>
                <p className="mt-1 text-base text-body">Topic: {topic.title}</p>
              </div>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="gap-2"
                  aria-label="Copy shareable comparison link"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-success" aria-hidden="true" />
                      <span>Link copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 text-muted" aria-hidden="true" />
                      <span>Copy link</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Side-by-side comparison table */}
        <section aria-label="Perspective comparison matrix" className="bg-canvas">
          <div className="mx-auto max-w-content px-6 py-8">
            <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <table className="w-full border-collapse text-left">
                <tbody>
                  {/* Row 1: Author */}
                  <tr>
                    <th scope="row" className={rowHeaderClass}>
                      Author
                    </th>
                    {perspectives.map((p) => {
                      const anon = p.author === null;
                      return (
                        <td key={p.id} className={rowCellClass}>
                          <div className="flex items-center gap-2">
                            {anon ? (
                              <span
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-tint text-xs font-semibold text-secondary"
                                aria-hidden="true"
                              >
                                ?
                              </span>
                            ) : (
                              <span
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-tint text-xs font-semibold text-secondary"
                                aria-hidden="true"
                              >
                                {initials(p.author ?? '')}
                              </span>
                            )}
                            <div>
                              <p className="font-semibold text-ink">
                                {anon ? 'Anonymous' : `@${p.author}`}
                              </p>
                              {!anon && p.authorTopDomain && (
                                <span className="inline-block rounded-md bg-tint px-2 py-0.5 text-xs text-body">
                                  Top: {p.authorTopDomain}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 2: Vote score */}
                  <tr>
                    <th scope="row" className={rowHeaderClass}>
                      Vote score
                    </th>
                    {perspectives.map((p) => (
                      <td key={p.id} className={rowCellClass}>
                        <span className="inline-flex items-center rounded-lg border border-line bg-tint/50 px-3 py-1 font-semibold text-ink">
                          {p.upvotes} {p.upvotes === 1 ? 'upvote' : 'upvotes'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Row 3: Submission date */}
                  <tr>
                    <th scope="row" className={rowHeaderClass}>
                      Submission date
                    </th>
                    {perspectives.map((p) => (
                      <td key={p.id} className={rowCellClass}>
                        <time dateTime={p.createdAt} className="text-sm text-body">
                          {formatDate(p.createdAt)}
                        </time>
                      </td>
                    ))}
                  </tr>

                  {/* Row 4: Proposed Solution */}
                  <tr>
                    <th scope="row" className={rowHeaderClass}>
                      Proposed Solution
                    </th>
                    {perspectives.map((p) => (
                      <td key={p.id} className={rowCellClass}>
                        <p className="font-medium text-ink leading-relaxed">{p.solution}</p>
                      </td>
                    ))}
                  </tr>

                  {/* Row 5: Explanation */}
                  <tr>
                    <th scope="row" className={rowHeaderClass}>
                      Explanation
                    </th>
                    {perspectives.map((p) => (
                      <td key={p.id} className={rowCellClass}>
                        <p className="whitespace-pre-line text-body leading-relaxed">
                          {p.explanation}
                        </p>
                      </td>
                    ))}
                  </tr>

                  {/* Row 6: Advantages */}
                  <tr>
                    <th scope="row" className={rowHeaderClass}>
                      Advantages
                    </th>
                    {perspectives.map((p) => (
                      <td key={p.id} className={rowCellClass}>
                        <ul className="list-disc space-y-1.5 pl-5 text-body">
                          {p.advantages.map((adv, idx) => (
                            <li key={idx}>{adv}</li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>

                  {/* Row 7: Limitations */}
                  <tr>
                    <th scope="row" className={rowHeaderClass}>
                      Limitations
                    </th>
                    {perspectives.map((p) => (
                      <td key={p.id} className={rowCellClass}>
                        <ul className="list-disc space-y-1.5 pl-5 text-body">
                          {p.limitations.map((lim, idx) => (
                            <li key={idx}>{lim}</li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>

                  {/* Row 8: Code Snippets */}
                  <tr>
                    <th scope="row" className={rowHeaderClass}>
                      Code Snippets
                    </th>
                    {perspectives.map((p) => (
                      <td key={p.id} className={rowCellClass}>
                        {p.codeSnippets.length > 0 ? (
                          <div className="space-y-3">
                            {p.codeSnippets.map((s, idx) => (
                              <div key={idx} className="rounded-lg border border-line bg-tint p-3">
                                <p className="text-xs font-semibold uppercase text-muted mb-1">
                                  {s.language}
                                </p>
                                <pre className="overflow-x-auto font-mono text-xs text-ink">
                                  <code>{s.code}</code>
                                </pre>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted">No code snippets</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export default ComparePage;
