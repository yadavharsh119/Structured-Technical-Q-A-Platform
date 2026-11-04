import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Trash2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { createDeletionRequest } from '../../api/deletionRequests';

interface RequestDeletionModalProps {
  perspectiveId: string;
  perspectiveLabel: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function RequestDeletionModal({
  perspectiveId,
  perspectiveLabel,
  onClose,
  onSubmitted,
}: RequestDeletionModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (reason.trim().length === 0) {
      setError('A reason is required.');
      return;
    }

    setIsSubmitting(true);
    const response = await createDeletionRequest(perspectiveId, { reason: reason.trim() });
    setIsSubmitting(false);

    if (!response.success) {
      setError(response.error.message);
      return;
    }

    onSubmitted();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-deletion-title"
        className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 text-ink">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
            <h2 id="request-deletion-title" className="font-serif text-lg font-bold">
              Request perspective deletion
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
            aria-label="Close deletion request dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-body">{perspectiveLabel}</p>

        {submitted ? (
          <div className="mt-5">
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
              <p>Deletion requested, pending review.</p>
            </div>
            <div className="mt-5 flex justify-end border-t border-line pt-3">
              <Button type="button" onClick={onClose} className="py-2 text-xs">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
              <span>
                Your perspective stays public until an administrator reviews and approves this
                request.
              </span>
            </div>

            <div>
              <label htmlFor="deletion-reason" className="text-sm font-medium text-ink">
                Reason <span className="text-red-700">(required)</span>
              </label>
              <textarea
                id="deletion-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Explain why this perspective should be removed."
                data-testid="deletion-reason-input"
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-muted">{reason.length}/2000</p>
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
              <Button type="button" variant="outline" onClick={onClose} className="py-2 text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Request deletion'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
