import { useState, type FormEvent } from 'react';
import { AlertCircle, Trash2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { adminDeletePerspective } from '../../api/deletionRequests';

interface AdminDeletePerspectiveModalProps {
  perspectiveId: string;
  perspectiveLabel: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export function AdminDeletePerspectiveModal({
  perspectiveId,
  perspectiveLabel,
  onClose,
  onDeleted,
}: AdminDeletePerspectiveModalProps) {
  const [reason, setReason] = useState('');
  const [hard, setHard] = useState(false);
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (reason.trim().length === 0) {
      setError('A reason is required.');
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    const response = await adminDeletePerspective(
      perspectiveId,
      { reason: reason.trim() },
      hard,
    );
    setIsSubmitting(false);

    if (!response.success) {
      setError(response.error.message);
      return;
    }

    onDeleted(response.data.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-delete-title"
        className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 text-ink">
            <Trash2 className="h-5 w-5 text-red-700" aria-hidden="true" />
            <h2 id="admin-delete-title" className="font-serif text-lg font-bold">
              {step === 'form' ? 'Delete perspective' : 'Confirm deletion'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
            aria-label="Close delete dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-body">{perspectiveLabel}</p>

        {step === 'form' ? (
          <form onSubmit={handleContinue} className="mt-4 space-y-4">
            <div>
              <label htmlFor="admin-delete-reason" className="text-sm font-medium text-ink">
                Reason <span className="text-red-700">(required)</span>
              </label>
              <textarea
                id="admin-delete-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Explain why this perspective is being removed."
                data-testid="admin-delete-reason-input"
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-muted">{reason.length}/2000</p>
            </div>

            <label className="flex items-start gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={hard}
                onChange={(event) => setHard(event.target.checked)}
                data-testid="admin-delete-hard-checkbox"
                className="mt-0.5 h-4 w-4 rounded accent-black"
              />
              <span>
                Permanently delete this perspective
                <span className="mt-1 block text-xs text-muted">
                  Removes the perspective, its upvotes and attachments. This cannot be undone.
                </span>
              </span>
            </label>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-line pt-3">
              <Button type="button" variant="outline" onClick={onClose} className="py-2 text-xs">
                Cancel
              </Button>
              <Button type="submit" className="py-2 text-xs">
                Continue
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {hard
                  ? 'This permanently removes the perspective, its upvotes and attachments. This cannot be undone.'
                  : 'This hides the perspective from all public lists, search and counts. The record stays in the database.'}
              </span>
            </div>

            <div className="rounded-lg border border-line bg-tint/30 p-3 text-sm text-body">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Reason</p>
              <p className="mt-1 whitespace-pre-line">{reason.trim()}</p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-line pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError(null);
                  setStep('form');
                }}
                disabled={isSubmitting}
                className="py-2 text-xs"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                data-testid="admin-delete-confirm-button"
                className="bg-red-700 py-2 text-xs hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Deleting...' : hard ? 'Permanently delete' : 'Delete perspective'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
