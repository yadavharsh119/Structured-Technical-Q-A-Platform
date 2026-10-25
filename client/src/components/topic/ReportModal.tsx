import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { REPORT_REASONS, type ReportReason } from '@structured-qa/shared';
import { reportPerspective } from '../../api/perspectives';
import { Button } from '../ui/Button';

interface Props {
  perspectiveId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ perspectiveId, isOpen, onClose }: Props) {
  const [reason, setReason] = useState<ReportReason>('Spam');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setReason('Spam');
      setDetails('');
      setIsSubmitting(false);
      setSubmitted(false);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason === 'Other' && !details.trim()) {
      setError('Please provide details for reason "Other".');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await reportPerspective({
        perspectiveId,
        reason,
        details: details.trim() ? details.trim() : undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <h2 id="report-modal-title" className="font-serif text-xl font-semibold text-ink">
            Report Perspective
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-tint hover:text-ink"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center" role="status">
            <p className="text-base font-medium text-ink">Report submitted successfully.</p>
            <p className="mt-1 text-sm text-body">
              Thank you for helping us maintain platform quality.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="report-reason" className="block text-sm font-medium text-ink">
                Reason for report
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="report-details" className="block text-sm font-medium text-ink">
                Additional details {reason === 'Other' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                id="report-details"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide additional context to help reviewers..."
                className="mt-1 block w-full rounded-lg border border-line bg-white p-3 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
