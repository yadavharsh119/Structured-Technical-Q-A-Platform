import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { MessageSquare, Flag } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { TopicHeader } from '../components/topic/TopicHeader';
import { SourceQuestionCard } from '../components/topic/SourceQuestionCard';
import { PerspectiveList } from '../components/topic/PerspectiveList';
import { CompareBar } from '../components/topic/CompareBar';
import { ReportModal } from '../components/moderation/ReportModal';
import { RequestDeletionModal } from '../components/topic/RequestDeletionModal';
import { AdminDeletePerspectiveModal } from '../components/admin/AdminDeletePerspectiveModal';
import { EmptyState } from '../components/search/EmptyState';
import { getTopic } from '../api/topics';
import { listCategories } from '../api/taxonomy';
import { listPerspectives, togglePerspectiveUpvote } from '../api/perspectives';
import type { Perspective, PerspectiveSort, Question, Topic } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { NotFoundPage } from './NotFoundPage';

const icon = <MessageSquare className="mx-auto h-8 w-8 text-deco" aria-hidden="true" />;

export function TopicPage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort: PerspectiveSort = searchParams.get('sort') === 'top' ? 'top' : 'newest';

  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categoryName, setCategoryName] = useState('Uncategorized');
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [isPerspectivesLoading, setIsPerspectivesLoading] = useState(true);
  const [perspectivesError, setPerspectivesError] = useState<string | null>(null);
  const [pendingVoteIds, setPendingVoteIds] = useState<Set<string>>(new Set());
  const [voteError, setVoteError] = useState<string | null>(null);
  const [loginPrompt, setLoginPrompt] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>([]);
  const [compareMessage, setCompareMessage] = useState<string | null>(null);

  const [reportTarget, setReportTarget] = useState<{
    type: 'topic' | 'perspective';
    id: string;
    label: string;
  } | null>(null);

  const [deletionTarget, setDeletionTarget] = useState<Perspective | null>(null);
  const [adminDeleteTarget, setAdminDeleteTarget] = useState<Perspective | null>(null);

  const submitted = (location.state as { perspectiveSubmitted?: boolean } | null)
    ?.perspectiveSubmitted === true;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setNotFound(false);
    setError(null);
    setTopic(null);
    setQuestions([]);

    Promise.all([getTopic(slug), listCategories()]).then(([topicResponse, categoriesResponse]) => {
      if (cancelled) return;
      if (!topicResponse.success) {
        if (topicResponse.error.code === 'TOPIC_NOT_FOUND') {
          setNotFound(true);
        } else {
          setError(topicResponse.error.message);
        }
        setIsLoading(false);
        return;
      }

      const loadedTopic = topicResponse.data.topic;
      setTopic(loadedTopic);
      setQuestions(topicResponse.data.questions);
      if (categoriesResponse.success) {
        const category = categoriesResponse.data.categories.find(
          (item) => item.id === loadedTopic.categoryId,
        );
        setCategoryName(category?.name ?? 'Uncategorized');
      } else {
        setCategoryName('Uncategorized');
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setIsPerspectivesLoading(true);
    setPerspectivesError(null);

    listPerspectives(slug, sort).then((response) => {
      if (cancelled) return;
      if (response.success) {
        setPerspectives(response.data.perspectives);
      } else {
        setPerspectives([]);
        setPerspectivesError(response.error.message);
      }
      setIsPerspectivesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [slug, sort]);

  useEffect(() => {
    setSelected([]);
    setCompareMessage(null);
    setLoginPrompt(null);
    setVoteError(null);
  }, [slug]);

  useEffect(() => {
    if (user) setLoginPrompt(null);
  }, [user]);

  const updateSort = (next: PerspectiveSort) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'newest') {
      nextParams.delete('sort');
    } else {
      nextParams.set('sort', next);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleToggleVote = async (id: string) => {
    if (!user) {
      setLoginPrompt('Log in to upvote perspectives.');
      return;
    }
    if (pendingVoteIds.has(id)) return;

    setVoteError(null);
    setPendingVoteIds((prev) => new Set(prev).add(id));
    const response = await togglePerspectiveUpvote(id);
    setPendingVoteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (!response.success) {
      if (response.error.code === 'UNAUTHENTICATED') {
        setLoginPrompt('Your session expired. Log in to upvote.');
      } else {
        setVoteError(response.error.message);
      }
      return;
    }

    setPerspectives((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, upvoteCount: response.data.upvoteCount, hasUpvoted: response.data.hasUpvoted }
          : p,
      ),
    );
  };

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

  const handleDeletionRequested = (id: string) => {
    setPerspectives((prev) =>
      prev.map((p) => (p.id === id ? { ...p, deletionRequestPending: true } : p)),
    );
  };

  const handleAdminDeleted = (id: string) => {
    setPerspectives((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => prev.filter((x) => x !== id));
  };

  if (isLoading) {
    return (
      <PageShell>
        <div
          className="mx-auto max-w-content px-6 py-16 md:py-24"
          role="status"
          aria-live="polite"
          data-testid="topic-loading"
        >
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
          <span className="sr-only">Loading topic...</span>
        </div>
      </PageShell>
    );
  }

  if (notFound) return <NotFoundPage message="Topic not found." />;

  if (error) {
    return (
      <PageShell>
        <div className="mx-auto max-w-content px-6 py-16 md:py-24">
          <div
            role="alert"
            data-testid="topic-error"
            className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-800"
          >
            {error}
          </div>
        </div>
      </PageShell>
    );
  }

  if (!topic) return <NotFoundPage message="Topic not found." />;

  const archived = topic.status === 'archived';
  const canSubmit = !archived && user !== null;
  const alreadySubmitted =
    user !== null && perspectives.some((p) => p.authorUsername === user.username);
  const isOwnTopic =
    user !== null && questions.some((q) => q.authorUsername === user.username);
  const compareHref = `/compare?topic=${encodeURIComponent(topic.slug)}&ids=${selected.join(',')}`;

  return (
    <PageShell>
      <div className="pb-28">
        <section aria-labelledby="topic-heading" className="bg-white">
          <div className="mx-auto max-w-content px-6 py-16 md:py-24">
            <div id="topic-heading">
              <TopicHeader topic={topic} categoryName={categoryName} />
            </div>

            <SourceQuestionCard questions={questions} />

            {submitted && (
              <div
                role="status"
                data-testid="perspective-success"
                className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
              >
                Perspective submitted. It is now visible below.
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {canSubmit &&
                (alreadySubmitted ? (
                  <span
                    data-testid="perspective-already-answered"
                    className="inline-flex items-center justify-center rounded-lg border border-line bg-tint/40 px-5 py-3 text-sm font-medium text-muted"
                  >
                    You already answered
                  </span>
                ) : (
                  <Link
                    to={`/topics/${topic.slug}/perspectives/new`}
                    data-testid="submit-perspective-button"
                    className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-secondary"
                  >
                    Submit Perspective
                  </Link>
                ))}

              {selected.length >= 2 ? (
                <Link
                  to={compareHref}
                  data-testid="compare-action-button"
                  className="inline-flex items-center justify-center rounded-lg border border-ink bg-white px-5 py-3 text-sm font-medium text-ink hover:bg-tint"
                >
                  Compare ({selected.length})
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  data-testid="compare-action-button"
                  title="Select 2 or 3 perspectives to compare"
                  className="inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-line bg-white px-5 py-3 text-sm font-medium text-muted opacity-50"
                >
                  Compare
                </button>
              )}

              {user && !isOwnTopic && (
                <button
                  type="button"
                  onClick={() =>
                    setReportTarget({ type: 'topic', id: topic.id, label: topic.title })
                  }
                  data-testid="topic-report-button"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-5 py-3 text-sm font-medium text-muted hover:bg-tint hover:text-red-700"
                >
                  <Flag className="h-4 w-4" aria-hidden="true" />
                  Report Topic
                </button>
              )}

              {compareMessage && (
                <span
                  role="alert"
                  data-testid="compare-selection-error"
                  className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800"
                >
                  {compareMessage}
                </span>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="perspectives-heading" className="border-t border-line bg-white">
          <div className="mx-auto max-w-content px-6 py-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="perspectives-heading"
                className="font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
              >
                Perspectives ({perspectives.length})
              </h2>
              <div className="flex items-center gap-2">
                <label htmlFor="persp-sort" className="text-sm font-medium text-muted">
                  Sort Perspectives
                </label>
                <select
                  id="persp-sort"
                  value={sort}
                  onChange={(e) => updateSort(e.target.value as PerspectiveSort)}
                  data-testid="perspectives-sort"
                  className="h-11 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink"
                >
                  <option value="newest">Newest</option>
                  <option value="top">Most Upvotes</option>
                </select>
              </div>
            </div>

            {loginPrompt && (
              <div
                role="alert"
                data-testid="upvote-login-prompt"
                className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                <span>{loginPrompt}</span>
                <Link to="/login" className="font-semibold underline">
                  Log in
                </Link>
              </div>
            )}

            {voteError && (
              <div
                role="alert"
                data-testid="perspective-vote-error"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"
              >
                {voteError}
              </div>
            )}

            <div className="mt-6" aria-live="polite">
              {isPerspectivesLoading ? (
                <div
                  role="status"
                  data-testid="perspectives-loading"
                  className="animate-pulse space-y-4"
                >
                  <div className="h-40 rounded-xl border border-line bg-tint/30" />
                  <div className="h-40 rounded-xl border border-line bg-tint/30" />
                  <span className="sr-only">Loading perspectives...</span>
                </div>
              ) : perspectivesError ? (
                <div
                  role="alert"
                  data-testid="perspectives-error"
                  className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-800"
                >
                  {perspectivesError}
                </div>
              ) : perspectives.length === 0 ? (
                <EmptyState
                  icon={icon}
                  title="No Perspectives yet"
                  text="Be the first to share a structured answer to this Topic."
                  action={
                    canSubmit && !alreadySubmitted ? (
                      <Link
                        to={`/topics/${topic.slug}/perspectives/new`}
                        data-testid="empty-submit-perspective-button"
                        className="mt-6 inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-secondary"
                      >
                        Submit Perspective
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <PerspectiveList
                  items={perspectives}
                  isGuest={user === null}
                  isAdmin={user?.role === 'admin'}
                  username={user?.username ?? null}
                  pendingVoteIds={pendingVoteIds}
                  onToggleVote={handleToggleVote}
                  selected={selected}
                  onToggleCompare={toggleCompare}
                  onReport={(perspective) =>
                    setReportTarget({
                      type: 'perspective',
                      id: perspective.id,
                      label: perspective.proposedSolution,
                    })
                  }
                  onRequestDeletion={(perspective) => setDeletionTarget(perspective)}
                  onAdminDelete={(perspective) => setAdminDeleteTarget(perspective)}
                />
              )}
            </div>
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

      {reportTarget && (
        <ReportModal
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetLabel={reportTarget.label}
          onClose={() => setReportTarget(null)}
        />
      )}

      {deletionTarget && (
        <RequestDeletionModal
          perspectiveId={deletionTarget.id}
          perspectiveLabel={deletionTarget.proposedSolution}
          onClose={() => setDeletionTarget(null)}
          onSubmitted={() => handleDeletionRequested(deletionTarget.id)}
        />
      )}

      {adminDeleteTarget && (
        <AdminDeletePerspectiveModal
          perspectiveId={adminDeleteTarget.id}
          perspectiveLabel={adminDeleteTarget.proposedSolution}
          onClose={() => setAdminDeleteTarget(null)}
          onDeleted={handleAdminDeleted}
        />
      )}
    </PageShell>
  );
}

export default TopicPage;
