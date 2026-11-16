import { useState } from 'react';
import { AlertCircle, Power, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { updateAdminCategory, type AdminCategory } from '../../api/admin';

interface CategoryStatusDialogProps {
  category: AdminCategory;
  onClose: () => void;
  onChanged: (category: AdminCategory) => void;
}

export function CategoryStatusDialog({
  category,
  onClose,
  onChanged,
}: CategoryStatusDialogProps) {
  const activating = !category.isActive;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setSubmitting(true);
    const response = await updateAdminCategory(category.id, { isActive: activating });
    setSubmitting(false);

    if (!response.success) {
      setError(response.error.message);
      return;
    }

    onChanged(response.data.category);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="category-status-title"
        className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 text-ink">
            <Power
              className={`h-5 w-5 ${activating ? 'text-green-700' : 'text-amber-700'}`}
              aria-hidden="true"
            />
            <h2 id="category-status-title" className="font-serif text-lg font-bold">
              {activating ? 'Activate category' : 'Deactivate category'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
            aria-label="Close category status dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-body">
          {activating ? (
            <>
              Activate <span className="font-semibold text-ink">{category.name}</span>? It will
              appear in category pickers again.
            </>
          ) : (
            <>
              Deactivate <span className="font-semibold text-ink">{category.name}</span>? It will be
              hidden from category pickers. Existing content stays unchanged.
            </>
          )}
        </p>

        {error && (
          <div
            role="alert"
            data-testid="category-status-error"
            className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3 border-t border-line pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            data-testid="category-status-confirm"
            className={
              activating
                ? 'bg-green-700 hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60'
                : 'bg-amber-700 hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60'
            }
          >
            {submitting
              ? activating
                ? 'Activating...'
                : 'Deactivating...'
              : activating
                ? 'Activate category'
                : 'Deactivate category'}
          </Button>
        </div>
      </div>
    </div>
  );
}
