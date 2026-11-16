import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, FolderTree, Plus } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { SuccessBanner } from '../components/admin/SuccessBanner';
import { CategoryFormModal } from '../components/admin/CategoryFormModal';
import { CategoryStatusDialog } from '../components/admin/CategoryStatusDialog';
import { listAdminCategories, type AdminCategory } from '../api/admin';

const thClass =
  'border-b border-line bg-tint/60 p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted';
const tdClass = 'border-b border-line p-4 text-sm text-body align-top';

function replaceCategory(
  categories: AdminCategory[],
  updated: AdminCategory,
): AdminCategory[] {
  const exists = categories.some((category) => category.id === updated.id);
  if (!exists) return [...categories, updated];
  return categories.map((category) => (category.id === updated.id ? updated : category));
}

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formCategory, setFormCategory] = useState<AdminCategory | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminCategory | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    listAdminCategories().then((response) => {
      if (cancelled) return;
      if (response.success) {
        setCategories(response.data.categories);
      } else {
        setCategories([]);
        setLoadError(response.error.message);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const openCreate = () => {
    setFormCategory(null);
    setFormOpen(true);
  };

  const openEdit = (category: AdminCategory) => {
    setFormCategory(category);
    setFormOpen(true);
  };

  const handleSaved = (category: AdminCategory, mode: 'create' | 'edit') => {
    setCategories((prev) => replaceCategory(prev, category));
    setBanner(
      mode === 'create'
        ? `Category "${category.name}" created.`
        : `Category "${category.name}" updated.`,
    );
    setFormOpen(false);
  };

  const handleStatusChanged = (category: AdminCategory) => {
    setCategories((prev) => replaceCategory(prev, category));
    setBanner(
      category.isActive
        ? `Category "${category.name}" activated.`
        : `Category "${category.name}" deactivated.`,
    );
    setStatusTarget(null);
  };

  return (
    <PageShell>
      <section aria-labelledby="admin-categories-heading" className="border-b border-line bg-white">
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
                id="admin-categories-heading"
                className="mt-2 font-serif text-[28px] leading-[1.2] text-ink md:text-[36px]"
              >
                Category Management
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-body">
                Create categories, organise parent relationships, and deactivate categories that
                should no longer appear in pickers.
              </p>
            </div>
            <Button type="button" onClick={openCreate} data-testid="admin-category-create-button">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create category
            </Button>
          </div>
        </div>
      </section>

      <section className="min-h-[500px] bg-canvas">
        <div className="mx-auto max-w-content space-y-6 px-6 py-8">
          {banner && <SuccessBanner message={banner} onDismiss={() => setBanner(null)} />}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p aria-live="polite" className="text-base text-body">
              <span className="font-semibold text-ink">{categories.length} categories</span>
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
              data-testid="admin-categories-error"
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{loadError}</span>
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-line bg-white p-12 text-center text-sm text-muted">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-xl border border-line bg-white p-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <FolderTree className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
              <h2 className="mt-4 font-serif text-xl font-semibold text-ink">No categories found</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Create a category to start the list.
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
                      Parent
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
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-tint/20">
                      <td className={tdClass}>
                        <p className="font-medium text-ink">{category.name}</p>
                        {category.description && (
                          <p className="mt-1 max-w-md text-xs text-muted">
                            {category.description}
                          </p>
                        )}
                      </td>
                      <td className={tdClass}>
                        {category.parentId ? (
                          (categoryNames.get(category.parentId) ?? 'Unknown')
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                      <td className={tdClass}>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
                            category.isActive
                              ? 'border-green-200 bg-green-50 text-green-800'
                              : 'border-gray-200 bg-gray-50 text-gray-700'
                          }`}
                        >
                          {category.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(category)}
                            data-testid={`edit-category-${category.id}`}
                            className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-tint"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusTarget(category)}
                            data-testid={`toggle-category-${category.id}`}
                            className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-tint"
                          >
                            {category.isActive ? 'Deactivate' : 'Activate'}
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
        <CategoryFormModal
          category={formCategory ?? undefined}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {statusTarget && (
        <CategoryStatusDialog
          category={statusTarget}
          onClose={() => setStatusTarget(null)}
          onChanged={handleStatusChanged}
        />
      )}
    </PageShell>
  );
}

export default AdminCategoriesPage;
