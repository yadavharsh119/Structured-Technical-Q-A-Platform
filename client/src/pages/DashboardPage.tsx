import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Award, CheckCircle2, Clock, Edit2, FileQuestion, HelpCircle, MessageSquare, ThumbsUp, Trash2, XCircle } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { Button, LinkButton } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { PERSPECTIVES } from '../data/mockPerspectives';
import { SEARCH_TOPICS } from '../data/mockTopics';
import type { Perspective } from '../types/topic';

interface UserQuestion {
  id: string;
  title: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

const INITIAL_QUESTIONS: UserQuestion[] = [
  {
    id: 'q-demo-1',
    title: 'How should we approach zero-downtime database migrations with blue-green deployments?',
    status: 'Approved',
    createdAt: '2026-09-12',
  },
  {
    id: 'q-demo-2',
    title: 'Benchmarking Redis vs Memcached for session storage at 50k RPS',
    status: 'Pending',
    createdAt: '2026-10-14',
  },
  {
    id: 'q-demo-3',
    title: 'What is the best way to handle Kafka poison pill messages in consumer groups?',
    status: 'Rejected',
    createdAt: '2026-08-20',
  },
];

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DashboardPage() {
  const { user } = useAuth();
  const username = user?.username ?? '';
  const [activeTab, setActiveTab] = useState<'questions' | 'perspectives' | 'votes'>('questions');
  const [questions, setQuestions] = useState<UserQuestion[]>(INITIAL_QUESTIONS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Perspectives authored by this user (or fallback demo items for new accounts)
  const myPerspectives = useMemo(() => {
    const list = PERSPECTIVES.filter((p) => p.author === username);
    if (list.length > 0) return list;
    // If newly logged in user has no perspectives yet, match by username or provide default for demo
    if (username === 'sarah_lim' || username === 'priya_dev' || username === 'david_kim') {
      return PERSPECTIVES.filter((p) => p.author === username);
    }
    return list;
  }, [username]);

  // Total upvotes received on user's perspectives
  const totalUpvotesReceived = useMemo(() => {
    return myPerspectives.reduce((acc, p) => acc + p.upvotes, 0);
  }, [myPerspectives]);

  // Upvoted perspectives (mock items)
  const myVotedPerspectives = useMemo(() => {
    // Return sample upvoted perspectives across top topics
    return PERSPECTIVES.slice(0, 3);
  }, []);

  // Expert fingerprint: top 3 categories
  const topCategories = useMemo(() => {
    const map = new Map<string, { count: number; upvotes: number }>();

    for (const p of myPerspectives) {
      const topic = SEARCH_TOPICS.find((t) => t.slug === p.topicSlug);
      const cat = topic?.category ?? 'Architecture';
      const existing = map.get(cat) ?? { count: 0, upvotes: 0 };
      map.set(cat, {
        count: existing.count + 1,
        upvotes: existing.upvotes + p.upvotes,
      });
    }

    if (map.size === 0) {
      return [
        { category: 'Architecture', count: 0, upvotes: 0 },
        { category: 'Backend', count: 0, upvotes: 0 },
        { category: 'Databases', count: 0, upvotes: 0 },
      ];
    }

    return Array.from(map.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.upvotes - a.upvotes || b.count - a.count)
      .slice(0, 3);
  }, [myPerspectives]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleStartEdit = (q: UserQuestion) => {
    setEditingId(q.id);
    setEditTitle(q.title);
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, title: editTitle.trim() } : q)),
    );
    setEditingId(null);
  };

  return (
    <PageShell>
      <div className="pb-28">
        {/* User Header */}
        <section aria-labelledby="dashboard-heading" className="bg-white border-b border-line">
          <div className="mx-auto max-w-content px-6 py-12 md:py-16">
            <p className="text-sm font-medium text-muted">User Dashboard</p>
            <h1
              id="dashboard-heading"
              className="mt-2 font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
            >
              Hello, {user.fullName || `@${user.username}`}
            </h1>
            <p className="mt-2 text-sm text-body">
              Track your submitted questions, technical perspectives, and reputation metrics.
            </p>

            {/* Stats row */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-line bg-tint/30 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Questions Submitted
                  </p>
                  <FileQuestion className="h-4 w-4 text-muted" aria-hidden="true" />
                </div>
                <p className="mt-3 text-3xl font-serif font-bold text-ink">{questions.length}</p>
              </div>

              <div className="rounded-xl border border-line bg-tint/30 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Perspectives Submitted
                  </p>
                  <MessageSquare className="h-4 w-4 text-muted" aria-hidden="true" />
                </div>
                <p className="mt-3 text-3xl font-serif font-bold text-ink">
                  {myPerspectives.length}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-tint/30 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Upvotes Received
                  </p>
                  <ThumbsUp className="h-4 w-4 text-muted" aria-hidden="true" />
                </div>
                <p className="mt-3 text-3xl font-serif font-bold text-ink">
                  {totalUpvotesReceived}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content: Tabs & Expert Fingerprint */}
        <section className="bg-canvas">
          <div className="mx-auto max-w-content px-6 py-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left 2 Cols: Tabs and Items */}
              <div className="lg:col-span-2 space-y-6">
                {/* Tabs navigation */}
                <div className="flex border-b border-line gap-6">
                  <button
                    type="button"
                    onClick={() => setActiveTab('questions')}
                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-[2px] ${
                      activeTab === 'questions'
                        ? 'border-black text-ink'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    My Questions ({questions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('perspectives')}
                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-[2px] ${
                      activeTab === 'perspectives'
                        ? 'border-black text-ink'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    My Perspectives ({myPerspectives.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('votes')}
                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-[2px] ${
                      activeTab === 'votes'
                        ? 'border-black text-ink'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    My Votes ({myVotedPerspectives.length})
                  </button>
                </div>

                {/* Tab 1: My Questions */}
                {activeTab === 'questions' && (
                  <div>
                    {questions.length === 0 ? (
                      <div className="rounded-xl border border-line bg-white p-10 text-center">
                        <HelpCircle className="mx-auto h-10 w-10 text-deco" aria-hidden="true" />
                        <h3 className="mt-4 font-serif text-lg font-semibold text-ink">
                          No questions yet
                        </h3>
                        <p className="mt-1 text-sm text-body">
                          You haven&apos;t asked any technical questions yet.
                        </p>
                        <div className="mt-6">
                          <LinkButton href="/questions/new">Ask a Question</LinkButton>
                        </div>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {questions.map((q) => {
                          const isPending = q.status === 'Pending';
                          const isApproved = q.status === 'Approved';
                          return (
                            <li
                              key={q.id}
                              className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                            >
                              {editingId === q.id ? (
                                <div className="space-y-3">
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="h-10 w-full rounded-lg border border-line px-3 text-sm text-ink focus:outline-none"
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="outline"
                                      onClick={() => setEditingId(null)}
                                      className="py-1 px-3 text-xs"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => handleSaveEdit(q.id)}
                                      className="py-1 px-3 text-xs"
                                    >
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                                          isPending
                                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                            : isApproved
                                              ? 'bg-green-50 text-green-800 border border-green-200'
                                              : 'bg-red-50 text-red-800 border border-red-200'
                                        }`}
                                      >
                                        {isPending && <Clock className="h-3 w-3" />}
                                        {isApproved && <CheckCircle2 className="h-3 w-3" />}
                                        {!isPending && !isApproved && <XCircle className="h-3 w-3" />}
                                        {q.status}
                                      </span>
                                      <time dateTime={q.createdAt} className="text-xs text-muted">
                                        {formatDate(q.createdAt)}
                                      </time>
                                    </div>
                                    <p className="text-base font-semibold text-ink">{q.title}</p>
                                  </div>

                                  {isPending && (
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEdit(q)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-secondary hover:bg-tint"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" /> Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteQuestion(q.id)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" /> Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {/* Tab 2: My Perspectives */}
                {activeTab === 'perspectives' && (
                  <div>
                    {myPerspectives.length === 0 ? (
                      <div className="rounded-xl border border-line bg-white p-10 text-center">
                        <MessageSquare className="mx-auto h-10 w-10 text-deco" aria-hidden="true" />
                        <h3 className="mt-4 font-serif text-lg font-semibold text-ink">
                          No perspectives yet
                        </h3>
                        <p className="mt-1 text-sm text-body">
                          You haven&apos;t shared any architectural or technical perspectives.
                        </p>
                        <div className="mt-6">
                          <LinkButton href="/topics">Browse Topics</LinkButton>
                        </div>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {myPerspectives.map((p) => {
                          const topic = SEARCH_TOPICS.find((t) => t.slug === p.topicSlug);
                          return (
                            <li
                              key={p.id}
                              className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <Link
                                    to={`/topics/${p.topicSlug}`}
                                    className="text-base font-semibold text-ink underline decoration-line hover:decoration-ink transition-colors"
                                  >
                                    {topic?.title ?? p.topicSlug}
                                  </Link>
                                  <p className="mt-1 text-sm text-body line-clamp-1">{p.solution}</p>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted shrink-0">
                                  <span className="inline-flex items-center gap-1 font-semibold text-ink bg-tint/60 px-2.5 py-1 rounded-md border border-line">
                                    <ThumbsUp className="h-3 w-3" /> {p.upvotes}
                                  </span>
                                  <time dateTime={p.createdAt}>{formatDate(p.createdAt)}</time>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {/* Tab 3: My Votes */}
                {activeTab === 'votes' && (
                  <div>
                    {myVotedPerspectives.length === 0 ? (
                      <div className="rounded-xl border border-line bg-white p-10 text-center">
                        <ThumbsUp className="mx-auto h-10 w-10 text-deco" aria-hidden="true" />
                        <h3 className="mt-4 font-serif text-lg font-semibold text-ink">
                          No upvotes recorded
                        </h3>
                        <p className="mt-1 text-sm text-body">
                          Upvote high-quality perspectives to recognize contributors and bookmark them
                          here.
                        </p>
                        <div className="mt-6">
                          <LinkButton href="/topics">Discover Perspectives</LinkButton>
                        </div>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {myVotedPerspectives.map((p: Perspective) => {
                          const topic = SEARCH_TOPICS.find((t) => t.slug === p.topicSlug);
                          return (
                            <li
                              key={p.id}
                              className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <Link
                                    to={`/topics/${p.topicSlug}`}
                                    className="text-sm font-semibold text-ink hover:underline"
                                  >
                                    {topic?.title ?? p.topicSlug}
                                  </Link>
                                  <p className="mt-1 text-xs text-body line-clamp-2">{p.solution}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-semibold text-ink bg-tint px-2 py-0.5 rounded">
                                    {p.upvotes} upvotes
                                  </span>
                                  <Link
                                    to={`/topics/${p.topicSlug}`}
                                    className="text-xs font-medium text-secondary underline hover:text-black"
                                  >
                                    View
                                  </Link>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Right Col: Expert Fingerprint Card */}
              <div>
                <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 border-b border-line pb-3">
                    <Award className="h-5 w-5 text-ink" aria-hidden="true" />
                    <h2 className="font-serif text-lg font-semibold text-ink">Expert Fingerprint</h2>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Top 3 categories based on peer-verified perspectives and upvotes.
                  </p>

                  <div className="mt-5 space-y-4">
                    {topCategories.map((cat, idx) => (
                      <div
                        key={cat.category}
                        className="rounded-lg border border-line bg-tint/20 p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-ink">
                            {idx + 1}. {cat.category}
                          </span>
                          <span className="text-xs text-muted">Rank #{idx + 1}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-body">
                          <span>{cat.count} {cat.count === 1 ? 'perspective' : 'perspectives'}</span>
                          <span className="font-semibold text-ink">{cat.upvotes} upvotes</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-line text-center">
                    <Link
                      to="/topics"
                      className="text-xs font-medium text-secondary hover:text-black hover:underline"
                    >
                      Contribute to more categories &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export default DashboardPage;
