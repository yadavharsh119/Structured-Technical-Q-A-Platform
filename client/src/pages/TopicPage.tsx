import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { TopicHeader } from '../components/topic/TopicHeader';
import { PerspectiveList } from '../components/topic/PerspectiveList';
import { CompareBar } from '../components/topic/CompareBar';
import { Pagination } from '../components/search/Pagination';
import { EmptyState } from '../components/search/EmptyState';
import { useTopicPage } from '../hooks/useTopicPage';
import { useAuth } from '../context/AuthContext';
import { useUpvotes } from '../hooks/useUpvotes';
import { NotFoundPage } from './NotFoundPage';
import type { PerspectiveSort } from '../types/topic';

const icon = <MessageSquare className="mx-auto h-8 w-8 text-deco" aria-hidden="true" />;

export function TopicPage() {
  const { slug = '' } = useParams();
  const { topic, perspectives, sort, onlyWithCode, update, isLoading } = useTopicPage(slug);
  const { user } = useAuth();
  const { voted, toggle, delta } = useUpvotes();
  const [selected, setSelected] = useState<string[]>([]);
  const [compareMessage, setCompareMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelected([]);
    setCompareMessage(null);
  }, [slug]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-content px-6 py-16 md:py-24" role="status" aria-live="polite">
          <div className="animate-pulse space-y-6">
            <div className="h-4 w-28 rounded bg-tint" />
            <div className="h-10 w-3/4 rounded bg-tint" />
            <div className="h-6 w-full max-w-xl rounded bg-tint" />
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded bg-tint" />
              <div className="h-6 w-20 rounded bg-tint" />
            </div>
            <div className="mt-12 h-32 w-full rounded-xl border border-line bg-tint/30" />
          </div>
          <span className="sr-only">Loading topic and perspectives...</span>
        </div>
      </PageShell>
    );
  }

  if (!topic) return <NotFoundPage message="Topic not found." />;

  const archived = topic.status === 'archived';
  const isGuest = user === null;
  const isVerified = user !== null && user.emailVerified;
  const canSubmit = !archived && isVerified;

  const toggleCompare = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        setCompareMessage(null);
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        setCompareMessage('You can compare up to 3 perspectives.');
        return prev;
      }
      setCompareMessage(null);
      return [...prev, id];
    });
  };

  return (
    <PageShell>
      <div className="pb-28">
        <section aria-labelledby="topic-heading" className="bg-white">
          <div className="mx-auto max-w-content px-6 py-16 md:py-24">
            <div id="topic-heading">
              <TopicHeader topic={topic} />
            </div>

            {/* Action Bar */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {canSubmit && (
                <Link
                  to={`/topics/${topic.slug}/perspectives/new`}
                  className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-secondary"
                >
                  Submit Perspective
                </Link>
              )}

              {selected.length >= 2 ? (
                <Link
                  to={`/compare?ids=${selected.join(',')}`}
                  className="inline-flex items-center justify-center rounded-lg border border-ink bg-white px-5 py-3 text-sm font-medium text-ink hover:bg-tint"
                >
                  Compare ({selected.length})
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Select 2 or 3 perspectives to compare"
                  className="inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-line bg-white px-5 py-3 text-sm font-medium text-muted opacity-50"
                >
                  Compare
                </button>
              )}

              {compareMessage && (
                <span role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
                  {compareMessage}
                </span>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="perspectives-heading" className="border-t border-line bg-white">
          <div className="mx-auto max-w-content px-6 py-10">
            <div id="perspectives-top" className="flex scroll-mt-24 flex-wrap items-center justify-between gap-3">
              <h2 id="perspectives-heading" className="font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]">
                Perspectives ({perspectives.total})
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-secondary">
                  <input
                    type="checkbox"
                    checked={onlyWithCode}
                    onChange={(e) => update({ onlyWithCode: e.target.checked })}
                    className="h-4 w-4 rounded accent-black"
                  />
                  Only with code snippets
                </label>
                <div className="flex items-center gap-2">
                  <label htmlFor="persp-sort" className="text-sm font-medium text-muted">
                    Sort Perspectives
                  </label>
                  <select
                    id="persp-sort"
                    value={sort}
                    onChange={(e) => update({ sort: e.target.value as PerspectiveSort })}
                    className="h-11 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink"
                  >
                    <option value="newest">Newest</option>
                    <option value="upvotes">Most Upvotes</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6" aria-live="polite">
              {topic.perspectiveCount === 0 ? (
                <EmptyState
                  icon={icon}
                  title="No Perspectives yet"
                  text="Be the first to share a structured answer to this Topic."
                  action={
                    canSubmit ? (
                      <Link
                        to={`/topics/${topic.slug}/perspectives/new`}
                        className="mt-6 inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-secondary"
                      >
                        Submit Perspective
                      </Link>
                    ) : undefined
                  }
                />
              ) : perspectives.items.length === 0 ? (
                <EmptyState
                  icon={icon}
                  title="No Perspectives match this filter."
                  text="Try showing all Perspectives instead."
                  action={
                    <button
                      type="button"
                      onClick={() => update({ onlyWithCode: false })}
                      className="mt-6 inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-secondary"
                    >
                      Clear filter
                    </button>
                  }
                />
              ) : (
                <PerspectiveList
                  items={perspectives.items}
                  voted={voted}
                  delta={delta}
                  isGuest={isGuest}
                  username={user?.username ?? null}
                  onToggleVote={toggle}
                  selected={selected}
                  onToggleCompare={toggleCompare}
                />
              )}
            </div>

            {perspectives.total > perspectives.pageSize && (
              <Pagination
                page={perspectives.page}
                total={perspectives.total}
                pageSize={perspectives.pageSize}
                onPage={(page) => update({ page }, false)}
                scrollToId="perspectives-top"
              />
            )}
          </div>
        </section>
      </div>

      <CompareBar
        slug={topic.slug}
        selected={selected}
        onClear={() => {
          setSelected([]);
          setCompareMessage(null);
        }}
        message={compareMessage}
      />
    </PageShell>
  );
}

export default TopicPage;

