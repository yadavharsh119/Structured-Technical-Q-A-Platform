import { useEffect, useState } from 'react';
import { AlertCircle, FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { SuccessBanner } from '../components/admin/SuccessBanner';
import { TopicFormModal } from '../components/admin/TopicFormModal';
import { TopicArchiveDialog } from '../components/admin/TopicArchiveDialog';
import { TopicMergeDialog } from '../components/admin/TopicMergeDialog';
import { listTopics, type TopicMergeResult } from '../api/topics';
import type { Topic, TopicStatus } from '../api/types';
import { useAuth } from '../context/AuthContext';

const STATUS_LABEL: Record<TopicStatus, string> = {
  published: 'Published',
  archived: 'Archived',
  hidden: 'Hidden',
};

const STATUS_BADGE: Record<TopicStatus, string> = {
  published: 'border-green-200 bg-green-50 text-green-800',
  archived: 'border-amber-300 bg-amber-50 text-amber-800',
  hidden: 'border-gray-200 bg-gray-50 text-gray-700',
};

const thClass =
  'border-b border-line bg-tint/60 p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted';
const tdClass = 'border-b border-line p-4 text-sm text-body align-top';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function replaceTopic(topics: Topic[], updated: Topic): Topic[] {
  const exists = topics.some((topic) => topic.id === updated.id);
  if (!exists) return [...topics, updated];
  return topics.map((topic) => (topic.id === updated.id ? updated : topic));
}

export function AdminTopicsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formTopic, setFormTopic] = useState<Topic | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Topic | null>(null);
  const [mergeTarget, setMergeTarget] = useState<Topic | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    listTopics().then((response) => {
      if (cancelled) return;
      if (response.success) {
        setTopics(response.data.topics);
      } else {
        setTopics([]);
        setLoadError(response.error.message);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const openCreate = () => {
    setFormTopic(null);
    setFormOpen(true);
  };

  const openEdit = (topic: Topic) => {
    setFormTopic(topic);
    setFormOpen(true);
  };

  const handleSaved = (topic: Topic, mode: 'create' | 'edit') => {
    setTopics((prev) => replaceTopic(prev, topic));
    setBanner(
      mode === 'create'
        ? `Curated topic "${topic.title}" created.`
        : `Topic "${topic.title}" updated.`,
    );
    setFormOpen(false);
  };

  const handleArchived = (topic: Topic) => {
    setTopics((prev) => replaceTopic(prev, topic));
    setBanner(`Topic "${topic.title}" archived.`);
    setArchiveTarget(null);
  };

  const handleMerged = (result: TopicMergeResult) => {
    setTopics((prev) => {
      const withSource = replaceTopic(prev, result.source);
      return replaceTopic(withSource, result.destination);
    });
    setBanner(`Merged "${result.source.title}" into "${result.destination.title}".`);
    setMergeTarget(null);
  };

  return (
    <PageShell>
      <section aria-labelledby="admin-topics-heading" className="border-b border-line bg-white">
        <div className="mx-auto max-w-content px-6 py-10 md:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  Admin
                </span>
                <span className="text-xs text-muted">Platform Management</span>
              </div>
              <h1
                id="admin-topics-heading"
                className="mt-2 font-serif text-[28px] leading-[1.2] text-ink md:text-[36px]"
              >
                Topic Management
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-body">
                Create curated topics, edit metadata, archive topics, and merge duplicates. Merging
                is restricted to administrators.
              </p>
            </div>
            <Button type="button" onClick={openCreate} data-testid="admin-topic-create-button">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create curated topic
            </Button>
          </div>
        </div>
      </section>

      <section className="min-h-[500px] bg-canvas">
        <div className="mx-auto max-w-content space-y-6 px-6 py-8">
          {banner && <SuccessBanner message={banner} onDismiss={() => setBanner(null)} />}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p aria-live="polite" className="text-base text-body">
              <span className="font-semibold text-ink">{topics.length} topics</span>
            </p>
            <button
              type="button"
              onClick={() => setReloadToken((value) => value + 1)}
              className="text-sm font-medium text-secondary underline hover:text-black"
            >
              Refresh
            </button>
          </div>

          {loadError && (
            <div
              role="alert"
              data-testid="admin-topics-error"
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{loadError}</span>
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-line bg-white p-12 text-center text-sm text-muted">
              Loading topics...
            </div>
          ) : topics.length === 0 ? (
            <div className="rounded-xl border border-line bg-white p-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <FileText className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
              <h2 className="mt-4 font-serif text-xl font-semibold text-ink">No topics found</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Create a curated topic to start the list.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th scope="col" className={thClass}>
                      Topic
                    </th>
                    <th scope="col" className={thClass}>
                      Status
                    </th>
                    <th scope="col" className={thClass}>
                      Tags
                    </th>
                    <th scope="col" className={thClass}>
                      Created
                    </th>
                    <th scope="col" className={thClass}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((topic) => {
                    const archived = topic.status === 'archived';
                    return (
                      <tr key={topic.id} className="hover:bg-tint/20">
                        <td className={tdClass}>
                          <Link
                            to={`/topics/${topic.slug}`}
                            className="font-medium text-ink hover:underline"
                          >
                            {topic.title}
                          </Link>
                          <p className="mt-1 text-xs text-muted">/{topic.slug}</p>
                          {topic.isCurated && (
                            <span className="mt-1 inline-flex rounded-md border border-line bg-tint px-1.5 py-0.5 text-[11px] font-semibold text-secondary">
                              Curated
                            </span>
                          )}
                        </td>
                        <td className={tdClass}>
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[topic.status]}`}
                          >
                            {STATUS_LABEL[topic.status]}
                          </span>
                        </td>
                        <td className={tdClass}>
                          {topic.tags.length > 0 ? (
                            <span className="text-xs text-muted">{topic.tags.join(', ')}</span>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                        <td className={tdClass}>{formatDate(topic.createdAt)}</td>
                        <td className={tdClass}>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(topic)}
                              data-testid={`edit-topic-${topic.id}`}
                              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-tint"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setArchiveTarget(topic)}
                              disabled={archived}
                              data-testid={`archive-topic-${topic.id}`}
                              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-tint disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Archive
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setMergeTarget(topic)}
                                disabled={archived}
                                data-testid={`merge-topic-${topic.id}`}
                                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Merge
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {formOpen && (
        <TopicFormModal
          topic={formTopic ?? undefined}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {archiveTarget && (
        <TopicArchiveDialog
          topic={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onArchived={handleArchived}
        />
      )}

      {mergeTarget && (
        <TopicMergeDialog
          source={mergeTarget}
          topics={topics}
          onClose={() => setMergeTarget(null)}
          onMerged={handleMerged}
        />
      )}
    </PageShell>
  );
}

export default AdminTopicsPage;
