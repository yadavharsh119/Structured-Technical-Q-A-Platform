import { useEffect, useState } from 'react';
import { AlertCircle, Plus, Search, Tag as TagIcon } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { SuccessBanner } from '../components/admin/SuccessBanner';
import { TagFormModal } from '../components/admin/TagFormModal';
import { TagStatusDialog } from '../components/admin/TagStatusDialog';
import { TagMergeDialog } from '../components/admin/TagMergeDialog';
import {
  listAdminTags,
  type AdminTag,
  type TagMergeResult,
} from '../api/admin';

const thClass =
  'border-b border-line bg-tint/60 p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted';
const tdClass = 'border-b border-line p-4 text-sm text-body align-top';

function replaceTag(tags: AdminTag[], updated: AdminTag): AdminTag[] {
  const exists = tags.some((tag) => tag.id === updated.id);
  if (!exists) return [...tags, updated];
  return tags.map((tag) => (tag.id === updated.id ? updated : tag));
}

export function AdminTagsPage() {
  const [tags, setTags] = useState<AdminTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formTag, setFormTag] = useState<AdminTag | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminTag | null>(null);
  const [mergeTarget, setMergeTarget] = useState<AdminTag | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    listAdminTags().then((response) => {
      if (cancelled) return;
      if (response.success) {
        setTags(response.data.tags);
      } else {
        setTags([]);
        setLoadError(response.error.message);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleTags =
    normalizedQuery === ''
      ? tags
      : tags.filter((tag) => tag.name.toLowerCase().includes(normalizedQuery));

  const openCreate = () => {
    setFormTag(null);
    setFormOpen(true);
  };

  const openRename = (tag: AdminTag) => {
    setFormTag(tag);
    setFormOpen(true);
  };

  const handleSaved = (tag: AdminTag, mode: 'create' | 'edit') => {
    setTags((prev) => replaceTag(prev, tag));
    setBanner(
      mode === 'create' ? `Tag "${tag.name}" created.` : `Tag renamed to "${tag.name}".`,
    );
    setFormOpen(false);
  };

  const handleStatusChanged = (tag: AdminTag) => {
    setTags((prev) => replaceTag(prev, tag));
    setBanner(
      tag.isActive ? `Tag "${tag.name}" activated.` : `Tag "${tag.name}" deactivated.`,
    );
    setStatusTarget(null);
  };

  const handleMerged = (result: TagMergeResult) => {
    setTags((prev) => {
      const withSource = replaceTag(prev, result.source);
      return replaceTag(withSource, result.destination);
    });
    setBanner(`Merged "${result.source.name}" into "${result.destination.name}".`);
    setMergeTarget(null);
  };

  return (
    <PageShell>
      <section aria-labelledby="admin-tags-heading" className="border-b border-line bg-white">
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
                id="admin-tags-heading"
                className="mt-2 font-serif text-[28px] leading-[1.2] text-ink md:text-[36px]"
              >
                Tag Management
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-body">
                Create, rename, deactivate, and merge tags. Merging moves every link to the
                destination tag and deactivates the source.
              </p>
            </div>
            <Button type="button" onClick={openCreate} data-testid="admin-tag-create-button">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create tag
            </Button>
          </div>
        </div>
      </section>

      <section className="min-h-[500px] bg-canvas">
        <div className="mx-auto max-w-content space-y-6 px-6 py-8">
          {banner && <SuccessBanner message={banner} onDismiss={() => setBanner(null)} />}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-base text-body">
              <span className="font-semibold text-ink">{visibleTags.length} tags</span>
              {normalizedQuery !== '' && (
                <span className="text-muted"> of {tags.length}</span>
              )}
            </p>
            <div className="flex items-center gap-4">
              <div className="relative">
                <label htmlFor="admin-tag-search" className="sr-only">
                  Search tags
                </label>
                <input
                  id="admin-tag-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tags..."
                  data-testid="admin-tags-search"
                  className="h-10 w-64 rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                />
                <Search
                  className="absolute left-3 top-3 h-4 w-4 text-muted"
                  aria-hidden="true"
                />
              </div>
              <button
                type="button"
                onClick={() => setReloadToken((value) => value + 1)}
                className="text-sm font-medium text-secondary underline hover:text-black"
              >
                Refresh
              </button>
            </div>
          </div>

          {loadError && (
            <div
              role="alert"
              data-testid="admin-tags-error"
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{loadError}</span>
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-line bg-white p-12 text-center text-sm text-muted">
              Loading tags...
            </div>
          ) : visibleTags.length === 0 ? (
            <div className="rounded-xl border border-line bg-white p-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <TagIcon className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
              <h2 className="mt-4 font-serif text-xl font-semibold text-ink">
                {tags.length === 0 ? 'No tags found' : 'No matching tags'}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                {tags.length === 0
                  ? 'Create a tag to start the list.'
                  : 'Try a different search term.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th scope="col" className={thClass}>
                      Name
                    </th>
                    <th scope="col" className={thClass}>
                      Status
                    </th>
                    <th scope="col" className={thClass}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTags.map((tag) => (
                    <tr key={tag.id} className="hover:bg-tint/20">
                      <td className={tdClass}>
                        <p className="font-medium text-ink">{tag.name}</p>
                      </td>
                      <td className={tdClass}>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
                            tag.isActive
                              ? 'border-green-200 bg-green-50 text-green-800'
                              : 'border-gray-200 bg-gray-50 text-gray-700'
                          }`}
                        >
                          {tag.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openRename(tag)}
                            data-testid={`rename-tag-${tag.id}`}
                            className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-tint"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusTarget(tag)}
                            data-testid={`toggle-tag-${tag.id}`}
                            className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-tint"
                          >
                            {tag.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setMergeTarget(tag)}
                            data-testid={`merge-tag-${tag.id}`}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Merge
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {formOpen && (
        <TagFormModal
          tag={formTag ?? undefined}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {statusTarget && (
        <TagStatusDialog
          tag={statusTarget}
          onClose={() => setStatusTarget(null)}
          onChanged={handleStatusChanged}
        />
      )}

      {mergeTarget && (
        <TagMergeDialog
          source={mergeTarget}
          tags={tags}
          onClose={() => setMergeTarget(null)}
          onMerged={handleMerged}
        />
      )}
    </PageShell>
  );
}

export default AdminTagsPage;
