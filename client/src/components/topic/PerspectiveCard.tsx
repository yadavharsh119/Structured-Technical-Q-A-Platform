import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Perspective } from '../../api/types';
import { UpvoteButton } from './UpvoteButton';

interface Props {
  perspective: Perspective;
  isGuest: boolean;
  isOwn: boolean;
  isVotePending: boolean;
  onToggleVote: (id: string) => void;
  selected: boolean;
  compareDisabled: boolean;
  onToggleCompare: (id: string) => void;
}

function initials(name: string): string {
  const parts = name.split(/[_\s]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const h4 = 'text-sm font-semibold text-ink';

export function PerspectiveCard(p: Props) {
  const { perspective: t } = p;
  const [showDetails, setShowDetails] = useState(false);

  return (
    <article
      aria-labelledby={`${t.id}-title`}
      className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="md:w-12 md:shrink-0">
          <UpvoteButton
            upvoteCount={t.upvoteCount}
            voted={t.hasUpvoted}
            isGuest={p.isGuest}
            isOwn={p.isOwn}
            isPending={p.isVotePending}
            onToggle={() => p.onToggleVote(t.id)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-tint text-xs font-semibold text-secondary"
              aria-hidden="true"
            >
              {initials(t.authorUsername)}
            </span>
            <h3 id={`${t.id}-title`} className="text-base font-semibold text-ink">
              @{t.authorUsername}
            </h3>
            {p.isOwn && (
              <span className="rounded-md bg-tint px-2 py-0.5 text-xs text-body">
                Your perspective
              </span>
            )}
            <time dateTime={t.createdAt} className="ml-auto text-xs text-muted">
              {formatDate(t.createdAt)}
            </time>
          </div>

          <h4 className={`${h4} mt-5`}>Proposed Solution</h4>
          <p className="mt-1 text-base text-body">{t.proposedSolution}</p>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
            aria-controls={`details-${t.id}`}
            data-testid="perspective-details-toggle"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-ink focus:outline-none"
          >
            <span>{showDetails ? 'Hide details' : 'Show details'}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {showDetails && (
            <div id={`details-${t.id}`} className="mt-4 space-y-4 border-t border-line pt-4">
              <div>
                <h4 className={h4}>Explanation</h4>
                <p className="mt-1 whitespace-pre-line text-base text-body">{t.explanation}</p>
              </div>

              <div>
                <h4 className={h4}>Advantages</h4>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-body">
                  {t.advantages.map((a) => <li key={a}>{a}</li>)}
                </ul>
              </div>

              <div>
                <h4 className={h4}>Limitations</h4>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-body">
                  {t.limitations.map((l) => <li key={l}>{l}</li>)}
                </ul>
              </div>

              {t.codeSnippets.length > 0 && (
                <div>
                  <h4 className={h4}>Code Snippets</h4>
                  {t.codeSnippets.map((s, i) => (
                    <div key={i} className="mt-2">
                      <p className="text-xs text-muted">{s.language}</p>
                      <pre className="mt-1 overflow-x-auto rounded-lg border border-line bg-tint p-4 font-mono text-sm text-ink">
                        <code>{s.code}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {t.references.length > 0 && (
                <div>
                  <h4 className={h4}>References</h4>
                  <ul className="mt-1 space-y-1">
                    {t.references.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-sm font-medium text-ink underline hover:text-secondary"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-secondary hover:text-ink">
              <input
                type="checkbox"
                checked={p.selected}
                disabled={p.compareDisabled && !p.selected}
                onChange={() => p.onToggleCompare(t.id)}
                data-testid="perspective-compare-checkbox"
                className="h-4 w-4 rounded accent-black"
              />
              Select to compare
            </label>
          </div>
        </div>
      </div>
    </article>
  );
}
