import { useState } from 'react';
import { AlertCircle, GitMerge, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { mergeAdminTags, type AdminTag, type TagMergeResult } from '../../api/admin';

const inputClass =
  'h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-ink focus:outline-none';
const labelClass = 'mb-1 block text-sm font-semibold text-ink';

interface TagMergeDialogProps {
  source: AdminTag;
  tags: AdminTag[];
  onClose: () => void;
  onMerged: (result: TagMergeResult) => void;
}

export function TagMergeDialog({ source, tags, onClose, onMerged }: TagMergeDialogProps) {
  const [sourceId, setSourceId] = useState(source.id);
  const [destinationId, setDestinationId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);

  const destinations = tags.filter((tag) => tag.id !== sourceId);
  const sourceTag = tags.find((tag) => tag.id === sourceId) ?? source;
  const destinationTag = tags.find((tag) => tag.id === destinationId) ?? null;

  const handleConfirm = async () => {
    if (!destinationId) {
      setError({ message: 'Choose a destination tag.', code: 'VALIDATION_ERROR' });
      return;
    }
    if (sourceId === destinationId) {
      setError({
        message: 'Source and destination tags must be different.',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    setError(null);
    setSubmitting(true);
    const response = await mergeAdminTags({ sourceId, destinationId });
    setSubmitting(false);

    if (!response.success) {
      setError({ message: response.error.message, code: response.error.code });
      return;
    }

    onMerged(response.data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="tag-merge-title"
        className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 text-ink">
            <GitMerge className="h-5 w-5 text-red-700" aria-hidden="true" />
            <h2 id="tag-merge-title" className="font-serif text-lg font-bold">
              Merge tag
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
            aria-label="Close merge dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-body">
          Move every link from the source tag to the destination tag, then deactivate the source.
          This cannot be undone.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="tag-merge-source" className={labelClass}>
              Source tag
            </label>
            <select
              id="tag-merge-source"
              value={sourceId}
              onChange={(event) => {
                setSourceId(event.target.value);
                setDestinationId('');
                setError(null);
              }}
              data-testid="tag-merge-source"
              className={inputClass}
            >
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                  {tag.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tag-merge-destination" className={labelClass}>
              Destination tag
            </label>
            <select
              id="tag-merge-destination"
              value={destinationId}
              onChange={(event) => {
                setDestinationId(event.target.value);
                setError(null);
              }}
              data-testid="tag-merge-destination"
              className={inputClass}
            >
              <option value="">Select a destination tag</option>
              {destinations.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                  {tag.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
            {destinations.length === 0 && (
              <p className="mt-1 text-xs text-muted">No other tags are available.</p>
            )}
          </div>
        </div>

        {sourceTag && destinationTag && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Merge <span className="font-semibold">{sourceTag.name}</span> into{' '}
            <span className="font-semibold">{destinationTag.name}</span>?
          </p>
        )}

        {error && (
          <div
            role="alert"
            data-testid="tag-merge-error"
            className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Merge failed</p>
              <p className="mt-1">{error.message}</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3 border-t border-line pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || destinations.length === 0}
            data-testid="tag-merge-confirm"
            className="bg-red-700 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Merging...' : 'Confirm merge'}
          </Button>
        </div>
      </div>
    </div>
  );
}
